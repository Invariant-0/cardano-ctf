import { Data, LucidEvolution } from '@lucid-evolution/lucid';
import { awaitTxConfirms, getFormattedTxDetails } from '../../common/offchain/utils';
import { createKingOfCardanoDatum, KingDatum, KingRedeemer } from './types';
import { GameData, TestData } from './task';
import { getBech32FromAddress } from '../../common/offchain/types';

export async function play(lucid: LucidEvolution, gameData: GameData): Promise<TestData> {
  /**
   * The smart contracts are already deployed, see the [run.ts] file for more details.
   * The [gameData] variable contains all the things you need to interact with the vulnerable smart contracts.
   *
   * Note:
   *   The [gameData] variable also contains an [_admin] field.
   *   You are not supposed to use it. The solution to the task does not utilize it in any way.
   *   It is here just to simplify its passage to the test() function.
   */

  // ================ YOUR CODE STARTS HERE

  /**
   * HAPPY PATH -- An example interaction with the King of Cardano smart contract.
   * We overthrow the king and hope no one overthrows us later!
   */

  const { validators, kingUTxO } = gameData;

  const datum = Data.from(kingUTxO.datum!, KingDatum);
  const lovelaceInUTxO = kingUTxO.assets['lovelace']!;

  const currentKingAddress = getBech32FromAddress(lucid, datum.current_king);
  console.log('Going to overthrow the current king.');

  const tx = await lucid
    .newTx()
    .collectFrom([kingUTxO], Data.to('OverthrowKing', KingRedeemer))
    .pay.ToContract(
      kingUTxO.address,
      { kind: 'inline', value: createKingOfCardanoDatum(await lucid.wallet().address(), false) },
      {
        lovelace: lovelaceInUTxO + 5000000n,
        [validators.uniqueNFTAsset]: BigInt(1),
      }
    )
    .pay.ToAddress(currentKingAddress, { lovelace: lovelaceInUTxO })
    .attach.SpendingValidator(validators.kingOfCardanoValidator)
    .complete();
  const signedTx = await tx.sign.withWallet().complete();
  const overthrowTxHash = await signedTx.submit();

  console.log(`Overthrow Tx submitted${getFormattedTxDetails(overthrowTxHash, lucid)}`);
  await awaitTxConfirms(lucid, overthrowTxHash);

  // The resulting token name of the King of Cardano NFT will be equal to: "{nick} is King of Cardano"
  const nick = 'Invariant0';

  // ================ YOUR CODE ENDS HERE

  const testData = { overthrowTxHash, nick };
  return testData;
}
