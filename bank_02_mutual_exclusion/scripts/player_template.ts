import { Data, LucidEvolution } from '@lucid-evolution/lucid';
import { awaitTxConfirms, getFormattedTxDetails } from '../../common/offchain/utils';
import { GameData, TestData } from './task';
import { createAccountDatum, AccountDatum, AccountRedeemer } from './types';

export async function play(lucid: LucidEvolution, gameData: GameData): Promise<TestData> {
  /**
   * The bank is already initialized with another user's account and funds.
   * You currently have NO bank account.
   *
   * The [gameData] variable contains all the necessary components to interact with the bank.
   */

  // ================ YOUR CODE STARTS HERE

  /**
   * Example of a transaction withdrawing funds from another person's account.
   * However, it does not validate - you are NOT SUPPOSED TO be able to do that ;).
   */

  // Amount to withdraw
  const withdrawAmount = 20_000_000n; // Withdraw it all
  const victimAccountDatum = Data.from(gameData.victimAccountUtxo.datum!, AccountDatum);

  console.log("Withdrawing 20 ADA from the victim's account...");

  // Withdraw from the victim's account
  const tx = await lucid
    .newTx()
    // Spend from bank (no redeemer needed)
    .collectFrom([gameData.bankUtxo], Data.void())
    .attach.SpendingValidator(gameData.bankValidator)
    // Spend from the account
    .collectFrom([gameData.victimAccountUtxo], Data.to('DecreaseBalance', AccountRedeemer))
    .attach.SpendingValidator(gameData.accountValidator)
    .addSigner(gameData.playerAddress)
    // Recreate the bank UTxO with decreased funds
    .pay.ToContract(
      gameData.bankAddress,
      { kind: 'inline', value: Data.void() },
      { lovelace: gameData.bankUtxo.assets.lovelace - withdrawAmount }
    )
    // Recreate victim's account UTxO with updated balance
    .pay.ToContract(
      gameData.accountAddress,
      { kind: 'inline', value: createAccountDatum(0n, victimAccountDatum.owner) },
      { lovelace: 2_000_000n }
    )
    .complete();

  const signedTx = await tx.sign.withWallet().complete();
  const txHash = await signedTx.submit();
  await awaitTxConfirms(lucid, txHash);

  console.log(
    `Successfully withdrew ${withdrawAmount / 1_000_000n} ADA from the victim's account${getFormattedTxDetails(txHash, lucid)}`
  );

  /**
   * HINT base64: T25lIHdvcmQgY2hhbmdlLg==
   */

  // ================ YOUR CODE ENDS HERE
}
