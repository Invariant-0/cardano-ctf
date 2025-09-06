import {
  Data,
  Lucid,
  Script,
  SpendingValidator,
  toText,
  UTxO,
} from "https://deno.land/x/lucid@0.10.7/mod.ts";
import {
  awaitTxConfirms,
  decodeBase64,
  filterUTXOsByTxHash,
  getFormattedTxDetails,
  getWalletBalanceLovelace,
  setupValidator,
} from "../../common/offchain/utils.ts";
import {
  failTest,
  failTests,
  passAllTests,
  passTest,
  submitSolutionRecord,
} from "../../common/offchain/test_utils.ts";
import { createTipJarDatum, TipJarDatum, TipJarRedeemer } from "./types.ts";
import blueprint from "../plutus.json" with { type: "json" };

export type Validators = {
  tipJar: SpendingValidator;
  tipJarAddress: string;
};

export type GameData = {
  scriptValidator: Script;
  scriptAddress: string;
  scriptUtxo: UTxO;
  originalBalance: bigint;
};

export type TestData = {
  lastTx: string;
};

function readValidators(lucid: Lucid): Validators {
  const tipJar = setupValidator(lucid, blueprint, "tipjar.tipjar");

  return {
    tipJar: tipJar.validator,
    tipJarAddress: tipJar.address,
  };
}

export async function setup(lucid: Lucid): Promise<GameData> {
  console.log(`=== SETUP IN PROGRESS ===`);

  // Compile and setup the validators
  const validators = readValidators(lucid);

  const owner = "1c8d5146716def9ac9aa4968a51e0175cea4e483cb328e48403f0df5";

  console.log("Setting up tipjar!");

  const tx = await lucid
    .newTx()
    .payToContract(validators!.tipJarAddress, {
      inline: createTipJarDatum(owner, []),
    }, { lovelace: 5000000n })
    .complete();
  const signedTx = await tx.sign().complete();
  const txHash = await signedTx.submit();
  console.log(
    "Setup transaction was submitted, awaiting confirmations!",
  );
  await awaitTxConfirms(lucid, txHash);
  console.log(
    `Tip Jar was succesfully created${getFormattedTxDetails(txHash, lucid)}`,
  );

  const scriptUtxos = filterUTXOsByTxHash(
    await lucid.utxosAt(validators!.tipJarAddress),
    txHash,
  );

  const originalBalance = await getWalletBalanceLovelace(lucid);
  console.log(`Your wallet's balance after setup is ${originalBalance}`);

  console.log(`=== SETUP WAS SUCCESSFUL ===`);

  return {
    scriptValidator: validators!.tipJar,
    scriptAddress: validators!.tipJarAddress,
    scriptUtxo: scriptUtxos[0],
    originalBalance: originalBalance,
  };
}

async function tryToTip(
  gameData: GameData,
  lucid: Lucid,
  utxo: UTxO,
): Promise<boolean> {
  const validator = gameData.scriptValidator;
  const contract = gameData.scriptAddress;
  const lovelaceInUTxO = utxo.assets["lovelace"];

  if (utxo.datum == null) {
    throw new Error("UTxO object does not contain datum.");
  }

  const datum = Data.from(utxo.datum, TipJarDatum);

  console.log("Trying to tip some more...");
  try {
    const tx = await lucid
      .newTx()
      .collectFrom([utxo], Data.to("AddTip", TipJarRedeemer))
      .payToContract(contract, {
        inline: createTipJarDatum(
          datum.owner,
          ["Another message for you. We appreciate this CTF very much and hope no one can break it, so that we can tip you many more times in the future. :)"]
            .concat(datum.messages.map(toText)),
        ),
      }, { lovelace: lovelaceInUTxO + 6000000n })
      .attachSpendingValidator(validator)
      .complete();
    const signedTx = await tx.sign().complete();
    await signedTx.submit();
  } catch (e) {
    console.log(e);
    return true;
  }

  return false;
}

export async function test(
  lucid: Lucid,
  gameData: GameData,
  testData: TestData,
): Promise<boolean> {
  let passed = true;
  console.log("================TESTS==================");

  const endBalance = await getWalletBalanceLovelace(lucid);

  console.log(`Your wallet's balance at the end is ${endBalance}`);

  const scriptUtxo = filterUTXOsByTxHash(
    await lucid.utxosAt(gameData.scriptAddress),
    testData.lastTx,
  )[0];

  // 1. Try to tip to the UTxO
  const tipFailed = await tryToTip(gameData, lucid, scriptUtxo);
  if (tipFailed) {
    passTest(`TEST 1 PASSED - it's not possible to tip anymore!`, lucid);
  } else {
    failTest(`TEST 1 FAILED - tip attempt did not fail.`);
    passed = false;
  }

  // 2. Did not spend too much ADA
  const spentAda = gameData.originalBalance - endBalance;
  if (spentAda < 100000000n) {
    passTest(`TEST 1 PASSED - you spent less than 100 ADA.`, lucid);
  } else {
    failTest(`TEST 1 FAILED - you spent too much ADA.`);
    passed = false;
  }

  if (passed) {
    await submitSolutionRecord(lucid, 4n);

    const encodedBlogURL =
      "aHR0cHM6Ly9tZWRpdW0uY29tL0BpbnZhcmlhbnQwL2NhcmRhbm8tY3RmLWhpbnRzLWFuZC1zb2x1dGlvbnMtZTM5OTFjZTZhOTQ0";

    passAllTests(
      "\nCongratulations on the successful completion of the Level 04: TipJar\n" +
        `You can compare your solution with ours by reading this blog post: ${
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
