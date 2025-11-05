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
   * GOAL: Find yet another way to obtain the account token and then use it to drain the bank.
   * Remember the name of the task and use it to guide your solution.
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
   * HINT Base64: c2VsZl9jb2xsaXNzaW9uIHJlZmVycyB0byBkb3VibGUgc2F0aXNmYWN0aW9uIGF0dGFjayAoIGlmIHlvdSBoYXZlIG5vIGlkZWEgd2hhdCBpdCBpcywgeW91IGNhbiByZWFkOiBodHRwczovL21lZGl1bS5jb20vQGludmFyaWFudDAvY2FyZGFuby12dWxuZXJhYmlsaXRpZXMtMS1kb3VibGUtc2F0aXNmYWN0aW9uLTIxOWYxYmM5NjY1ZSApIHVzaW5nIHlvdXIgb3duIGFjY291bnQgaW5wdXRzLiBTdGVhbCB0aGUgdG9rZW4gZnJvbSB5b3VyIG93biBhY2NvdW50Lg==
   */

  // ================ YOUR CODE ENDS HERE

  return { lastBankTxHash: txHash };
}
