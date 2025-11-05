import { Data, LucidEvolution } from '@lucid-evolution/lucid';
import { awaitTxConfirms, getFormattedTxDetails } from '../../common/offchain/utils';
import { GameData, TestData } from './task';

export async function play(lucid: LucidEvolution, gameData: GameData): Promise<TestData> {
  /**
   * The bank is already initialized with a victim's account containing 70 ADA.
   * You currently have NO bank account.
   *
   * The [gameData] variable contains all the necessary components to interact with the bank.
   */

  // ================ YOUR CODE STARTS HERE

  /**
   * GOAL: Find a way to drain the bank by exploiting a similar vulnerability to the previous level.
   * Remember the name of the task - "Twin Bank" - and use it to guide your solution.
   *
   * The previous level used a certain common vulnerability pattern that you can use here as well.
   * This time, however, it's not about fake account balances or stealing tokens.
   * Rather, it's about the assumption that there's always just a single bank UTxO.
   *
   * ........ if needed, there's a hint below
   */

  console.log(`Bank contains: ${gameData.bankUtxo.assets.lovelace / 1_000_000n} ADA`);

  /**
   * Example: Try to simply withdraw the entire bank balance. Of course, this will fail.
   */

  const withdrawAmount = gameData.bankUtxo.assets.lovelace - 2_000_000n;

  const tx = await lucid
    .newTx()
    // Spend from bank
    .collectFrom([gameData.bankUtxo], Data.void())
    .attach.SpendingValidator(gameData.bankValidator)
    // Add config as reference input
    .readFrom([gameData.configUtxo])
    .addSigner(gameData.playerAddress)
    // Recreate the bank UTxO (mostly empty)
    .pay.ToContract(
      gameData.bankAddress,
      { kind: 'inline', value: Data.void() },
      { lovelace: 2_000_000n } // Min ADA only
    )
    .complete();

  const signedTx = await tx.sign.withWallet().complete();
  const txHash = await signedTx.submit();
  await awaitTxConfirms(lucid, txHash);

  console.log(
    `Successfully withdrew ${withdrawAmount / 1_000_000n} ADA from the bank${getFormattedTxDetails(txHash, lucid)}`
  );

  /**
   * HINT Base64: InR3aW4iIGluIHRoZSBuYW1lIG9mIHRoZSBsZXZlbCByZWZlcnMgdG8gdHdvIGlkZW50aWNhbCBiYW5rIFVUeE9zLiBDYW4gdGhleSBiZSBzcGVudCBpbiB0aGUgc2FtZSB0cmFuc2FjdGlvbj8=
   */

  // ================ YOUR CODE ENDS HERE

  return { lastBankTxHash: txHash };
}
