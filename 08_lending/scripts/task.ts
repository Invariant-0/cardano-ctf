import {
  Data,
  LucidEvolution,
  MintingPolicy,
  PrivateKey,
  SpendingValidator,
  UTxO,
} from '@lucid-evolution/lucid';
import { getAddressDetails, generatePrivateKey } from '@lucid-evolution/utils';
import {
  awaitTxConfirms,
  decodeBase64,
  filterUTXOsByTxHash,
  FIXED_MIN_ADA,
  getFormattedTxDetails,
  getWalletBalanceLovelace,
  resetWallet,
  setupMintingPolicy,
  setupValidator,
} from '../../common/offchain/utils';
import { createLendingDatum, LendingDatum, LendingRedeemer } from './types';
import blueprint from '../plutus.json' with { type: 'json' };
import {
  failTest,
  failTests,
  passAllTests,
  passTest,
  submitSolutionRecord,
} from '../../common/offchain/test_utils';

export type Validators = {
  collateralPolicy: MintingPolicy;
  collateralPolicyId: string;
  lendingValidator: SpendingValidator;
  lendingAddress: string;
};
export type Wallet = {
  privateKey: PrivateKey;
  address: string;
  lendingUTxOs: UTxO[];
  hash: string;
  collateralAsset: string;
};
export type GameData = {
  validators: Validators;
  wallets: Wallet[];
  originalBalance: bigint;
};
export type TestData = void;

function readValidators(lucid: LucidEvolution): Validators {
  const collateralToken = setupMintingPolicy(lucid, blueprint, 'collateral_token.collateral_token');
  const lending = setupValidator(lucid, blueprint, 'lending.lending');

  return {
    collateralPolicy: collateralToken.policy,
    collateralPolicyId: collateralToken.policyId,
    lendingValidator: lending.validator,
    lendingAddress: lending.address,
  };
}

async function checkWalletValidity(lucid: LucidEvolution, gameData: GameData, wallet: Wallet) {
  const privateKey = wallet.privateKey;
  await lucid.selectWallet.fromPrivateKey(privateKey);
  const address = await lucid.wallet().address();
  const sigHash = getAddressDetails(address).paymentCredential?.hash;
  if (sigHash === undefined) {
    throw new Error('The signature hash of provided wallet was undefined.');
  }
  if (
    wallet.address !== address ||
    wallet.hash !== sigHash ||
    wallet.collateralAsset !== `${gameData.validators.collateralPolicyId}${sigHash}`
  ) {
    throw new Error(
      'Wallet provided to askForRepayment() was compromised. This is not the intended exploit!'
    );
  }
  resetWallet(lucid);
}

/**
 * @param lucid
 * @param gameData
 * @param wallet The wallet of the borrower connected to his [utxos]. See [GameData.wallets].
 * @param utxos Lending UTxOs that are to be repaid by the borrowers. Can contain multiple UTxOs but they need to belong to a single borrower.
 * @returns Lending UTxOs that resulted from the transaction repaying [utxos].
 */
export async function askForRepayment(
  lucid: LucidEvolution,
  gameData: GameData,
  wallet: Wallet,
  utxos: UTxO[]
): Promise<UTxO[]> {
  const lenderAddress = await lucid.wallet().address();

  await checkWalletValidity(lucid, gameData, wallet);

  lucid.selectWallet.fromPrivateKey(wallet.privateKey);

  const initialRepayTx = lucid
    .newTx()
    .attach.SpendingValidator(gameData.validators.lendingValidator)
    .collectFrom(utxos, Data.to('Repay', LendingRedeemer));

  const repayTx = utxos.reduce((accTx, utxo) => {
    if (utxo.datum === null) {
      throw new Error('UTxO does not contain datum.');
    }
    if (!(wallet.collateralAsset in utxo.assets)) {
      throw new Error('UTxO does not contain expected collateral token.');
    }
    const datum = Data.from(utxo.datum!, LendingDatum);
    const repayment = datum.borrowed_amount + (datum.borrowed_amount * datum.interest) / 10000n;
    return accTx.pay.ToContract(
      gameData.validators.lendingAddress,

      {
        kind: 'inline',
        value: createLendingDatum(
          wallet.address,
          lenderAddress,
          datum.borrowed_amount,
          datum.interest,
          datum.loan_duration,
          datum.loan_end,
          datum.collateral.policy_id,
          datum.collateral.asset_name,
          true,
          datum.unique_id
        ),
      },
      { lovelace: repayment }
    );
  }, initialRepayTx);

  const completedRTx = await repayTx.addSigner(wallet.address).complete();
  const signedRTx = await completedRTx.sign.withWallet().complete();
  const repayTxHash = await signedRTx.submit();

  console.log(`Provided UTxOs were repaid in full${getFormattedTxDetails(repayTxHash, lucid)}`);

  await awaitTxConfirms(lucid, repayTxHash);

  resetWallet(lucid);

  return filterUTXOsByTxHash(await lucid.utxosAt(gameData.validators.lendingAddress), repayTxHash);
}

