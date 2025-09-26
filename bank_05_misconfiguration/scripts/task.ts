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
import { AccountDatum, ConfigDatum, ACCOUNT_TOKEN_NAME } from './types';

export type GameData = {
  bankValidator: SpendingValidator;
  accountValidator: SpendingValidator;
  configValidator: SpendingValidator;
  accountMintingPolicy: MintingPolicy;
  bankAddress: string;
  accountAddress: string;
  configAddress: string;
  accountPolicyId: string;
  accountAsset: string;
  playerAccountUtxo: UTxO;
  victim1AccountUtxo: UTxO;
  victim2AccountUtxo: UTxO;
  bankUtxo: UTxO;
  configUtxo: UTxO;
  playerAddress: string;
  playerPkh: string;
  victim1Address: string;
  victim2Address: string;
  originalBalance: bigint;
};
export type TestData = { lastBankTxHash: string };

function readValidators(lucid: LucidEvolution): {
  bankValidator: SpendingValidator;
  accountValidator: SpendingValidator;
  configValidator: SpendingValidator;
  accountMintingPolicy: MintingPolicy;
} {
  const accountValidator = setupValidator(lucid, blueprint, 'account.account.spend');
  const bankValidator = setupValidator(lucid, blueprint, 'bank.bank.spend');
  const configValidator = setupValidator(lucid, blueprint, 'config.config.spend');
  const accountMintingPolicy = setupMintingPolicy(lucid, blueprint, 'account.account.mint');

  return {
    bankValidator: bankValidator.validator,
    accountValidator: accountValidator.validator,
    configValidator: configValidator.validator,
    accountMintingPolicy: accountMintingPolicy.policy,
  };
}

