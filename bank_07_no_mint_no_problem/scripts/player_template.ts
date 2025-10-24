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
   * GOAL: No pure minting works here, however the ultimate attack is to use the same token as from the previous level to drain the bank.
   * How can you use the token? Well, you first need to find it and get it.
   * How can you get it? Well... ;)
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
    // Add config as reference input (required for both bank and account validation)
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
   * HINT Base64: VXNlIGRlcG9zaXQgdG8gb3RoZXIgYWNjb3VudCBmbG93ISBZb3UgY2FuIHN0ZWFsIHRoZSBhY2NvdW50IHRva2VuIGZyb20gdGhlIGFscmVhZHkgY3JlYXRlZCBhY2NvdW50LCB3aGlsZSBkb2luZyBhIHZhbGlkIGRlcG9zaXQgaW50byBpdC4gSSBndWVzcyB5b3Uga25vdyBleGFjdGx5IHdoYXQgdG8gZG8gd2l0aCB0aGF0IHRva2VuIHRoZW4gOyk=
   */

  // ================ YOUR CODE ENDS HERE

  return { lastBankTxHash: txHash };
}