export async function setup(lucid: LucidEvolution) {
  console.log(`=== SETUP IN PROGRESS ===`);

  const currentBalance = await getWalletBalanceLovelace(lucid);
  if (currentBalance < 120000000) {
    throw new Error(
      'Your wallet contains insufficient funds for this level. At least 120 ADA is needed. Use a faucet to obtain additional ADA.'
    );
  }

  const validators = readValidators(lucid);

  const borrower1PK = generatePrivateKey();
  await lucid.selectWallet.fromPrivateKey(borrower1PK);
  const borrower1Address = await lucid.wallet().address();
  const borrower1Hash = getAddressDetails(borrower1Address).paymentCredential!.hash;
  const borrower2PK = generatePrivateKey();
  await lucid.selectWallet.fromPrivateKey(borrower2PK);
  const borrower2Address = await lucid.wallet().address();
  const borrower2Hash = getAddressDetails(borrower2Address).paymentCredential!.hash;

  const borrower1Wallet: Wallet = {
    privateKey: borrower1PK,
    address: borrower1Address,
    lendingUTxOs: [],
    hash: borrower1Hash,
    collateralAsset: `${validators.collateralPolicyId}${borrower1Hash}`,
  };
  const borrower2Wallet: Wallet = {
    privateKey: borrower2PK,
    address: borrower2Address,
    lendingUTxOs: [],
    hash: borrower2Hash,
    collateralAsset: `${validators.collateralPolicyId}${borrower2Hash}`,
  };

  resetWallet(lucid);

  const fundBorrowersTx = await lucid
    .newTx()
    .pay.ToAddress(borrower1Address, { lovelace: 50000000n })
    .pay.ToAddress(borrower2Address, { lovelace: 50000000n })
    .complete();
  const signedFBTx = await fundBorrowersTx.sign.withWallet().complete();
  const submittedFBTx = await signedFBTx.submit();
  console.log(`Funding borrowers' wallets with ADA${getFormattedTxDetails(submittedFBTx, lucid)}`);
  await awaitTxConfirms(lucid, submittedFBTx);

  let uniqueId = 0;
  const borrowedAmounts = [
    5300000n,
    5600000n,
    4700000n,
    6300000n,
    7900000n,
    4600000n,
    4200000n,
    3300000n,
  ];
  const interests = [320n, 700n, 860n, 690n, 830n, 650n, 100n, 770n];
  const durations = [
    5280000000n,
    7080000000n,
    4260000000n,
    1800000000n,
    1380000000n,
    6840000000n,
    4200000000n,
    4620000000n,
  ];
  for (const wallet of [borrower1Wallet, borrower2Wallet]) {
    lucid.selectWallet.fromPrivateKey(wallet.privateKey);
    let createLendingsTx = lucid
      .newTx()
      .attach.MintingPolicy(validators.collateralPolicy)
      .mintAssets({ [wallet.collateralAsset]: 4n }, Data.void())
      .addSigner(wallet.address);
    for (let i = 0; i < 4; i++) {
      createLendingsTx = createLendingsTx.pay.ToContract(
        validators.lendingAddress,

        {
          kind: 'inline',
          value: createLendingDatum(
            wallet.address,
            null,
            borrowedAmounts[uniqueId],
            interests[uniqueId],
            durations[uniqueId],
            null,
            validators.collateralPolicyId,
            wallet.hash,
            false,
            BigInt(uniqueId)
          ),
        },
        { [wallet.collateralAsset]: 1n, lovelace: FIXED_MIN_ADA }
      );
      uniqueId++;
    }
    const completedTx = await createLendingsTx.complete();
    const signedTx = await completedTx.sign.withWallet().complete();
    const submittedTx = await signedTx.submit();

    console.log(
      `Loan requests created for wallet: ${wallet.address}${getFormattedTxDetails(
        submittedTx,
        lucid
      )}`
    );
    await awaitTxConfirms(lucid, submittedTx);

    wallet.lendingUTxOs = filterUTXOsByTxHash(
      await lucid.utxosAt(validators.lendingAddress),
      submittedTx
    );
  }

  resetWallet(lucid);

  const originalBalance = await getWalletBalanceLovelace(lucid);
  console.log(`Your wallet's balance after setup is ${originalBalance}`);

  console.log(`=== SETUP WAS SUCCESSFUL ===`);

  return {
    validators,
    wallets: [borrower1Wallet, borrower2Wallet],
    originalBalance,
  };
}

export async function test(
  lucid: LucidEvolution,
  gameData: GameData,
  _testData: TestData
): Promise<boolean> {
  let passed = true;
  const endBalance = await getWalletBalanceLovelace(lucid);
  console.log('================TESTS==================');

  const profit = endBalance - gameData.originalBalance;
  console.log(`You have made a profit of ${profit} lovelace`);

  if (profit < 4000000n) {
    failTest('TEST 1 FAILED -- Your wallet did not obtain enough additional ADA');
    passed = false;
  } else {
    passTest("TEST 1 PASSED -- You've made a big profit, enjoy!", lucid);
  }

  if (passed) {
    await submitSolutionRecord(lucid, 8n);

    const encodedBlogURL =
      'aHR0cHM6Ly9tZWRpdW0uY29tL0BpbnZhcmlhbnQwL2NhcmRhbm8tY3RmLWhpbnRzLWFuZC1zb2x1dGlvbnMtZTM5OTFjZTZhOTQ0';

    passAllTests(
      '\nCongratulations on the successful completion of the Level 08: Lending\n' +
        `You can compare your solution with ours by reading this blog post: ${decodeBase64(
          encodedBlogURL
        )}` +
        '\nGood luck with the next level.',
      lucid
    );

    return true;
  } else {
    failTests();
    return false;
  }
}
