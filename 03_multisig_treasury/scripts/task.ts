import {
  Lucid,
  SpendingValidator,
  UTxO,
} from "https://deno.land/x/lucid@0.10.7/mod.ts";
import {
  awaitTxConfirms,
  decodeBase64,
  filterUTXOsByTxHash,
  FIXED_MIN_ADA,
  getFormattedTxDetails,
  getWalletBalanceLovelace,
  setupValidator,
} from "../../common/offchain/utils.ts";
import { createMultisigDatum, createTreasuryDatum } from "./types.ts";
import blueprint from "../plutus.json" with { type: "json" };
import {
  failTest,
  failTests,
  passAllTests,
  passTest,
  submitSolutionRecord,
} from "../../common/offchain/test_utils.ts";

export type Validators = {
  treasuryValidator: SpendingValidator;
  treasuryAddress: string;
  multisigValidator: SpendingValidator;
  multisigAddress: string;
};
export type GameData = {
  validators: Validators;
  treasuryFunds: bigint;
  treasuryOwners: string[];
  multisigReleaseValue: bigint;
  multisigBeneficiary: string;
  treasuryUTxO: UTxO;
  treasuryUTxOHash: string;
  multisigUTxO: UTxO;
  originalBalance: bigint;
};
export type TestData = void;

function readValidators(lucid: Lucid): Validators {
  const multisig = setupValidator(lucid, blueprint, "multisig.multisig");
  const treasury = setupValidator(lucid, blueprint, "treasury.treasury", [
    multisig.hash,
  ]);

  return {
    treasuryValidator: treasury.validator,
    treasuryAddress: treasury.address,
    multisigValidator: multisig.validator,
    multisigAddress: multisig.address,
  };
}

export async function setup(lucid: Lucid) {
  console.log(`=== SETUP IN PROGRESS ===`);

  // Compile and setup the validators
  const validators = readValidators(lucid);
  const treasuryFunds = 10000000n;
  const multisigRelease = 8000000n;
  const ownAddress = await lucid.wallet.address();
  const multisigBeneficiary = ownAddress;
  const owners = [
    ownAddress,
    "addr_test1vrvpqazgry8p3lahfhwssx5hywl6m045wtjwjy98rqhraegvk9r78",
  ];

  const createTreasuryTx = await lucid
    .newTx()
    .payToContract(validators.treasuryAddress, {
      inline: createTreasuryDatum(treasuryFunds, owners, lucid),
    }, { lovelace: treasuryFunds })
    .complete();

  const signedTrTx = await createTreasuryTx.sign().complete();
  const submittedTrTx = await signedTrTx.submit();
  console.log(
    `Treasury setup transaction was submitted${
      getFormattedTxDetails(submittedTrTx, lucid)
    }`,
  );
  await awaitTxConfirms(lucid, submittedTrTx);
  const treasuryUtxo = filterUTXOsByTxHash(
    await lucid.utxosAt(validators!.treasuryAddress),
    submittedTrTx,
  )[0];

  const createMultisigTx = await lucid
    .newTx()
    .payToContract(validators.multisigAddress, {
      inline: createMultisigDatum(
        multisigRelease,
        multisigBeneficiary,
        owners,
        [],
        lucid,
      ),
    }, { lovelace: FIXED_MIN_ADA })
    .complete();

  const signedMSTx = await createMultisigTx.sign().complete();
  const submittedMSTx = await signedMSTx.submit();
  console.log(
    `Multisig setup transaction was submitted${
      getFormattedTxDetails(submittedMSTx, lucid)
    }`,
  );
  await awaitTxConfirms(lucid, submittedMSTx);

  const multisigUtxo = filterUTXOsByTxHash(
    await lucid.utxosAt(validators!.multisigAddress),
    submittedMSTx,
  )[0];

  const originalBalance = await getWalletBalanceLovelace(lucid);
  console.log(`Your wallet's balance after setup is ${originalBalance}`);

  console.log(`=== SETUP WAS SUCCESSFUL ===`);

  return {
    validators: validators,
    treasuryFunds: treasuryFunds,
    treasuryOwners: owners,
    multisigReleaseValue: multisigRelease,
    multisigBeneficiary: multisigBeneficiary,
    treasuryUTxO: treasuryUtxo,
    treasuryUTxOHash: submittedTrTx,
    multisigUTxO: multisigUtxo,
    originalBalance: originalBalance,
  };
}

export async function test(
  lucid: Lucid,
  gameData: GameData,
  _testData: TestData,
): Promise<boolean> {
  let passed = true;
  console.log("================TESTS==================");

  const endBalance = await getWalletBalanceLovelace(lucid);
  if (endBalance - gameData.originalBalance < 5000000n) {
    failTest(
      "TEST 1 FAILED -- you did not obtain enough additional ADA by unlocking the treasury",
    );
    passed = false;
  } else {
    passTest("TEST 1 PASSED", lucid);
  }

  const treasuryUtxos = filterUTXOsByTxHash(
    await lucid.utxosAt(gameData.validators.treasuryAddress),
    gameData.treasuryUTxOHash,
  );
  if (treasuryUtxos.length != 0) {
    failTest("TEST 2 FAILED -- the treasury UTxO was not spent");
    passed = false;
  } else {
    passTest("TEST 2 PASSED", lucid);
  }

  if (passed) {
    await submitSolutionRecord(lucid, 3n);

    const encodedBlogURL =
      "aHR0cHM6Ly9tZWRpdW0uY29tL0BpbnZhcmlhbnQwL2NhcmRhbm8tdnVsbmVyYWJpbGl0aWVzLTMtdHJ1c3Qtbm8tdXR4by1iMjUyNjUwYWMyYjk=";

    passAllTests(
      "\nCongratulations on the successful completion of the Level 03: Multisig Treasury\n" +
        `You can read more about the underlying vulnerability in this blog post: ${
          decodeBase64(encodedBlogURL)
        }` + "\nGood luck with the next level.",
      lucid,
    );
    return true;
  } else {
    failTests();
    return false;
  }
}
