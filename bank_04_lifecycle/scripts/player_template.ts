import { Data, LucidEvolution } from '@lucid-evolution/lucid';
import { awaitTxConfirms, getFormattedTxDetails } from '../../common/offchain/utils';
import { GameData, TestData } from './task';
import { createAccountDatum, AccountDatum, AccountRedeemer } from './types';

export async function play(lucid: LucidEvolution, gameData: GameData): Promise<TestData> {
  /**
   * The bank is already initialized with three accounts:
   * - Your account with 0 ADA balance
   * - Two victim accounts with 30 ADA and 40 ADA respectively
   *
   * The bank holds all 70 ADA from the victims' deposits.
   *
   * The [gameData] variable contains all the necessary components to interact with the bank.
   */

  // ================ YOUR CODE STARTS HERE

  /**
   * Example of trying to withdraw the entire bank balance.
   * This transaction will fail because your bank account balance is 0.
   */

  const playerAccountDatum = Data.from(gameData.playerAccountUtxo.datum!, AccountDatum);
  console.log(`Your current balance: ${playerAccountDatum.balance / 1_000_000n} ADA`);
  console.log(`Bank contains: ${gameData.bankUtxo.assets.lovelace / 1_000_000n} ADA`);

  console.log('Attempting to withdraw 70 ADA from the bank...');

  const withdrawAmount = 70_000_000n; // Try to take it all!

  const tx = await lucid
    .newTx()
    // Spend from bank
    .collectFrom([gameData.bankUtxo], Data.void())
    .attach.SpendingValidator(gameData.bankValidator)
    // Spend from your account
    .collectFrom([gameData.playerAccountUtxo], Data.to('DecreaseBalance', AccountRedeemer))
    .attach.SpendingValidator(gameData.accountValidator)
    // NEW: Add config as reference input (required for both bank and account validation)
    .readFrom([gameData.configUtxo])
    .addSigner(gameData.playerAddress)
    // Recreate the bank UTxO (empty)
    .pay.ToContract(
      gameData.bankAddress,
      { kind: 'inline', value: Data.void() },
      { lovelace: gameData.bankUtxo.assets.lovelace - withdrawAmount }
    )
    // Recreate your account UTxO with updated balance
    .pay.ToContract(
      gameData.accountAddress,
      { kind: 'inline', value: createAccountDatum(0n, gameData.playerPkh) },
      { lovelace: 2_000_000n }
    )
    .complete();

  const signedTx = await tx.sign.withWallet().complete();
  const txHash = await signedTx.submit();
  await awaitTxConfirms(lucid, txHash);

  console.log(
    `Successfully withdrew ${withdrawAmount / 1_000_000n} ADA from the bank${getFormattedTxDetails(txHash, lucid)}`
  );

  /**
   * HINT Base64: VGhpbmsgYWJvdXQgdGhlIGVudGlyZSBsaWZlY3ljbGUgb2YgYW4gYWNjb3VudC4gV2hhdCBoYXBwZW5zIHdoZW4gYW4gYWNjb3VudCBpcyBmaXJzdCBjcmVhdGVkPyBBcmUgdGhlcmUgYW55IHZhbGlkYXRpb25zIG1pc3Npbmc/
   */

  // ================ YOUR CODE ENDS HERE

  return { lastBankTxHash: txHash };
}
