import { Data, LucidEvolution, SpendingValidator, UTxO } from '@lucid-evolution/lucid';
import {
  validatorToAddress,
  validatorToScriptHash,
  generatePrivateKey,
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
import { createAccountDatum } from './types';

export type GameData = {
  bankValidator: SpendingValidator;
  accountValidator: SpendingValidator;
  bankAddress: string;
  accountAddress: string;
  playerAccountUtxo: UTxO;
  otherAccountUtxo: UTxO;
  bankUtxo: UTxO;
  playerAddress: string;
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

  console.log(`Creating a decentralized bank with two accounts...\n`);

  // Initial bank UTxO with minimum ADA
  const bankInitialValue = 2_000_000n;

  // Player deposits 10 ADA
  const playerDepositAmount = 10_000_000n;

  // Other user deposits 15 ADA
  const otherDepositAmount = 15_000_000n;

  // Create another address for the other user
  const otherUserPrivateKey = generatePrivateKey();
  // Switch to other user temporarily to get their address
  lucid.selectWallet.fromPrivateKey(otherUserPrivateKey);
  const otherAddress = await lucid.wallet().address();
  // Switch back to original wallet
  resetWallet(lucid);

  // Create account datums
  const playerAccountDatum = createAccountDatum(playerDepositAmount, playerAddress);
  const otherAccountDatum = createAccountDatum(otherDepositAmount, otherAddress);

  // Initialize bank with both deposits
  const totalBankValue = bankInitialValue + playerDepositAmount + otherDepositAmount;

  const tx = await lucid
    .newTx()
    // Create bank UTxO with all funds
    .pay.ToContract(
      bankAddress,
      { kind: 'inline', value: Data.void() },
      { lovelace: totalBankValue }
    )
    // Create player account UTxO
    .pay.ToContract(
      accountAddress,
      { kind: 'inline', value: playerAccountDatum },
      { lovelace: 2_000_000n }
    )
    // Create other user account UTxO
    .pay.ToContract(
      accountAddress,
      { kind: 'inline', value: otherAccountDatum },
      { lovelace: 2_000_000n }
    )
    .complete();

  const signedTx = await tx.sign.withWallet().complete();
  const txHash = await signedTx.submit();
  await awaitTxConfirms(lucid, txHash);

  console.log(`Bank initialized with:`);
  console.log(`  - Player deposited: ${playerDepositAmount / 1_000_000n} ADA`);
  console.log(`  - Other user deposited: ${otherDepositAmount / 1_000_000n} ADA`);
  console.log(`  - Total bank balance: ${totalBankValue / 1_000_000n} ADA`);

  console.log(`\n=== SETUP WAS SUCCESSFUL ===\n`);

  // Get the created UTxOs
  const bankUtxos = filterUTXOsByTxHash(await lucid.utxosAt(bankAddress), txHash);
  const accountUtxos = filterUTXOsByTxHash(await lucid.utxosAt(accountAddress), txHash);

  // Find player's account (first one created)
  const playerAccountUtxo = accountUtxos[0];
  const otherAccountUtxo = accountUtxos[1];
  const bankUtxo = bankUtxos[0];

  return {
    bankValidator,
    accountValidator,
    bankAddress,
    accountAddress,
    playerAccountUtxo,
    otherAccountUtxo,
    bankUtxo,
    playerAddress,
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

  // Check if bank is empty
  const bankUtxos = filterUTXOsByTxHash(
    await lucid.utxosAt(gameData.bankAddress),
    testData.lastBankTxHash
  );
  const totalBankBalance = bankUtxos.reduce((acc, utxo) => acc + utxo.assets.lovelace, 0n);

  if (totalBankBalance > 3_000_000n) {
    // Allow some minimum UTxO value
    failTest('TEST 1 FAILED -- the bank was not emptied');
    passed = false;
  } else {
    passTest('TEST 1 PASSED', lucid);
  }

  // Check if player gained significant funds
  const endBalance = await getWalletBalanceLovelace(lucid);
  const gained = endBalance - gameData.originalBalance;

  // Player should have gained approximately his plus the other player's deposit
  if (gained < 23_000_000n) {
    failTest('TEST 2 FAILED -- you did not drain enough funds from the bank');
    passed = false;
  } else {
    passTest('TEST 2 PASSED', lucid);
  }

  if (passed) {
    await submitSolutionRecord(lucid, 100n); // bank_00 level

    passAllTests(
      '\nCongratulations on completing Bank 00: Core Invariant!\n' +
        'You successfully found and exploited the missing core withdrawal check.\n' +
        'Would you be able to fix it in the validators? You can try fixing it, building the validators anew and running your solution. If done correctly, you should encounter an error coming from the validator.',
      lucid
    );

    return true;
  } else {
    failTests();
    return false;
  }
}
