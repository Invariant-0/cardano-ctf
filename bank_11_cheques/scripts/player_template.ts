import { Data, LucidEvolution } from '@lucid-evolution/lucid';
import { awaitTxConfirms, getFormattedTxDetails } from '../../common/offchain/utils';
import { GameData, TestData } from './task';
import { AccountDatum, createAccountDatum, createDecreaseBalanceByChequeRedeemer } from './types';

export async function play(lucid: LucidEvolution, gameData: GameData): Promise<TestData> {
  /**
   * The bank is already initialized with:
   * - Your account with 20 ADA
   * - Victim 1's account with 5 ADA (no cheque shared)
   * - Victim 2's account with 10 ADA (shared a 10 ADA cheque with you)
   *
   * The [gameData] variable contains all the necessary components to interact with the bank,
   * including the signed cheque from Victim 2: gameData.chequeFromVictim2
   */

  // ================ YOUR CODE STARTS HERE

  /**
   * GOAL: Find a way to drain the entire bank by exploiting the newly added cheque code path.
   *
   * ........ if needed, there's a hint below
   */

  console.log(`Bank contains: ${gameData.bankUtxo.assets.lovelace / 1_000_000n} ADA`);
  console.log(`Your account balance: 20 ADA`);
  console.log(`Victim 1 account balance: 5 ADA`);
  console.log(`Victim 2 account balance: 10 ADA`);
  console.log(
    `\nYou have received a signed cheque from Victim 2 for ${gameData.chequeFromVictim2.amount / 1_000_000n} ADA`
  );

  /**
   * Example: Redeem the cheque from Victim 2 to withdraw 10 ADA from their account.
   * This demonstrates the cheque feature working correctly (but does not exploit the vulnerability and does not pass the tests).
   */

  const cheque = gameData.chequeFromVictim2;
  const chequeAmount = cheque.amount;

  // Get current account datums
  const victim2AccountDatum = Data.from(gameData.victim2AccountUtxo.datum!, AccountDatum);

  // Calculate new balance after cheque redemption
  const newVictim2Balance = victim2AccountDatum.balance - chequeAmount;

  // Build the cheque redeemer
  const chequeRedeemer = createDecreaseBalanceByChequeRedeemer(
    chequeAmount,
    cheque.key,
    cheque.signature
  );

  const tx = await lucid
    .newTx()
    // Spend victim2's account using the cheque
    .collectFrom([gameData.victim2AccountUtxo], chequeRedeemer)
    .attach.SpendingValidator(gameData.accountValidator)
    // Spend the bank UTxO
    .collectFrom([gameData.bankUtxo], Data.void())
    .attach.SpendingValidator(gameData.bankValidator)
    // Reference the config
    .readFrom([gameData.configUtxo])
    // Recreate the bank UTxO with reduced funds (withdrawal)
    .pay.ToContract(
      gameData.bankAddress,
      { kind: 'inline', value: Data.void() },
      { lovelace: gameData.bankUtxo.assets.lovelace - chequeAmount }
    )
    // Recreate victim2's account with updated balance
    .pay.ToContract(
      gameData.accountAddress,
      { kind: 'inline', value: createAccountDatum(newVictim2Balance, gameData.victim2Pkh) },
      { lovelace: 2_000_000n, [gameData.accountAsset]: 1n }
    )
    .complete();

  const signedTx = await tx.sign.withWallet().complete();
  const txHash = await signedTx.submit();
  await awaitTxConfirms(lucid, txHash);

  console.log(
    `Successfully redeemed ${chequeAmount / 1_000_000n} ADA cheque from Victim 2's account${getFormattedTxDetails(txHash, lucid)}`
  );

  /**
   * HINT (Base64): SG93IGRvZXMga2V5IGluIHRoZSByZWRlZW1lciwgdXNlZCB0byB2ZXJpZnkgdGhlIGNoZXF1ZSBzaWduYXR1cmUsIHJlbGF0ZSB0byB0aGUgYWNjb3VudCBvd25lcj8=
   */

  // ================ YOUR CODE ENDS HERE

  return { lastBankTxHash: txHash };
}
