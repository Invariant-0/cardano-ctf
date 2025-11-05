import {
  Data,
  LucidEvolution,
  MintingPolicy,
  SpendingValidator,
  UTxO,
} from '@lucid-evolution/lucid';
import {
  validatorToAddress,
  validatorToScriptHash,
  mintingPolicyToId,
  generatePrivateKey,
  getAddressDetails,
} from '@lucid-evolution/utils';
import {
  awaitTxConfirms,
  filterUTXOsByTxHash,
  getWalletBalanceLovelace,
  resetWallet,
  setupMintingPolicy,
  setupValidator,
} from '../../common/offchain/utils';
import blueprint from '../plutus.json' with { type: 'json' };
import {
  failTest,
  failTests,
  passAllTests,
  passTest,
  submitSolutionRecord,
} from '../../common/offchain/test_utils';
import { AccountDatum, ConfigDatum, ACCOUNT_TOKEN_NAME, CONFIG_TOKEN_NAME } from './types';

export type GameData = {
  bankValidator: SpendingValidator;
  accountValidator: SpendingValidator;
  configValidator: SpendingValidator;
  accountMintingPolicy: MintingPolicy;
  configMintingPolicy: MintingPolicy;
  bankAddress: string;
  accountAddress: string;
  configAddress: string;
  accountAsset: string;
  configAsset: string;
  victimAccountUtxo: UTxO;
  bankUtxo: UTxO;
  configUtxo: UTxO;
  playerAddress: string;
  playerPkh: string;
  victimAddress: string;
  victimPkh: string;
  originalBalance: bigint;
};
export type TestData = { lastBankTxHash: string };

function readValidators(
  lucid: LucidEvolution,
  bootstrapUtxo: UTxO
): {
  bankValidator: SpendingValidator;
  accountValidator: SpendingValidator;
  configValidator: SpendingValidator;
  accountMintingPolicy: MintingPolicy;
  configMintingPolicy: MintingPolicy;
} {
  const bootstrapParams = [bootstrapUtxo.txHash, BigInt(bootstrapUtxo.outputIndex)];
  const configMintingPolicy = setupMintingPolicy(
    lucid,
    blueprint,
    'config.config.mint',
    'PlutusV3',
    bootstrapParams
  );
  const configValidator = setupValidator(
    lucid,
    blueprint,
    'config.config.spend',
    'PlutusV3',
    bootstrapParams
  );

  const accountValidator = setupValidator(lucid, blueprint, 'account.account.spend', 'PlutusV3', [
    configMintingPolicy.policyId,
  ]);
  const bankValidator = setupValidator(lucid, blueprint, 'bank.bank.spend', 'PlutusV3', [
    configMintingPolicy.policyId,
  ]);
  const accountMintingPolicy = setupMintingPolicy(
    lucid,
    blueprint,
    'account.account.mint',
    'PlutusV3',
    [configMintingPolicy.policyId]
  );

  return {
    bankValidator: bankValidator.validator,
    accountValidator: accountValidator.validator,
    configValidator: configValidator.validator,
    accountMintingPolicy: accountMintingPolicy.policy,
    configMintingPolicy: configMintingPolicy.policy,
  };
}

