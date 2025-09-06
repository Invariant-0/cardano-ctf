import {
  Constr,
  Data,
  fromText,
  LucidEvolution,
  MintingPolicy,
  PrivateKey,
  SpendingValidator,
  UTxO,
} from '@lucid-evolution/lucid';
import { generatePrivateKey } from '@lucid-evolution/utils';
import {
  awaitTxConfirms,
  decodeBase64,
  filterUTXOsByTxHash,
  fundWallet,
  getFormattedTxDetails,
  getWalletBalanceLovelace,
  privateKeyToPubKeyHash,
  pubKeyHashToAddress,
  resetWallet,
  setupMintingPolicy,
  setupValidator,
} from '../../common/offchain/utils';
import { createKingOfCardanoDatum, KingDatum, KingNFTRedeemer, KingRedeemer } from './types';
import blueprint from '../plutus.json' with { type: 'json' };
import { getBech32FromAddress } from '../../common/offchain/types';
import {
  failTest,
  failTests,
  passAllTests,
  passTest,
  submitSolutionRecord,
} from '../../common/offchain/test_utils';

export type Validators = {
  uniqueNFTPolicy: MintingPolicy;
  uniqueNFTAsset: string;
  kingNFTPolicy: MintingPolicy;
  kingNFTPolicyId: string;
  kingOfCardanoValidator: SpendingValidator;
  kingOfCardanoAddress: string;
};

type Admin = {
  adminPrivateKey: PrivateKey;
  adminPubKeyHash: string;
};

export type GameData = {
  validators: Validators;
  kingUTxO: UTxO;
  // Do not use [_admin] in your solution. It is here so that it can be passed to test().
  // The solution to the task does not utilize it in any way.
  _admin: Admin;
};
export type TestData = {
  overthrowTxHash: string;
  nick: string;
};

function readValidators(
  lucid: LucidEvolution,
  bootstrapUTxO: UTxO,
  adminPubKeyHash: string
): Validators {
  const uniqueNFTAssetName = 'VALID';
  const bootstrapUTxORefParameter = new Constr(0, [
    new Constr(0, [bootstrapUTxO.txHash]),
    BigInt(bootstrapUTxO.outputIndex),
  ]);
  const uniqueNFT = setupMintingPolicy(lucid, blueprint, 'unique_nft.unique_nft', [
    fromText(uniqueNFTAssetName),
    bootstrapUTxORefParameter,
  ]);
  const kingOfCardano = setupValidator(lucid, blueprint, 'king_of_cardano.king_of_cardano', [
    adminPubKeyHash,
    uniqueNFT.policyId,
    fromText(uniqueNFTAssetName),
  ]);
  const kingNFT = setupMintingPolicy(lucid, blueprint, 'king_nft.king_nft', [
    kingOfCardano.hash,
    uniqueNFT.policyId,
    fromText(uniqueNFTAssetName),
  ]);

  return {
    uniqueNFTPolicy: uniqueNFT.policy,
    uniqueNFTAsset: `${uniqueNFT.policyId}${fromText(uniqueNFTAssetName)}`,
    kingNFTPolicy: kingNFT.policy,
    kingNFTPolicyId: kingNFT.policyId,
    kingOfCardanoValidator: kingOfCardano.validator,
    kingOfCardanoAddress: kingOfCardano.address,
  };
}

