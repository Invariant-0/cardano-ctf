import {
  Lucid,
  SpendingValidator,
  UTxO,
} from "https://deno.land/x/lucid@0.10.7/mod.ts";
import {
  awaitTxConfirms,
  decodeBase64,
  filterUTXOsByTxHash,
  getCurrentTime,
  getFormattedTxDetails,
  getWalletBalanceLovelace,
  hour,
  setupValidator,
} from "../../common/offchain/utils.ts";
import blueprint from "../plutus.json" with { type: "json" };
import {
  failTest,
  failTests,
  passAllTests,
  passTest,
  submitSolutionRecord,
} from "../../common/offchain/test_utils.ts";
import { createVestingDatum } from "./types.ts";

export type GameData = {
  vestingValidator: SpendingValidator;
  vestingAddress: string;
  vestingtUtxo: UTxO;
  lockUntil: number;
  originalBalance: bigint;
  txHash: string;
  startTime: number;
};
export type TestData = void;

function readValidator(lucid: Lucid): SpendingValidator {
  const vesting = setupValidator(lucid, blueprint, "vesting.vesting");

  return vesting.validator;
}

export async function setup(lucid: Lucid) {
  console.log(`\n=== SETUP IN PROGRESS ===`);

  const validator = readValidator(lucid);

  console.log(`Creating a vesting UTxO that locks 5 ADA for 5 hours...\n`);

  const vestingAddress = lucid.utils.validatorToAddress(validator);
  const beneficiary = await lucid.wallet.address();
  const vestedValue = 5000000n;
  const startTime = getCurrentTime(lucid);
  const lockedUntil = getCurrentTime(lucid) + 5 * hour();
  const datum = createVestingDatum(lucid, BigInt(lockedUntil), beneficiary);

  const tx = await lucid
    .newTx()
    .payToContract(vestingAddress, { inline: datum }, { lovelace: vestedValue })
    .complete();

  const signedTx = await tx.sign().complete();

  const txHash = await signedTx.submit();
  await awaitTxConfirms(lucid, txHash);
  console.log(
    `                               Current time: ${getCurrentTime(lucid)}`,
  );
  console.log(
    `5 ADA locked into the vesting contract until ${lockedUntil}${
      getFormattedTxDetails(txHash, lucid)
    }`,
  );

  console.log(`\n=== SETUP WAS SUCCESSFUL ===\n`);

  const vestingUtxo =
    filterUTXOsByTxHash(await lucid.utxosAt(vestingAddress), txHash)[0];

  return {
    vestingValidator: validator,
    vestingAddress: vestingAddress,
    vestingtUtxo: vestingUtxo,
    lockUntil: lockedUntil,
    originalBalance: await getWalletBalanceLovelace(lucid),
    txHash: txHash,
    startTime: startTime,
  };
}

export async function test(
  lucid: Lucid,
  gameData: GameData,
  _testData: TestData,
): Promise<boolean> {
  let passed = true;
  console.log("\n================TESTS==================");
  const vestingUtxos = filterUTXOsByTxHash(
    await lucid.utxosAt(gameData.vestingAddress),
    gameData.txHash,
  );
  const endBalance = await getWalletBalanceLovelace(lucid);
  const endTime = getCurrentTime(lucid);
  if (vestingUtxos.length != 0) {
    failTest("TEST 1 FAILED -- the vesting UTxO was not spent");
    passed = false;
  } else {
    passTest("TEST 1 PASSED", lucid);
  }
  if (endBalance - gameData.originalBalance < 4000000n) {
    failTest("TEST 2 FAILED -- your wallet did not obtain additional rewards");
    passed = false;
  } else {
    passTest("TEST 2 PASSED", lucid);
  }
  if (endTime - gameData.startTime > 4 * hour()) {
    failTest(
      "TEST 3 FAILED -- you waited more than 4 hours since the vesting was created",
    );
    passed = false;
  } else {
    passTest("TEST 3 PASSED", lucid);
  }
  if (passed) {
    await submitSolutionRecord(lucid, 2n);

    const encodedBlogURL =
      "aHR0cHM6Ly9tZWRpdW0uY29tL0BpbnZhcmlhbnQwL2NhcmRhbm8tdnVsbmVyYWJpbGl0aWVzLXRpbWUtaGFuZGxpbmctM2IwOTI1ZGY3ZmMy";

    passAllTests(
      "\nCongratulations on the successful completion of the Level 02: Vesting\n" +
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
