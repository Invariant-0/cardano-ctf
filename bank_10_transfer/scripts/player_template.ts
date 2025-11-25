import { Data, LucidEvolution } from '@lucid-evolution/lucid';
import { awaitTxConfirms, getFormattedTxDetails } from '../../common/offchain/utils';
import { GameData, TestData } from './task';
import { AccountDatum, AccountRedeemer, createAccountDatum } from './types';

export async function play(lucid: LucidEvolution, gameData: GameData): Promise<TestData> {
  /**
   * The bank is already initialized with:
   * - Your account with 20 ADA
   * - Another user's account with 30 ADA
   *
   * The [gameData] variable contains all the necessary components to interact with the bank.
   */

  // ================ YOUR CODE STARTS HERE

  /**
   * GOAL: Find a way to drain the bank by exploiting a missing security check introduced during the refactor.
   *
   * The validators were refactored to support transfers between accounts. During this refactor,
   * a critical security assumption from earlier levels was missed. Bigger refactors like this
   * can be tricky, and it's easy to miss some past security assumptions that were previously enforced.
   *
   * ........ if needed, there's a hint below
   */

  console.log(`Bank contains: ${gameData.bankUtxo.assets.lovelace / 1_000_000n} ADA`);
  console.log(`Your account balance: 20 ADA`);
  console.log(`Victim account balance: 30 ADA`);

  /**
   * Example: Perform a valid transfer of 10 ADA from your account to the victim's account.
   * This demonstrates the transfer feature working correctly (but does not exploit the missing security check).
   */

  const transferAmount = 10_000_000n; // 10 ADA

  // Get current account datums
  const playerAccountDatum = Data.from(gameData.playerAccountUtxo.datum!, AccountDatum);
  const victimAccountDatum = Data.from(gameData.victimAccountUtxo.datum!, AccountDatum);

  // Calculate new balances after transfer
  const newPlayerBalance = playerAccountDatum.balance - transferAmount;
  const newVictimBalance = victimAccountDatum.balance + transferAmount;

  const tx = await lucid
    .newTx()
    // Spend both account inputs (transfer flow)
    .collectFrom([gameData.playerAccountUtxo], Data.to('DecreaseBalance', AccountRedeemer))
    .collectFrom([gameData.victimAccountUtxo], Data.to('IncreaseBalance', AccountRedeemer))
    .attach.SpendingValidator(gameData.accountValidator)
    // Spend the bank UTxO
    .collectFrom([gameData.bankUtxo], Data.void())
    .attach.SpendingValidator(gameData.bankValidator)
    // Reference the config
    .readFrom([gameData.configUtxo])
    .addSigner(gameData.playerAddress)
    // Recreate the bank UTxO (no change in funds for transfer)
    .pay.ToContract(
      gameData.bankAddress,
      { kind: 'inline', value: Data.void() },
      { lovelace: gameData.bankUtxo.assets.lovelace }
    )
    // Recreate both account outputs with updated balances
    .pay.ToContract(
      gameData.accountAddress,
      { kind: 'inline', value: createAccountDatum(newPlayerBalance, gameData.playerPkh) },
      { lovelace: 2_000_000n, [gameData.accountAsset]: 1n }
    )
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
    `Successfully transferred ${transferAmount / 1_000_000n} ADA from your account to the victim's account${getFormattedTxDetails(txHash, lucid)}`
  );

  /**
   * HINT Base64: V2hhdCBzZWN1cml0eSBjaGVjayBmcm9tIGVhcmxpZXIgbGV2ZWxzIGlzIG9ubHkgYXBwbGllZCB0byB0aGUgZmlyc3QgYWNjb3VudCBvdXRwdXQgaW4gdGhlIHRyYW5zZmVyIGZsb3c/Cg==
   */

  // ================ YOUR CODE ENDS HERE

  return { lastBankTxHash: txHash };
}
