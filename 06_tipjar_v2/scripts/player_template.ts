import { Data, LucidEvolution } from '@lucid-evolution/lucid';
import { awaitTxConfirms, getFormattedTxDetails } from '../../common/offchain/utils';
import { createTipJarDatum, TipJarDatum, TipJarRedeemer } from './types';
import { GameData, TestData } from './task';

export async function play(lucid: LucidEvolution, gameData: GameData): Promise<TestData> {
  /**
   * The smart contracts are already deployed, see the [run.ts] file for more details.
   * The [gameData] variable contains all the things you need to interact with the vulnerable smart contracts.
   */
  const { scriptValidator, scriptUtxo, scriptAddress } = gameData;
  const utxo = gameData.scriptUtxo;
  const lovelaceInUTxO = scriptUtxo.assets['lovelace'];

  if (utxo.datum === null) {
    throw new Error('UTxO object does not contain datum.');
  }

  const datum = Data.from(utxo.datum!, TipJarDatum);
  console.log('\nThe TipJar was created.');

  // ================ YOUR CODE STARTS HERE

  /**
   * HAPPY PATH -- an example interaction with the Tip Jar.
   * In the code below, we tip 10 ADA into the Jar and add a Thank you! note for the owner.
   */
  const tx = await lucid
    .newTx()
    .collectFrom([utxo], Data.to('AddTip', TipJarRedeemer))
    .pay.ToContract(
      scriptAddress,
      { kind: 'inline', value: createTipJarDatum(datum.owner, ['Thank you!']) },
      { lovelace: lovelaceInUTxO + 10000000n }
    )
    .attach.SpendingValidator(scriptValidator)
    .complete();
  const signedTx = await tx.sign.withWallet().complete();
  const tippingTxHash = await signedTx.submit();

  console.log(`AddTip transaction submitted${getFormattedTxDetails(tippingTxHash, lucid)}`);

  await awaitTxConfirms(lucid, tippingTxHash);

  /**
   * This data is needed to make tests runnable.
   * Please make sure that correct data is put there.
   */
  const testData = { lastTx: tippingTxHash };

  // ================ YOUR CODE ENDS HERE

  return testData;
}
