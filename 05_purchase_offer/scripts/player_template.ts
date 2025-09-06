import { Data, fromText, LucidEvolution } from '@lucid-evolution/lucid';
import { awaitTxConfirms, FIXED_MIN_ADA, getFormattedTxDetails } from '../../common/offchain/utils';
import { PurchaseOfferDatum, SellRedeemer } from './types';
import { getBech32FromAddress } from '../../common/offchain/types';

import { GameData, TestData } from './task';

export async function play(lucid: LucidEvolution, gameData: GameData): Promise<TestData> {
  /**
   * The smart contracts are already deployed, see the [run.ts] file for more details.
   * The [gameData] variable contains all the things you need to interact with the vulnerable smart contracts.
   */

  // ================ YOUR CODE STARTS HERE

  /**
   * HAPPY PATH -- example of interaction with the purchase_offer script
   * In the code that is currently here, we sell our precious NFT to the first purchase offer for our NFT.
   * Try to change this code so that you earn more ADA than is being offerred.
   *
   * DO NOT change anything in the `gameData` variable or in the game setup.
   */

  const asset = `${gameData.assetPolicyId}${fromText(gameData.assetTokenName)}`;
  const offerUtxo = gameData.scriptUtxos.find((utxo) => {
    const datum = Data.from(utxo.datum!, PurchaseOfferDatum);
    return (
      datum.desired_policy_id === gameData.assetPolicyId &&
      datum.desired_token_name === fromText(gameData.assetTokenName)
    );
  })!;
  const offerUtxoOwner = Data.from(offerUtxo.datum!, PurchaseOfferDatum).owner;
  const offerUtxoOwnerAddress = getBech32FromAddress(lucid, offerUtxoOwner);
  const redeemer = Data.to(
    {
      sold_asset: {
        policy_id: gameData.assetPolicyId,
        asset_name: fromText(gameData.assetTokenName),
      },
    },
    SellRedeemer
  );

  const tx = await lucid
    .newTx()
    .collectFrom([offerUtxo], redeemer)
    .pay.ToAddress(offerUtxoOwnerAddress, {
      [asset]: BigInt(1),
      lovelace: FIXED_MIN_ADA,
    })
    .attach.SpendingValidator(gameData.scriptValidator)
    .complete();

  const signedTx = await tx.sign.withWallet().complete();
  const purchaseTxHash = await signedTx.submit();

  console.log(
    `Purchase Offer transaction submitted${getFormattedTxDetails(purchaseTxHash, lucid)}`
  );

  await awaitTxConfirms(lucid, purchaseTxHash);

  // ================ YOUR CODE ENDS HERE
}
