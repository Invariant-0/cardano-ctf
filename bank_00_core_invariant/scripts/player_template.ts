import { Data, LucidEvolution } from '@lucid-evolution/lucid';
import { awaitTxConfirms, getFormattedTxDetails } from '../../common/offchain/utils';
import { GameData, TestData } from './task';
import { createAccountDatum, AccountDatum, AccountRedeemer } from './types';

export async function play(lucid: LucidEvolution, gameData: GameData): Promise<TestData> {
  /**
   * The smart contracts are already deployed and initialized.
   * The bank holds funds from two users:
   * - You (player) deposited 10 ADA
   * - Another user deposited 15 ADA
   *
   * The [gameData] variable contains all the necessary components to interact with the bank.
   */

  // ================ YOUR CODE STARTS HERE

  /**
   * HAPPY PATH -- example withdrawal of half your deposited amount
   * This shows the normal interaction where you withdraw a portion of your funds.
   */

  console.log('Attempting to withdraw 5 ADA from your account...');

  // Amount to withdraw (5 ADA = half of the 10 ADA you deposited)
  const withdrawAmount = 5_000_000n;

  // Get current account datum to calculate new balance
  const accountDatum = Data.from(gameData.playerAccountUtxo.datum!, AccountDatum);

  // Create new account datum with reduced balance
  const newBalance = accountDatum.balance - withdrawAmount;
  const newAccountDatum = createAccountDatum(newBalance, gameData.playerAddress);

  // Build the withdrawal transaction
  const tx = await lucid
    .newTx()
    // Spend from bank with Withdraw redeemer
    .collectFrom([gameData.bankUtxo], Data.void())
    .attach.SpendingValidator(gameData.bankValidator)
    // Spend from your account with DecreaseBalance redeemer
    .collectFrom([gameData.playerAccountUtxo], Data.to('DecreaseBalance', AccountRedeemer))
    .attach.SpendingValidator(gameData.accountValidator)
    // Recreate the bank UTxO with reduced funds
    .pay.ToContract(
      gameData.bankAddress,
      { kind: 'inline', value: Data.void() },
      { lovelace: gameData.bankUtxo.assets.lovelace - withdrawAmount }
    )
    // Recreate account UTxO with updated balance
    .pay.ToContract(
      gameData.accountAddress,
      { kind: 'inline', value: newAccountDatum },
      { lovelace: 2000000n } // Minimum UTxO value
    )
    // Add your signature (required for DecreaseBalance)
    .addSigner(gameData.playerAddress)
    .complete();

  const signedTx = await tx.sign.withWallet().complete();
  const txHash = await signedTx.submit();
  await awaitTxConfirms(lucid, txHash);

  console.log(
    `Successfully withdrew ${withdrawAmount / 1000000n} ADA${getFormattedTxDetails(txHash, lucid)}`
  );
  console.log(`New account balance: ${newBalance / 1000000n} ADA`);

  /**
   * HINT base64: VGhlIGJhbmsgY2hlY2tzIHRoYXQgeW91ciBhY2NvdW50IGJhbGFuY2UgZGVjcmVhc2VzIGJ5IHRoZSB3aXRoZHJhd2FsIGFtb3VudCwgYnV0IHdoYXQgZWxzZSBzaG91bGQgaXQgYmUgY2hlY2tpbmc/ 🤔
   */

  // For test purposes, please return the hash of the last transaction where bank UTxO is created
  return { lastBankTxHash: txHash };

  // ================ YOUR CODE ENDS HERE
}
