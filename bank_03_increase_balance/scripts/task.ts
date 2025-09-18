import { Data, LucidEvolution, SpendingValidator, UTxO } from '@lucid-evolution/lucid';
import {
  validatorToAddress,
  validatorToScriptHash,
  generatePrivateKey,
  getAddressDetails,
} from '@lucid-evolution/utils';
import {
  awaitTxConfirms,
  filterUTXOsByTxHash,
  getWalletBalanceLovelace,
  resetWallet,
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
import { AccountDatum } from './types';

export type GameData = {
  bankValidator: SpendingValidator;
  accountValidator: SpendingValidator;
  bankAddress: string;
  accountAddress: string;
  playerAccountUtxo: UTxO;
  victim1AccountUtxo: UTxO;
  victim2AccountUtxo: UTxO;
  bankUtxo: UTxO;
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
} {
  const accountValidator = setupValidator(lucid, blueprint, 'account.account.spend');

  const bankValidator = setupValidator(lucid, blueprint, 'bank.bank.spend', 'PlutusV3', [
    validatorToScriptHash(accountValidator.validator),
  ]);

  return {
    bankValidator: bankValidator.validator,
    accountValidator: accountValidator.validator,
  };
}

export async function setup(lucid: LucidEvolution) {
  console.log(`\n=== SETUP IN PROGRESS ===`);

  const { bankValidator, accountValidator } = readValidators(lucid);
  const bankAddress = validatorToAddress(lucid.config().network!, bankValidator);
  const accountAddress = validatorToAddress(lucid.config().network!, accountValidator);
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

  const tx = await lucid
    .newTx()
    .pay.ToContract(
      bankAddress,
      { kind: 'inline', value: Data.void() },
      { lovelace: totalBankFunds + 2_000_000n } // Bank holds all victims' funds and min Ada
    )
    .pay.ToContract(
      accountAddress,
      { kind: 'inline', value: Data.to(playerAccountDatum, AccountDatum) },
      { lovelace: 2_000_000n } // Min Ada
    )
    .pay.ToContract(
      accountAddress,
      { kind: 'inline', value: Data.to(victim1AccountDatum, AccountDatum) },
      { lovelace: 2_000_000n } // Min Ada
    )
    .pay.ToContract(
      accountAddress,
      { kind: 'inline', value: Data.to(victim2AccountDatum, AccountDatum) },
      { lovelace: 2_000_000n } // Min Ada
    )
    .complete();

  const signedTx = await tx.sign.withWallet().complete();
  const txHash = await signedTx.submit();
  await awaitTxConfirms(lucid, txHash);

  console.log(`Bank initialized with ${totalBankFunds / 1_000_000n} ADA total deposits`);

  console.log(`\n=== SETUP WAS SUCCESSFUL ===\n`);
  console.log(`You (player) have a bank account with 0 ADA balance.`);
  console.log(
    `Two other users have accounts with ${victim1DepositAmount / 1_000_000n} ADA and ${victim2DepositAmount / 1_000_000n} ADA deposited.`
  );
  console.log(`Can you artificially increase your balance and drain the entire bank?\n`);

  // Get the created UTxOs
  const bankUtxos = filterUTXOsByTxHash(await lucid.utxosAt(bankAddress), txHash);
  const accountUtxos = filterUTXOsByTxHash(await lucid.utxosAt(accountAddress), txHash);

  const bankUtxo = bankUtxos[0];
  const playerAccountUtxo = accountUtxos[0];
  const victim1AccountUtxo = accountUtxos[1];
  const victim2AccountUtxo = accountUtxos[2];

  return {
    bankValidator,
    accountValidator,
    bankAddress,
    accountAddress,
    playerAccountUtxo,
    victim1AccountUtxo,
    victim2AccountUtxo,
    bankUtxo,
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

  // Player should have gained significant funds (at least 68 ADA from the 70 ADA total deposits)
  if (gained < 68_000_000n) {
    failTest('TEST 1 FAILED -- you did not successfully drain the bank');
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
    await submitSolutionRecord(lucid, 103n); // bank_03 level

    passAllTests(
      '\nCongratulations on completing Bank 03: Increase Balance!\n' +
        'You successfully drained the bank again, enjoy!\n' +
        'A fix to this vulnerability is a bit harder to think of, right? Try it! If nothing comes to mind, you will have a chance to explore one way to do it in the next level.',
      lucid
    );

    return true;
  } else {
    failTests();
    return false;
  }
}
