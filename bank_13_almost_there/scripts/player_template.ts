import { Data, LucidEvolution } from '@lucid-evolution/lucid';
import { awaitTxConfirms, getFormattedTxDetails } from '../../common/offchain/utils';
import { GameData, TestData } from './task';
import { AccountDatum, createAccountDatum, createDecreaseBalanceByChequeRedeemer } from './types';

export async function play(lucid: LucidEvolution, gameData: GameData): Promise<TestData> {
  /**
   * The bank is already initialized with:
   * - The victim's account with 40 ADA (has 3 valid cheque ids: 1, 2, 3)
   * - No player account
   *
   * The [gameData] variable contains all the necessary components to interact with the bank,
   * including the signed cheque from the victim: gameData.chequeFromVictim
   * The cheque is for 20 ADA and uses cheque ID 1.
   */

  // ================ YOUR CODE STARTS HERE

  /**
   * GOAL: Find a way to drain the entire victim's account (40 ADA) using only the 20 ADA cheque.
   *
   * ........ if needed, there's a hint below
   */

  console.log(`Bank contains: ${gameData.bankUtxo.assets.lovelace / 1_000_000n} ADA`);
  console.log(`Victim account balance: 40 ADA`);
  console.log(`Victim has valid cheque IDs: 1, 2, 3`);
  console.log(
    `\nYou have received a signed cheque from the victim for ${gameData.chequeFromVictim.amount / 1_000_000n} ADA (ID: ${gameData.chequeFromVictim.id})`
  );

  /**
   * Example: Redeem the cheque from the victim to withdraw 20 ADA from their account.
   * This demonstrates the cheque feature working correctly (but does not exploit the vulnerability and does not pass the tests).
   */

  const cheque = gameData.chequeFromVictim;
  const chequeAmount = cheque.amount;
  const chequeId = cheque.id;

  // Get current account datum
  const victimAccountDatum = Data.from(gameData.victimAccountUtxo.datum!, AccountDatum);

  // Calculate new balance after cheque redemption
  const newVictimBalance = victimAccountDatum.balance - chequeAmount;

  // The cheque ID will be removed from valid_cheque_ids after redemption
  const newValidChequeIds = victimAccountDatum.valid_cheque_ids.filter((id) => id !== chequeId);

  // Build the cheque redeemer
  const chequeRedeemer = createDecreaseBalanceByChequeRedeemer(
    chequeId,
    chequeAmount,
    cheque.key,
    cheque.signature
  );

  const tx = await lucid
    .newTx()
    // Spend victim's account using the cheque
    .collectFrom([gameData.victimAccountUtxo], chequeRedeemer)
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
    // Recreate victim's account with updated balance and removed cheque ID
    .pay.ToContract(
      gameData.accountAddress,
      {
        kind: 'inline',
        value: createAccountDatum(newVictimBalance, gameData.victimPkh, newValidChequeIds),
      },
      { lovelace: 2_000_000n, [gameData.accountAsset]: 1n }
    )
    .complete();

  const signedTx = await tx.sign.withWallet().complete();
  const txHash = await signedTx.submit();
  await awaitTxConfirms(lucid, txHash);

  console.log(
    `Successfully redeemed ${chequeAmount / 1_000_000n} ADA cheque (ID: ${chequeId}) from victim's account${getFormattedTxDetails(txHash, lucid)}`
  );
  console.log(`Remaining valid cheque IDs: ${newValidChequeIds.join(', ')}`);

  /**
   * HINT (Base64): V2hhdCBpcyBhY3R1YWxseSBzaWduZWQgaW4gdGhlIGNoZXF1ZT8gSXMgdGhlIGNoZXF1ZSBJRCBwYXJ0IG9mIGl0Pw==
   */

  // ================ YOUR CODE ENDS HERE

  return { lastBankTxHash: txHash };
}