export async function setup(lucid: LucidEvolution) {
  console.log(`\n=== SETUP IN PROGRESS ===`);

  // We need to bootstrap the protocol by a bootstrap UTxO.
  // We'll use the first UTxO from the player's wallet - it doesn't matter much.
  const bootstrapUtxo = (await lucid.wallet().getUtxos())[0];

  const {
    bankValidator,
    accountValidator,
    configValidator,
    accountMintingPolicy,
    configMintingPolicy,
  } = readValidators(lucid, bootstrapUtxo);

  const bankAddress = validatorToAddress(lucid.config().network!, bankValidator);
  const accountAddress = validatorToAddress(lucid.config().network!, accountValidator);
  const configAddress = validatorToAddress(lucid.config().network!, configValidator);
  const accountPolicyId = mintingPolicyToId(accountMintingPolicy);
  const configPolicyId = mintingPolicyToId(configMintingPolicy);
  const accountAsset = accountPolicyId + ACCOUNT_TOKEN_NAME;
  const configAsset = configPolicyId + CONFIG_TOKEN_NAME;
  const playerAddress = await lucid.wallet().address();
  const playerPkh = getAddressDetails(playerAddress).paymentCredential!.hash;

  // Create one victim wallet
  const victimPrivateKey = generatePrivateKey();
  lucid.selectWallet.fromPrivateKey(victimPrivateKey);
  const victimAddress = await lucid.wallet().address();
  const victimPkh = getAddressDetails(victimAddress).paymentCredential!.hash;

  resetWallet(lucid);

  console.log(`Creating bank and the victim's account...`);

  // Initial deposits
  const victimDepositAmount = 70_000_000n; // 70 ADA

  // Create victim's account datum
  const victimAccountDatum = {
    balance: victimDepositAmount,
    owner: victimPkh,
  };

  // Create config datum
  const configDatum = {
    bank_script_credential: validatorToScriptHash(bankValidator),
    account_script_credential: validatorToScriptHash(accountValidator),
  };

  // First transaction: Mint config token and create the config and bank UTxOs
  const setupTx = await lucid
    .newTx()
    .collectFrom([bootstrapUtxo])
    .mintAssets({ [configAsset]: 1n }, Data.void()) // Mint config token
    .attach.MintingPolicy(configMintingPolicy)
    .pay.ToContract(
      bankAddress,
      { kind: 'inline', value: Data.void() },
      { lovelace: 2_000_000n } // Just min Ada for now
    )
    .pay.ToContract(
      configAddress,
      { kind: 'inline', value: Data.to(configDatum, ConfigDatum) },
      { lovelace: 2_000_000n, [configAsset]: 1n } // Min Ada + config token
    )
    .complete();

  const setupSignedTx = await setupTx.sign.withWallet().complete();
  const setupTxHash = await setupSignedTx.submit();
  await awaitTxConfirms(lucid, setupTxHash);

  // Get the created UTxOs
  const initialBankUtxo = filterUTXOsByTxHash(await lucid.utxosAt(bankAddress), setupTxHash)[0];
  const configUtxo = filterUTXOsByTxHash(await lucid.utxosAt(configAddress), setupTxHash)[0];

  // Second transaction: Create victim's account with minted account token
  console.log('Setting up the victim account...');

  const newBankBalance = initialBankUtxo.assets.lovelace + victimDepositAmount;

  const accountTx = await lucid
    .newTx()
    // Spend the bank UTxO to satisfy account minting policy
    .collectFrom([initialBankUtxo], Data.void())
    .attach.SpendingValidator(bankValidator)
    // Reference the config
    .readFrom([configUtxo])
    // Mint single account validity token
    .mintAssets({ [accountAsset]: 1n }, Data.void())
    .attach.MintingPolicy(accountMintingPolicy)
    // Recreate the bank UTxO with updated funds
    .pay.ToContract(
      bankAddress,
      { kind: 'inline', value: Data.void() },
      { lovelace: newBankBalance }
    )
    // Create the victim's account with validity token
    .pay.ToContract(
      accountAddress,
      { kind: 'inline', value: Data.to(victimAccountDatum, AccountDatum) },
      { lovelace: 2_000_000n, [accountAsset]: 1n } // Min Ada + validity token
    )
    .complete();

  const accountSignedTx = await accountTx.sign.withWallet().complete();
  const accountTxHash = await accountSignedTx.submit();
  await awaitTxConfirms(lucid, accountTxHash);

  // Get the created UTxOs
  const bankUtxo = filterUTXOsByTxHash(await lucid.utxosAt(bankAddress), accountTxHash)[0];
  const victimAccountUtxo = filterUTXOsByTxHash(
    await lucid.utxosAt(accountAddress),
    accountTxHash
  )[0];

  console.log(`Bank initialized with victim's ${victimDepositAmount / 1_000_000n} ADA deposit`);

  console.log(`\n=== SETUP WAS SUCCESSFUL ===\n`);
  console.log(`You (player) have NO bank account.`);
  console.log(
    `Another user has an account with ${victimDepositAmount / 1_000_000n} ADA deposited.`
  );
  console.log(
    `Can you drain the bank by exploring what happens when there are multiple banks in the protocol?\n`
  );

  return {
    bankValidator,
    accountValidator,
    configValidator,
    accountMintingPolicy,
    configMintingPolicy,
    bankAddress,
    accountAddress,
    configAddress,
    accountAsset,
    configAsset,
    victimAccountUtxo,
    bankUtxo,
    configUtxo,
    playerAddress,
    playerPkh,
    victimAddress,
    victimPkh,
    originalBalance: await getWalletBalanceLovelace(lucid),
  };
}

export async function test(
  lucid: LucidEvolution,
  gameData: GameData,
  testData: TestData
): Promise<boolean> {
  let passed = true;
  console.log('\n================TESTS==================');

  // Check if player successfully withdrew funds
  const endBalance = await getWalletBalanceLovelace(lucid);
  const gained = endBalance - gameData.originalBalance;

  // Player should have gained significant funds (at least 66 ADA from the 70 ADA victim deposit)
  if (gained < 66_000_000n) {
    failTest('TEST 1 FAILED -- you did not successfully drain enough from the bank');
    passed = false;
  } else {
    passTest('TEST 1 PASSED', lucid);
  }

  // Check that the bank is essentially empty (only min ADA left)
  const bankUtxos = filterUTXOsByTxHash(
    await lucid.utxosAt(gameData.bankAddress),
    testData.lastBankTxHash
  );
  const totalBankFunds = bankUtxos.reduce((sum, utxo) => sum + utxo.assets.lovelace, 0n);

  if (totalBankFunds > 3_000_000n) {
    // Allow for min ADA
    failTest('TEST 2 FAILED -- the bank still contains significant funds');
    passed = false;
  } else {
    passTest('TEST 2 PASSED', lucid);
  }

  if (passed) {
    await submitSolutionRecord(lucid, 109n); // bank_09 level

    passAllTests(
      '\nCongratulations on completing Bank 09: Twin Bank!\n' +
        'You successfully exploited the vulnerability of multiple banks to the fullest!\n' +
        'Remember, even the simplest and most straightforward assumptions are still only assumptions and an attacker might just choose to not follow them.\n' +
        'Good luck with fixing the validators and the next level!',
      lucid
    );

    return true;
  } else {
    failTests();
    return false;
  }
}
