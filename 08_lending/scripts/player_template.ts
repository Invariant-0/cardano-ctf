import { Data, LucidEvolution } from '@lucid-evolution/lucid';
import { createLendingDatum, LendingDatum, LendingRedeemer } from './types';
import {
  awaitTxConfirms,
  filterUTXOsByTxHash,
  FIXED_MIN_ADA,
  getCurrentTime,
  getFormattedTxDetails,
  minute,
} from '../../common/offchain/utils';
import { askForRepayment, GameData, TestData } from './task';

export async function play(lucid: LucidEvolution, gameData: GameData): Promise<TestData> {
  /**
   * The smart contracts are already deployed, see the [run.ts] file for more details.
   *
   * The [gameData] variable contains all the things you need for the interaction with the smart contract.
   * But it also contains private keys for the two borrowers. You are not supposed to use these keys.
   * The solution to the task does not utilize these keys.
   *
   * The lending smart contract simulates the interaction between a lender (you) and a borrower (some other party).
   * To simulate the borrower you can use the function askForRepayment() that is imported. This function simulates a borrower
   * that wants to get back their own collateral token and will therefore repay the loan if such a lending UTxO supplied
   * contains his collateral token. The intended vulnerability is not located within this function so don't abuse it
   * while solving the level.
   */

  // ================ YOUR CODE STARTS HERE

  /**
   * HAPPY PATH -- An example interaction with the lending script.
   * In the code that is currently here, we:
   * 1. Choose one lending UTxO (a loan request) and fullfil its requirements (lend to the borrower).
   * 2. Ask for its repayment using the askForRepayment() function.
   * 3. Claim the repaid ADA earning the interest in the process.
   */

  const ownAddress = await lucid.wallet().address();

  const borrowerWallet = gameData.wallets[0];
  const lendUTxO = borrowerWallet.lendingUTxOs[0];
  if (lendUTxO?.datum === null) {
    throw new Error('UTxO object does not exists or does not contain datum.');
  }
  const lendDatum = Data.from(lendUTxO.datum!, LendingDatum);
  const validationRangeTo = getCurrentTime(lucid) + 10 * minute();

  const lendTx = await lucid
    .newTx()
    .attach.SpendingValidator(gameData.validators.lendingValidator)
    .validTo(validationRangeTo)
    .collectFrom([lendUTxO], Data.to('Lend', LendingRedeemer))
    .pay.ToContract(
      gameData.validators.lendingAddress,
      {
        kind: 'inline',
        value: createLendingDatum(
          borrowerWallet.address,
          ownAddress,
          lendDatum.borrowed_amount,
          lendDatum.interest,
          lendDatum.loan_duration,
          BigInt(validationRangeTo) + lendDatum.loan_duration,
          lendDatum.collateral.policy_id,
          lendDatum.collateral.asset_name,
          false,
          lendDatum.unique_id
        ),
      },
      { [borrowerWallet.collateralAsset]: 1n, lovelace: FIXED_MIN_ADA }
    )
    .pay.ToAddress(borrowerWallet.address, {
      lovelace: lendDatum.borrowed_amount,
    })
    .complete();

  const signedTx = await lendTx.sign.withWallet().complete();

  const lendTxHash = await signedTx.submit();

  console.log(`ADA was successfully lent${getFormattedTxDetails(lendTxHash, lucid)}`);

  await awaitTxConfirms(lucid, lendTxHash);

  const UTxOsForRepayment = filterUTXOsByTxHash(
    await lucid.utxosAt(gameData.validators.lendingAddress),
    lendTxHash
  );

  const repaidUTxOs = await askForRepayment(lucid, gameData, borrowerWallet, UTxOsForRepayment);

  const claimTx = await lucid
    .newTx()
    .attach.SpendingValidator(gameData.validators.lendingValidator)
    .collectFrom(repaidUTxOs, Data.to('ClaimRepayment', LendingRedeemer))
    .addSigner(ownAddress)
    .complete();
  const signedCTx = await claimTx.sign.withWallet().complete();
  const claimTxHash = await signedCTx.submit();

  console.log(`Claiming the repayments${getFormattedTxDetails(claimTxHash, lucid)}`);

  await awaitTxConfirms(lucid, claimTxHash);

  // ================ YOUR CODE ENDS HERE
}
