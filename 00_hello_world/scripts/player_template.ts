import { Data, fromText, LucidEvolution } from '@lucid-evolution/lucid';
import { HelloRedeemer } from './types';
import { awaitTxConfirms, getFormattedTxDetails } from '../../common/offchain/utils';
import { GameData, TestData } from './task';

export async function play(lucid: LucidEvolution, gameData: GameData): Promise<TestData> {
  /**
   * The smart contracts are already deployed, see the [run.ts] file for more details.
   * The [gameData] variable contains all the things you need to interact with the vulnerable smart contracts.
   */

  // This is just a sanity check, so you do not have to change much here to pass the tests
  // Check the validator code to find out how to unlock the locked ADA!
  // The following code fails, read the validator carefully to find out why?
  // Hint base64: TG9vayBhdCB0aGUgcmVkZWVtZXIu

  // We find the contract UTxO where the ADA is locked
  // We create the redeemer

  // ================ YOUR CODE STARTS HERE
  // We unlock the locked UTxO using the redeemer "Hello, World!".
  console.log(`Building a transaction to unlock the locked script UTxO`);

  const redeemer = Data.to({ msg: fromText('Hello, World!') }, HelloRedeemer);
  const utxo = gameData.scriptUtxo;
  const scriptValidator = gameData.scriptValidator;

  const tx = await lucid
    .newTx()
    .collectFrom([utxo], redeemer)
    .attach.SpendingValidator(scriptValidator)
    .complete();

  const signedTx = await tx.sign.withWallet().complete();

  const unlockTxHash = await signedTx.submit();

  console.log(`UTxO was successfuly unlocked ${getFormattedTxDetails(unlockTxHash, lucid)}`);

  // We await the transaction confirmations.
  await awaitTxConfirms(lucid, unlockTxHash);

  // ================ YOUR CODE ENDS HERE
}