export async function setup(lucid: LucidEvolution) {
  console.log(`=== SETUP IN PROGRESS ===`);

  const adminPrivateKey = generatePrivateKey();
  const adminPubKeyHash = privateKeyToPubKeyHash(adminPrivateKey).to_hex();
  const adminAddress = pubKeyHashToAddress(privateKeyToPubKeyHash(adminPrivateKey));

  await fundWallet(lucid, adminAddress, 10000000n);

  const utxosAtBeginning = await lucid.wallet().getUtxos();
  const bootstrapUTxO = utxosAtBeginning[0];

  const validators = readValidators(lucid, bootstrapUTxO, adminPubKeyHash);
  const initialKingUTxOFunds = 5000000n;
  const initialKingAddress = 'addr_test1vrvpqazgry8p3lahfhwssx5hywl6m045wtjwjy98rqhraegvk9r78';

  const setupTx = await lucid
    .newTx()
    .collectFrom([bootstrapUTxO])
    .mintAssets({ [validators.uniqueNFTAsset]: BigInt(1) }, Data.void())
    .attach.MintingPolicy(validators.uniqueNFTPolicy)
    .pay.ToContract(
      validators.kingOfCardanoAddress,
      { kind: 'inline', value: createKingOfCardanoDatum(initialKingAddress, false) },
      {
        lovelace: initialKingUTxOFunds,
        [validators.uniqueNFTAsset]: BigInt(1),
      }
    )
    .complete();

  const signedSetupTx = await setupTx.sign.withWallet().complete();
  const submittedSetupTx = await signedSetupTx.submit();
  console.log(
    `King of Cardano setup transaction was submitted${getFormattedTxDetails(
      submittedSetupTx,
      lucid
    )}`
  );
  await awaitTxConfirms(lucid, submittedSetupTx);

  const kingUTxO = filterUTXOsByTxHash(
    await lucid.utxosAt(validators.kingOfCardanoAddress),
    submittedSetupTx
  )[0];

  const originalBalance = await getWalletBalanceLovelace(lucid);
  console.log(`Your wallet's balance after setup is ${originalBalance}`);

  console.log(`=== SETUP WAS SUCCESSFUL ===`);

  return {
    validators,
    kingUTxO,
    _admin: { adminPrivateKey, adminPubKeyHash },
  };
}

