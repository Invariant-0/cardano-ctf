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
  isEmulator,
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
import {
  AccountDatum,
  Cheque,
  ConfigDatum,
  signCheque,
  ACCOUNT_TOKEN_NAME,
  CONFIG_TOKEN_NAME,
} from './types';
import { PRIVATE_KEY } from '../../common/offchain/config';
import { EMULATOR_PRIVATE_KEY } from '../../common/offchain/setup_lucid';

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
  victimAccountUtxo: UTxO; // Victim: 30 ADA, shares a 20 ADA cheque with player
  playerAccountUtxo: UTxO; // Player: 20 ADA
  bankUtxo: UTxO;
  configUtxo: UTxO;
  playerAddress: string;
  playerPkh: string;
  playerPrivateKey: string;
  victimAddress: string;
  victimPkh: string;
  chequeFromVictim: Cheque; // Signed cheque from victim for 20 ADA
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

  // Create victim wallet
  const victimPrivateKey = generatePrivateKey();
  lucid.selectWallet.fromPrivateKey(victimPrivateKey);
  const victimAddress = await lucid.wallet().address();
  const victimPkh = getAddressDetails(victimAddress).paymentCredential!.hash;

  resetWallet(lucid);

  console.log(`Creating bank and accounts...`);

  // Initial deposits
  const victimDepositAmount = 30_000_000n; // 30 ADA
  const playerDepositAmount = 20_000_000n; // 20 ADA

  // Create config datum
  const configDatum = {
    bank_script_credential: validatorToScriptHash(bankValidator),
    account_script_credential: validatorToScriptHash(accountValidator),
  };

  // First transaction: Mint config token and create the config and bank UTxOs
  const setupTx = await lucid
    .newTx()
    .collectFrom([bootstrapUtxo])
    .mintAssets({ [configAsset]: 1n }, Data.void())
    .attach.MintingPolicy(configMintingPolicy)
    .pay.ToContract(bankAddress, { kind: 'inline', value: Data.void() }, { lovelace: 2_000_000n })
    .pay.ToContract(
      configAddress,
      { kind: 'inline', value: Data.to(configDatum, ConfigDatum) },
      { lovelace: 2_000_000n, [configAsset]: 1n }
    )
    .complete();

  const setupSignedTx = await setupTx.sign.withWallet().complete();
  const setupTxHash = await setupSignedTx.submit();
  await awaitTxConfirms(lucid, setupTxHash);

  const initialBankUtxo = filterUTXOsByTxHash(await lucid.utxosAt(bankAddress), setupTxHash)[0];
  const configUtxo = filterUTXOsByTxHash(await lucid.utxosAt(configAddress), setupTxHash)[0];

  // Helper function to create an account with a deposit
  async function setupAccount(
    ownerPkh: string,
    depositAmount: bigint,
    currentBankUtxo: UTxO
  ): Promise<{ bankUtxo: UTxO; accountUtxo: UTxO }> {
    const accountDatum = { balance: depositAmount, owner: ownerPkh };
    const newBankBalance = currentBankUtxo.assets.lovelace + depositAmount;

    const tx = await lucid
      .newTx()
      .collectFrom([currentBankUtxo], Data.void())
      .attach.SpendingValidator(bankValidator)
      .readFrom([configUtxo])
      .mintAssets({ [accountAsset]: 1n }, Data.void())
      .attach.MintingPolicy(accountMintingPolicy)
      .pay.ToContract(
        bankAddress,
        { kind: 'inline', value: Data.void() },
        { lovelace: newBankBalance }
      )
      .pay.ToContract(
        accountAddress,
        { kind: 'inline', value: Data.to(accountDatum, AccountDatum) },
        { lovelace: 2_000_000n, [accountAsset]: 1n }
      )
      .complete();

    const signedTx = await tx.sign.withWallet().complete();
    const txHash = await signedTx.submit();
    await awaitTxConfirms(lucid, txHash);

    return {
      bankUtxo: filterUTXOsByTxHash(await lucid.utxosAt(bankAddress), txHash)[0],
      accountUtxo: filterUTXOsByTxHash(await lucid.utxosAt(accountAddress), txHash)[0],
    };
  }

  // Create accounts sequentially
  console.log(`Setting up victim account (${victimDepositAmount / 1_000_000n} ADA)...`);
  const victimResult = await setupAccount(victimPkh, victimDepositAmount, initialBankUtxo);

  console.log(`Setting up player account (${playerDepositAmount / 1_000_000n} ADA)...`);
  const playerResult = await setupAccount(playerPkh, playerDepositAmount, victimResult.bankUtxo);

  // Victim signs a cheque for 20 ADA and shares it with the player
  // (Imagine this happens via an encrypted off-chain channel)
  const chequeAmount = 20_000_000n; // 20 ADA
  const chequeFromVictim = signCheque(victimPrivateKey, chequeAmount);

  const totalDeposits = victimDepositAmount + playerDepositAmount;
  console.log(`Bank initialized with ${totalDeposits / 1_000_000n} ADA total deposits`);

  console.log(`\n=== SETUP WAS SUCCESSFUL ===\n`);
  console.log(`You (player) have a bank account with ${playerDepositAmount / 1_000_000n} ADA.`);
  console.log(`The victim has an account with ${victimDepositAmount / 1_000_000n} ADA deposited.`);
  console.log(
    `\nThe victim has shared a signed cheque with you for ${chequeAmount / 1_000_000n} ADA!`
  );
  console.log(
    `This cheque allows you to withdraw ${chequeAmount / 1_000_000n} ADA from the victim's account.`
  );
  console.log(
    `\nBut they have ${victimDepositAmount / 1_000_000n} ADA in their account... Can you get it all?\n`
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
    victimAccountUtxo: victimResult.accountUtxo,
    playerAccountUtxo: playerResult.accountUtxo,
    bankUtxo: playerResult.bankUtxo,
    configUtxo,
    playerAddress,
    playerPkh,
    playerPrivateKey: isEmulator(lucid) ? EMULATOR_PRIVATE_KEY : PRIVATE_KEY,
    victimAddress,
    victimPkh,
    chequeFromVictim,
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

  // Player should have gained significant funds (at least 46 ADA from the 50 ADA total deposits)
  // 50 ADA total - some min ADA left = around 46 ADA gained
  if (gained < 46_000_000n) {
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
    await submitSolutionRecord(lucid, 112n); // bank_12 level

    passAllTests(
      '\nCongratulations on completing Bank 12: Free Pass!\n' +
        'You successfully exploited another cheque vulnerability!\n' +
        'Good luck with trying to fix the validators - a significant redesign might be required, do not be afraid of it!\n' +
        'Then, feel free to proceed to the next, final banking challenge!',
      lucid
    );

    return true;
  } else {
    failTests();
    return false;
  }
}