export async function setup(lucid: LucidEvolution) {
  console.log(`\n=== SETUP IN PROGRESS ===`);

  const { bankValidator, accountValidator, configValidator, accountMintingPolicy } =
    readValidators(lucid);
  const bankAddress = validatorToAddress(lucid.config().network!, bankValidator);
  const accountAddress = validatorToAddress(lucid.config().network!, accountValidator);
  const configAddress = validatorToAddress(lucid.config().network!, configValidator);
  const accountPolicyId = mintingPolicyToId(accountMintingPolicy);
  const accountAsset = accountPolicyId + ACCOUNT_TOKEN_NAME;
  const playerAddress = await lucid.wallet().address();
  const playerPkh = getAddressDetails(playerAddress).paymentCredential!.hash;

  // Create two victim wallets
  const victim1PrivateKey = generatePrivateKey();
  lucid.selectWallet.fromPrivateKey(victim1PrivateKey);
  const victim1Address = await lucid.wallet().address();
  const victim1Pkh = getAddressDetails(victim1Address).paymentCredential!.hash;

  const victim2PrivateKey = generatePrivateKey();
  lucid.selectWallet.fromPrivateKey(victim2PrivateKey);
  const victim2Address = await lucid.wallet().address();
  const victim2Pkh = getAddressDetails(victim2Address).paymentCredential!.hash;

  resetWallet(lucid);

  console.log(`Creating bank and three accounts (yours + two victims)...`);

  // Initial deposits
  const victim1DepositAmount = 30_000_000n; // 30 ADA
  const victim2DepositAmount = 40_000_000n; // 40 ADA
  const totalBankFunds = victim1DepositAmount + victim2DepositAmount;

  // Create account datums
  const playerAccountDatum = {
    balance: 0n, // Player starts with no balance
    owner: playerPkh,
  };

  const victim1AccountDatum = {
    balance: victim1DepositAmount,
    owner: victim1Pkh,
  };

  const victim2AccountDatum = {
    balance: victim2DepositAmount,
    owner: victim2Pkh,
  };

  // Create config datum
  const configDatum = {
    bank_script_credential: validatorToScriptHash(bankValidator),
    account_script_credential: validatorToScriptHash(accountValidator),
  };

  // First transaction: Create the config and bank UTxOs
  const setupTx = await lucid
    .newTx()
    .pay.ToContract(
      bankAddress,
      { kind: 'inline', value: Data.void() },
      { lovelace: 2_000_000n } // Just min Ada for now
    )
    .pay.ToContract(
      configAddress,
      { kind: 'inline', value: Data.to(configDatum, ConfigDatum) },
      { lovelace: 2_000_000n } // Min Ada
    )
    .complete();

  const setupSignedTx = await setupTx.sign.withWallet().complete();
  const setupTxHash = await setupSignedTx.submit();
  await awaitTxConfirms(lucid, setupTxHash);

  // Get the created UTxOs
  const initialBankUtxo = filterUTXOsByTxHash(await lucid.utxosAt(bankAddress), setupTxHash)[0];
  const configUtxo = filterUTXOsByTxHash(await lucid.utxosAt(configAddress), setupTxHash)[0];

  // Local function to setup a single account
  async function setupAccount(
    accountDatum: typeof playerAccountDatum,
    currentBankUtxo: UTxO
  ): Promise<{ bankUtxo: UTxO; accountUtxo: UTxO }> {
    console.log('Setting up an account...');

    // Calculate new bank balance (add the account's deposit if any)
    const newBankBalance = currentBankUtxo.assets.lovelace + accountDatum.balance;

    const tx = await lucid
      .newTx()
      // Spend the bank UTxO to satisfy account minting policy
      .collectFrom([currentBankUtxo], Data.void())
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
      // Create the account with validity token
      .pay.ToContract(
        accountAddress,
        { kind: 'inline', value: Data.to(accountDatum, AccountDatum) },
        { lovelace: 2_000_000n, [accountAsset]: 1n } // Min Ada + validity token
      )
      .complete();

    const signedTx = await tx.sign.withWallet().complete();
    const txHash = await signedTx.submit();
    await awaitTxConfirms(lucid, txHash);

    // Get the created UTxOs
    const newBankUtxo = filterUTXOsByTxHash(await lucid.utxosAt(bankAddress), txHash)[0];
    const newAccountUtxo = filterUTXOsByTxHash(await lucid.utxosAt(accountAddress), txHash)[0];

    return {
      bankUtxo: newBankUtxo,
      accountUtxo: newAccountUtxo,
    };
  }

  // Create player account (no deposit)
  const playerAccountResult = await setupAccount(playerAccountDatum, initialBankUtxo);

  // Create victim1 account (with deposit)
  const victim1AccountResult = await setupAccount(
    victim1AccountDatum,
    playerAccountResult.bankUtxo
  );

  // Create victim2 account (with deposit)
  const victim2AccountResult = await setupAccount(
    victim2AccountDatum,
    victim1AccountResult.bankUtxo
  );

  const bankUtxo = victim2AccountResult.bankUtxo;

  console.log(`Bank initialized with ${totalBankFunds / 1_000_000n} ADA total deposits`);

  console.log(`\n=== SETUP WAS SUCCESSFUL ===\n`);
  console.log(`You (player) have a bank account with 0 ADA balance.`);
  console.log(
    `Two other users have accounts with ${victim1DepositAmount / 1_000_000n} ADA and ${victim2DepositAmount / 1_000_000n} ADA deposited.`
  );
  console.log(
    `Can you misconfigure the validators and artificially increase your balance and drain the entire bank?\n`
  );

  return {
    bankValidator,
    accountValidator,
    configValidator,
    accountMintingPolicy,
    bankAddress,
    accountAddress,
    configAddress,
    accountPolicyId,
    accountAsset,
    playerAccountUtxo: playerAccountResult.accountUtxo,
    victim1AccountUtxo: victim1AccountResult.accountUtxo,
    victim2AccountUtxo: victim2AccountResult.accountUtxo,
    bankUtxo,
    configUtxo,
    playerAddress,
    playerPkh,
    victim1Address,
    victim2Address,
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

  // Player should have gained significant funds (at least 66 ADA from the 70 ADA total deposits)
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
    await submitSolutionRecord(lucid, 105n); // bank_05 level

    passAllTests(
      '\nCongratulations on completing Bank 05: Misconfiguration!\n' +
        'You successfully misconfigured the validators and drained the bank again!\n' +
        'This demonstrates how even a well sounding system introduced to prevent vulnerabilities can be attacked. Every component can be attacked, the central components are always even more lucrative as they give you a free pass to do whatever you want with the other components.',
      lucid
    );

    return true;
  } else {
    failTests();
    return false;
  }
}
