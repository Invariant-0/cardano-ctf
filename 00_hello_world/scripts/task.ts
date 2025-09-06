import { Data, LucidEvolution, SpendingValidator, TxHash, UTxO } from '@lucid-evolution/lucid';
import { validatorToAddress, getAddressDetails } from '@lucid-evolution/utils';
import {
  awaitTxConfirms,
  filterUTXOsByTxHash,
  getFormattedTxDetails,
  getWalletBalanceLovelace,
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

export type GameData = {
  scriptValidator: SpendingValidator;
  scriptUtxo: UTxO;
  originalBalance: bigint;
};

export type TestData = void;

function readValidator(lucid: LucidEvolution): SpendingValidator {
  const hello = setupValidator(lucid, blueprint, 'hello_world.hello_world');
  return hello.validator;
}

export async function lock(
  lovelace: bigint,
  { into }: { into: SpendingValidator },
  lucid: LucidEvolution
): Promise<TxHash> {
  const contractAddress = validatorToAddress(lucid.config().network!, into);

  const tx = await lucid
    .newTx()
    .pay.ToContract(contractAddress, { kind: 'inline', value: Data.void() }, { lovelace })
    .complete();

  const signedTx = await tx.sign.withWallet().complete();

  return signedTx.submit();
}

export async function setup(lucid: LucidEvolution) {
  console.log(`=== SETUP IN PROGRESS ===`);

  const validator = readValidator(lucid);

  const _publicKeyHash = getAddressDetails(await lucid.wallet().address()).paymentCredential?.hash;

  console.log(`Creating an UTxO at the smart contract script address...`);

  const txHash = await lock(10000000n, { into: validator }, lucid);

  await awaitTxConfirms(lucid, txHash);

  console.log(`10 ADA locked into the contract${getFormattedTxDetails(txHash, lucid)}`);

  const contractAddress = validatorToAddress(lucid.config().network, validator);

  const originalBalance = await getWalletBalanceLovelace(lucid);

  console.log(`=== SETUP WAS SUCCESSFUL ===`);

  return {
    scriptValidator: validator,
    scriptUtxo: filterUTXOsByTxHash(await lucid.utxosAt(contractAddress), txHash)[0],
    originalBalance: originalBalance,
  };
}

export async function test(
  lucid: LucidEvolution,
  gameData: GameData,
  _testData: TestData
): Promise<boolean> {
  let passed = true;
  console.log('================TESTS==================');
  const endBalance = await getWalletBalanceLovelace(lucid);
  if (gameData.originalBalance - endBalance > 4000000n) {
    failTest('TEST 1 FAILED - you spent too much ADA');
    passed = false;
  } else {
    passTest('TEST 1 PASSED', lucid);
  }
  if (passed) {
    await submitSolutionRecord(lucid, 0n);

    passAllTests(
      '\nCongratulations on the successful completion of the Level 00: Hello World!\nGood luck with the next level.',
      lucid
    );
    return true;
  } else {
    failTests();
    return false;
  }
}
