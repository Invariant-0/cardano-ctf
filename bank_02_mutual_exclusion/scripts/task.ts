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
  victimAccountUtxo: UTxO;
  bankUtxo: UTxO;
  playerAddress: string;
  victimAddress: string;
  originalBalance: bigint;
};
export type TestData = void;

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

  // Create a victim wallet
  const victimPrivateKey = generatePrivateKey();
  lucid.selectWallet.fromPrivateKey(victimPrivateKey);
  const victimAddress = await lucid.wallet().address();
  const victimPkh = getAddressDetails(victimAddress).paymentCredential!.hash;
  resetWallet(lucid);

  console.log(`Creating bank and the future victim's account...`);

  // Initial bank UTxO with victim's deposit
  const victimDepositAmount = 20_000_000n; // 20 ADA

  // Create victim's account datum
  const victimAccountDatum = {
    balance: victimDepositAmount,
    owner: victimPkh,
  };

  const tx = await lucid
    .newTx()
    .pay.ToContract(
      bankAddress,
      { kind: 'inline', value: Data.void() },
      { lovelace: victimDepositAmount + 2_000_000n } // Bank holds victim's funds and min Ada
    )
    .pay.ToContract(
      accountAddress,
      { kind: 'inline', value: Data.to(victimAccountDatum, AccountDatum) },
      { lovelace: 2_000_000n } // Min Ada
    )
    .complete();

  const signedTx = await tx.sign.withWallet().complete();
  const bankTxHash = await signedTx.submit();
  await awaitTxConfirms(lucid, bankTxHash);

  console.log(
    `Bank initialized with the future victim's ${victimDepositAmount / 1_000_000n} ADA deposit`
  );

  console.log(`\n=== SETUP WAS SUCCESSFUL ===\n`);
  console.log(`You (player) have NO bank account.`);
  console.log(
    `Another user has an account with ${victimDepositAmount / 1_000_000n} ADA deposited.`
  );
  console.log(`Can you withdraw their funds?\n`);

  // Get the created UTxOs
  const bankUtxos = filterUTXOsByTxHash(await lucid.utxosAt(bankAddress), bankTxHash);
  const accountUtxos = filterUTXOsByTxHash(await lucid.utxosAt(accountAddress), bankTxHash);

  const bankUtxo = bankUtxos[0];
  const victimAccountUtxo = accountUtxos[0];

  return {
    bankValidator,
    accountValidator,
    bankAddress,
    accountAddress,
    victimAccountUtxo,
    bankUtxo,
    playerAddress,
    victimAddress,
    originalBalance: await getWalletBalanceLovelace(lucid),
  };
}

export async function test(
  lucid: LucidEvolution,
  gameData: GameData,
  _testData: TestData
): Promise<boolean> {
  let passed = true;
  console.log('\n================TESTS==================');

  // Check if player successfully withdrew funds
  const endBalance = await getWalletBalanceLovelace(lucid);
  const gained = endBalance - gameData.originalBalance;

  // Player should have gained significant funds (at least 18 ADA from the 20 ADA victim deposit)
  if (gained < 19_000_000n) {
    failTest("TEST 1 FAILED -- you did not successfully withdraw funds from the victim's account");
    passed = false;
  } else {
    passTest('TEST 1 PASSED', lucid);
  }

  if (passed) {
    await submitSolutionRecord(lucid, 102n); // bank_02 level

    passAllTests(
      '\nCongratulations on completing Bank 02: Mutual Exclusion!\n' +
        'You successfully found unvalidated transaction fields and exploited them to your advantage.\n' +
        'Would you be able to fix it in the validators? Try it! Does the name of the task make sense now?',
      lucid
    );

    return true;
  } else {
    failTests();
    return false;
  }
}
