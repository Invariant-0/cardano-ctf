import { Data, LucidEvolution } from '@lucid-evolution/lucid';
import { awaitTxConfirms, getFormattedTxDetails } from '../../common/offchain/utils';
import { GameData, TestData } from './task';
import { AccountDatum, createAccountDatum, createDecreaseBalanceByChequeRedeemer } from './types';

export async function play(lucid: LucidEvolution, gameData: GameData): Promise<TestData> {
  /**
   * The bank is already initialized with:
   * - Your account with 20 ADA
   * - The victim's account with 30 ADA (shared a 20 ADA cheque with you)
   *
   * The [gameData] variable contains all the necessary components to interact with the bank,
   * including the signed cheque from the victim: gameData.chequeFromVictim
   */

  // ================ YOUR CODE STARTS HERE

  /**
   * GOAL: Find a way to drain the entire victim's account (30 ADA) using only the 20 ADA cheque.
   *
   * ........ if needed, there's a hint below
   */

  console.log(`Bank contains: ${gameData.bankUtxo.assets.lovelace / 1_000_000n} ADA`);
  console.log(`Your account balance: 20 ADA`);
  console.log(`Victim account balance: 30 ADA`);
  console.log(
    `\nYou have received a signed cheque from the victim for ${gameData.chequeFromVictim.amount / 1_000_000n} ADA`
  );

  /**
   * Example: Redeem the cheque from the victim to withdraw 20 ADA from their account.
   * This demonstrates the cheque feature working correctly (but does not exploit the vulnerability and does not pass the tests).
   */

  const cheque = gameData.chequeFromVictim;
  const chequeAmount = cheque.amount;

  // Get current account datum
  const victimAccountDatum = Data.from(gameData.victimAccountUtxo.datum!, AccountDatum);

  // Calculate new balance after cheque redemption
  const newVictimBalance = victimAccountDatum.balance - chequeAmount;

  // Build the cheque redeemer
  const chequeRedeemer = createDecreaseBalanceByChequeRedeemer(
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
    // Recreate victim's account with updated balance
    .pay.ToContract(
      gameData.accountAddress,
      { kind: 'inline', value: createAccountDatum(newVictimBalance, gameData.victimPkh) },
      { lovelace: 2_000_000n, [gameData.accountAsset]: 1n }
    )
    .complete();

  const signedTx = await tx.sign.withWallet().complete();
  const txHash = await signedTx.submit();
  await awaitTxConfirms(lucid, txHash);

  console.log(
    `Successfully redeemed ${chequeAmount / 1_000_000n} ADA cheque from victim's account${getFormattedTxDetails(txHash, lucid)}`
  );

  /**
   * HINT (Base64): V2hhdCBtYWtlcyBhIGNoZXF1ZSB1bmlxdWU/IENhbiBpdCBiZSB1c2VkIGFnYWluPw==
   */

  // ================ YOUR CODE ENDS HERE

  return { lastBankTxHash: txHash };
}
