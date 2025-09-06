import {
  Lucid,
  MintingPolicy,
  SpendingValidator,
  UTxO,
} from "https://deno.land/x/lucid@0.10.7/mod.ts";
import {
  awaitTxConfirms,
  decodeBase64,
  filterUTXOsByTxHash,
  getFormattedTxDetails,
  getWalletBalanceLovelace,
  setupMintingPolicy,
  setupValidator,
} from "../../common/offchain/utils.ts";
import { createTreasuryDatum } from "./types.ts";
import blueprint from "../plutus.json" with { type: "json" };
import {
  failTest,
  failTests,
  passAllTests,
  passTest,
  submitSolutionRecord,
} from "../../common/offchain/test_utils.ts";

export type Validators = {
  validationPolicy: MintingPolicy;
  policyId: string;
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
  originalBalance: bigint;
};
export type TestData = void;

function readValidators(lucid: Lucid): Validators {
  const validationToken = setupMintingPolicy(
    lucid,
    blueprint,
    "validation_token.multisig_validation",
  );
  const treasury = setupValidator(lucid, blueprint, "treasury.treasury");
  const multisig = setupValidator(lucid, blueprint, "multisig.multisig", [
    validationToken.policyId,
    treasury.hash,
  ]);

  return {
    validationPolicy: validationToken.policy,
    policyId: validationToken.policyId,
    treasuryValidator: treasury.validator,
    treasuryAddress: treasury.address,
    multisigValidator: multisig.validator,
    multisigAddress: multisig.address,
  };
}

export async function setup(lucid: Lucid) {
  console.log(`=== SETUP IN PROGRESS ===`);

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
      inline: createTreasuryDatum(
        treasuryFunds,
        owners,
        lucid.utils.validatorToScriptHash(validators.multisigValidator),
        lucid,
      ),
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
  const treasuryUTxO = filterUTXOsByTxHash(
    await lucid.utxosAt(validators!.treasuryAddress),
    submittedTrTx,
  )[0];

  const originalBalance = await getWalletBalanceLovelace(lucid);
  console.log(`Your wallet's balance after setup is ${originalBalance}`);

  console.log(`=== SETUP WAS SUCCESSFUL ===`);

  return {
    validators,
    treasuryFunds,
    treasuryOwners: owners,
    multisigReleaseValue: multisigRelease,
    multisigBeneficiary,
    treasuryUTxO,
    originalBalance,
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
  if (endBalance < gameData.originalBalance) {
    failTest(
      "TEST 1 FAILED -- you spent more ADA than you obtained from the exploit",
    );
    passed = false;
  } else {
    passTest("TEST 1 PASSED", lucid);
  }

  const treasuryUtxos = filterUTXOsByTxHash(
    await lucid.utxosAt(gameData.validators.treasuryAddress),
    gameData.treasuryUTxO.txHash,
  );
  if (treasuryUtxos.length != 0) {
    failTest("TEST 2 FAILED -- the treasury UTxO was not spent");
    passed = false;
  } else {
    passTest("TEST 2 PASSED", lucid);
  }

  if (passed) {
    await submitSolutionRecord(lucid, 7n);

    const encodedBlogURL =
      "aHR0cHM6Ly9tZWRpdW0uY29tL0BpbnZhcmlhbnQwL2NhcmRhbm8tdnVsbmVyYWJpbGl0aWVzLTYtdG9rZW4tc2VjdXJpdHktaWktZjIzMTliMTQ3ZWU2";

    passAllTests(
      "\nCongratulations on the successful completion of the Level 07: Multisig Treasury v2\n" +
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
