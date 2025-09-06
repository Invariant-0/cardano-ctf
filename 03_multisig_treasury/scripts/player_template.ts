import { Data, LucidEvolution } from '@lucid-evolution/lucid';
import {
  awaitTxConfirms,
  filterUTXOsByTxHash,
  FIXED_MIN_ADA,
  getFormattedTxDetails,
} from '../../common/offchain/utils';
import { createMultisigDatum, createTreasuryDatum, MultisigRedeemer } from './types';
import { GameData, TestData } from './task';

export async function play(lucid: LucidEvolution, gameData: GameData): Promise<TestData> {
  /**
   * The smart contracts are already deployed, see the [run.ts] file for more details.
   * The [gameData] variable contains all the things you need to interact with the vulnerable smart contracts.
   */

  // ================ YOUR CODE STARTS HERE

  /**
   * HAPPY PATH -- example interaction with the multisig and treasury scripts.
   * In the code that is currently here, we:
   * 1. Sign the deployed multisig UTxO.
   * 2. Try to unlock the treasury and withdraw 8 ADA.
   *
   * The second transaction fails as the multisig contains only one signature (ours) of the two required.
   *
   * Note: Do NOT change anything in the gameData variable.
   */

  const ownAddress = await lucid.wallet().address();

  const signMultisigTx = await lucid
    .newTx()
    .collectFrom([gameData.multisigUTxO], Data.to('Sign', MultisigRedeemer))
    .pay.ToContract(
      gameData.validators.multisigAddress,
      {
        kind: 'inline',
        value: createMultisigDatum(
          BigInt(8000000),
          gameData.multisigBeneficiary,
          gameData.treasuryOwners,
          [ownAddress]
        ),
      },
      { lovelace: FIXED_MIN_ADA }
    )
    .attach.SpendingValidator(gameData.validators.multisigValidator)
    .addSigner(ownAddress)
    .complete();

  const signedMSTx = await signMultisigTx.sign.withWallet().complete();
  const submittedMSTx = await signedMSTx.submit();
  console.log(
    `Multisig signing transaction submitted${getFormattedTxDetails(submittedMSTx, lucid)}`
  );
  await awaitTxConfirms(lucid, submittedMSTx);

  const multisigUTxO = filterUTXOsByTxHash(
    await lucid.utxosAt(gameData.validators.multisigAddress),
    submittedMSTx
  );

  const treasuryBalance = gameData.treasuryFunds - gameData.multisigReleaseValue;

  const unlockTreasuryTx = await lucid
    .newTx()
    .collectFrom(multisigUTxO, Data.to('Use', MultisigRedeemer))
    .collectFrom([gameData.treasuryUTxO], Data.void())
    .pay.ToContract(
      gameData.validators.treasuryAddress,
      {
        kind: 'inline',
        value: createTreasuryDatum(treasuryBalance, gameData.treasuryOwners),
      },
      { lovelace: treasuryBalance }
    )
    .addSigner(ownAddress)
    .attach.SpendingValidator(gameData.validators.multisigValidator)
    .attach.SpendingValidator(gameData.validators.treasuryValidator)
    .complete();

  const signedUnlockTx = await unlockTreasuryTx.sign.withWallet().complete();
  const submittedUnlockTx = await signedUnlockTx.submit();
  console.log(
    `Access treasury signed transaction submitted${getFormattedTxDetails(submittedUnlockTx, lucid)}`
  );
  await awaitTxConfirms(lucid, submittedUnlockTx);

  // ================ YOUR CODE ENDS HERE
}