export async function test(
  lucid: LucidEvolution,
  gameData: GameData,
  testData: TestData
): Promise<boolean> {
  console.log('============STARTING TESTS=============');
  const { validators } = gameData;
  const { kingOfCardanoAddress } = validators;

  let passed = true;

  const kingUTxO = filterUTXOsByTxHash(
    await lucid.utxosAt(kingOfCardanoAddress),
    testData.overthrowTxHash
  )[0];

  // Test 1 -- The wallet should have enough ADA to comfortably overthrow the current king
  const endBalance = BigInt(await getWalletBalanceLovelace(lucid));
  const lovelaceInKingUTxO = BigInt(kingUTxO.assets['lovelace']);

  const kingDatum = Data.from(kingUTxO.datum!, KingDatum);
  const enoughAdaLeft = endBalance > 10n * lovelaceInKingUTxO;
  if (enoughAdaLeft) {
    passTest(`TEST 1 PASSED - Enough ADA left in wallet`, lucid);
  } else {
    failTest(
      `TEST 1 FAILED - Please leave more ADA inside the wallet (use faucet to get more if necessary)`
    );
    passed = false;
  }

  // Test 2 -- Competition is not yet closed
  if (kingDatum.competition_closed === false) {
    passTest(`TEST 2 PASSED - The competition is not yet closed`, lucid);
  } else {
    failTest(
      `TEST 2 FAILED - You closed the competition. You should not do that. The mechanism is there just for us to simulate the passage of time.`
    );
    passed = false;
  }

  // Test 3 -- We are going to try to overthrow the king (presumably yourself).
  try {
    const currentKingAddress = getBech32FromAddress(lucid, kingDatum.current_king);
    console.log('We are going to try to overthrow the current king (presumably yourself).');

    const txTest3 = await lucid
      .newTx()
      .collectFrom([kingUTxO], Data.to('OverthrowKing', KingRedeemer))
      .pay.ToContract(
        kingOfCardanoAddress,
        {
          kind: 'inline',
          value: createKingOfCardanoDatum(
            'addr_test1vrvpqazgry8p3lahfhwssx5hywl6m045wtjwjy98rqhraegvk9r78',
            false
          ),
        },
        {
          lovelace: lovelaceInKingUTxO + 5000000n,
          [validators.uniqueNFTAsset]: BigInt(1),
        }
      )
      .pay.ToAddress(currentKingAddress, { lovelace: lovelaceInKingUTxO })
      .attach.SpendingValidator(validators.kingOfCardanoValidator)
      .complete();
    const signedTxTest3 = await txTest3.sign.withWallet().complete();
    const txHashTest3 = await signedTxTest3.submit();
    console.log(`Test 3, Overthrow Tx submitted${getFormattedTxDetails(txHashTest3, lucid)}`);
    await awaitTxConfirms(lucid, txHashTest3);

    // Fail test and skip further tests as they depend on this overthrow attempt failing
    failTest(`TEST 3 FAILED - It was possible to overthrow you as the king.`);
    passed = false;
    failTests();
    return false;
  } catch (e) {
    passTest(`TEST 3 PASSED - It was not possible to overthrow you.`, lucid);
    console.log('The error thanks to which you passed test 3: ' + e);
  }

  // We now simulate the passage of time. The admin closes the competition.

  const newDatum = {
    current_king: kingDatum.current_king,
    competition_closed: true,
  };
  lucid.selectWallet.fromPrivateKey(gameData._admin.adminPrivateKey);

  const closingTx = await lucid
    .newTx()
    .collectFrom([kingUTxO], Data.to('CloseCompetition', KingRedeemer))
    .pay.ToContract(
      kingOfCardanoAddress,
      { kind: 'inline', value: Data.to(newDatum, KingDatum) },
      {
        lovelace: lovelaceInKingUTxO,
        [validators.uniqueNFTAsset]: BigInt(1),
      }
    )
    .addSignerKey(gameData._admin.adminPubKeyHash)
    .attach.SpendingValidator(validators.kingOfCardanoValidator)
    .complete();

  const signedClosingTx = await closingTx.sign.withWallet().complete();
  const closingTxHash = await signedClosingTx.submit();
  console.log(`CloseCompetition Tx submitted${getFormattedTxDetails(closingTxHash, lucid)}`);
  await awaitTxConfirms(lucid, closingTxHash);

  resetWallet(lucid);

  // TEST 4 -- We are now going to try to claim the King NFT for you!
  const competitionClosedUTxO = filterUTXOsByTxHash(
    await lucid.utxosAt(kingOfCardanoAddress),
    closingTxHash
  )[0];

  const kingAsset = `${validators.kingNFTPolicyId}${fromText(
    `${testData.nick} is King of Cardano`
  )}`;

  const mintTx = await lucid
    .newTx()
    .collectFrom([competitionClosedUTxO], Data.to('MintKingNFT', KingRedeemer))
    .mintAssets({ [kingAsset]: BigInt(1) }, Data.to(fromText(testData.nick), KingNFTRedeemer))
    .mintAssets({ [validators.uniqueNFTAsset]: BigInt(-1) }, Data.void())
    .attach.MintingPolicy(validators.kingNFTPolicy)
    .attach.MintingPolicy(validators.uniqueNFTPolicy)
    .attach.SpendingValidator(validators.kingOfCardanoValidator)
    .addSigner(await lucid.wallet().address())
    .complete();
  const signedMintTx = await mintTx.sign.withWallet().complete();
  const mintTxHash = await signedMintTx.submit();
  console.log(`MintKingNFT Tx submitted${getFormattedTxDetails(mintTxHash, lucid)}`);
  await awaitTxConfirms(lucid, mintTxHash);

  // Assert that the NFT is in your wallet
  const userUTxOs = await lucid.utxosAt(await lucid.wallet().address());
  const nftInWallet = userUTxOs.some((utxo) =>
    Object.prototype.hasOwnProperty.call(utxo.assets, kingAsset)
  );

  if (nftInWallet) {
    passTest(`TEST 4 PASSED - You are the King of Cardano and own the NFT!`, lucid);
  } else {
    failTest(`TEST 4 FAILED - It was not possible to claim the King of Cardano NFT for you :/.`);
  }

  if (passed) {
    await submitSolutionRecord(lucid, 10n);

    const encodedBlogURL =
      'aHR0cHM6Ly9tZWRpdW0uY29tL0BpbnZhcmlhbnQwL2NhcmRhbm8tY3RmLWhpbnRzLWFuZC1zb2x1dGlvbnMtZTM5OTFjZTZhOTQ0';

    passAllTests(
      '\nCongratulations on the successful completion of the Level 10: King of Cardano\n' +
        `You can compare your solution with ours by reading this blog post: ${decodeBase64(
          encodedBlogURL
        )}` +
        '\nPlease, let us know your thoughts on Discord or via email. We would love to know how you liked it!',
      lucid
    );

    return true;
  } else {
    failTests();
    return false;
  }
}
