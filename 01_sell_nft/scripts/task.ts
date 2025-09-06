import {
  Constr,
  Data,
  fromText,
  LucidEvolution,
  MintingPolicy,
  OutRef,
  Script,
  SpendingValidator,
  UTxO,
} from '@lucid-evolution/lucid';

import { UNIQUE_ID } from '../../common/offchain/setup_lucid';
import {
  failTest,
  failTests,
  passAllTests,
  passTest,
  submitSolutionRecord,
} from '../../common/offchain/test_utils';

import {
  awaitTxConfirms,
  decodeBase64,
  filterUTXOsByTxHash,
  FIXED_MIN_ADA,
  getFormattedTxDetails,
  getWalletBalanceLovelace,
  setupMintingPolicy,
  setupValidator,
} from '../../common/offchain/utils';
import { createSellNFTDatumSchema, SellNFTDatum } from './types';
import blueprint from '../plutus.json' with { type: 'json' };

export type Validators = {
  lockingValidator: SpendingValidator;
  lockingAddress: string;
  sellNFT: SpendingValidator;
  sellingAddress: string;
  nftPolicy1: MintingPolicy;
  nftPolicyId1: string;
  nftPolicy2: MintingPolicy;
  nftPolicyId2: string;
};
export type GameData = {
  scriptValidator: Script;
  scriptAddress: string;
  scriptUtxos: UTxO[];
  assets: string[];
  seller: string;
  originalBalance: bigint;
};
export type TestData = void;

function readValidators(
  lucid: LucidEvolution,
  outputReference: OutRef,
  tokenName1: string,
  tokenName2: string
): Validators {
  const lock = setupValidator(lucid, blueprint, 'locked.always_fails');
  const sell = setupValidator(lucid, blueprint, 'nft_sell.buy');

  const outRef = new Constr(0, [
    new Constr(0, [outputReference.txHash]),
    BigInt(outputReference.outputIndex),
  ]);
  const mintNFT1 = setupMintingPolicy(lucid, blueprint, 'nft.unique_nft', [
    fromText(tokenName1),
    outRef,
  ]);
  const mintNFT2 = setupMintingPolicy(lucid, blueprint, 'nft.unique_nft', [
    fromText(tokenName2),
    outRef,
  ]);

  return {
    lockingValidator: lock.validator,
    lockingAddress: lock.address,
    sellNFT: sell.validator,
    sellingAddress: sell.address,
    nftPolicy1: mintNFT1.policy,
    nftPolicyId1: mintNFT1.policyId,
    nftPolicy2: mintNFT2.policy,
    nftPolicyId2: mintNFT2.policyId,
  };
}

export async function setup(lucid: LucidEvolution) {
  console.log(`=== SETUP IN PROGRESS ===`);

  const tokenName1 = `${UNIQUE_ID} -- NFT1`;
  const token1Price = 50000000n; // 50 ADA
  const tokenName2 = `${UNIQUE_ID} -- NFT2`;
  const token2Price = 40000000n; // 40 ADA
  const utxosAtBeginning = await lucid?.wallet().getUtxos();
  const nftOriginUtxo = utxosAtBeginning[0];
  const outputReference = {
    txHash: nftOriginUtxo.txHash,
    outputIndex: nftOriginUtxo.outputIndex,
  };

  // Compile and setup the validators
  const validators = readValidators(lucid, outputReference, tokenName1, tokenName2);

  const assetName1 = `${validators.nftPolicyId1}${fromText(tokenName1)}`;
  const assetName2 = `${validators.nftPolicyId2}${fromText(tokenName2)}`;
  const seller = 'addr_test1vzztaxzsletuxldhd6ucyugn5uaye0qeumes3zt03q9xd4qe52pp4';

  const mintRedeemer = Data.void();
  console.log('Minting NFTs and locking them into a vulnerable contract...');
  const tx = await lucid
    .newTx()
    .collectFrom([nftOriginUtxo])
    .attach.MintingPolicy(validators.nftPolicy1)
    .attach.MintingPolicy(validators.nftPolicy2)
    .mintAssets({ [assetName1]: BigInt(1) }, mintRedeemer)
    .mintAssets({ [assetName2]: BigInt(1) }, mintRedeemer)
    .pay.ToContract(
      validators.sellingAddress,
      { kind: 'inline', value: createSellNFTDatumSchema(seller, token1Price)! },
      { [assetName2]: BigInt(1), lovelace: FIXED_MIN_ADA }
    )
    .pay.ToContract(
      validators.sellingAddress,
      { kind: 'inline', value: createSellNFTDatumSchema(seller, token2Price)! },
      { [assetName1]: BigInt(1), lovelace: FIXED_MIN_ADA }
    )
    .complete();
  const signedTx = await tx.sign.withWallet().complete();
  const txHash = await signedTx.submit();
  console.log('Setup transaction was submitted to testnet, awaiting confirmations!');
  await awaitTxConfirms(lucid, txHash);
  console.log(`NFTs were minted${getFormattedTxDetails(txHash, lucid)}`);

  const scriptUtxos = filterUTXOsByTxHash(await lucid.utxosAt(validators.sellingAddress), txHash);

  const originalBalance = await getWalletBalanceLovelace(lucid);
  console.log(`Your wallet's balance after setup is ${originalBalance}`);

  console.log(`=== SETUP WAS SUCCESSFUL ===`);

  return {
    scriptValidator: validators.sellNFT,
    scriptAddress: validators.sellingAddress,
    scriptUtxos: scriptUtxos,
    assets: [assetName1, assetName2],
    seller: seller,
    originalBalance: originalBalance,
  };
}

export async function test(
  lucid: LucidEvolution,
  gameData: GameData,
  _testData: TestData
): Promise<boolean> {
  let passed = true;
  console.log('================TESTS==================');

  const usersUTxOs = await lucid.utxosAt(await lucid.wallet().address());
  const endBalance = await getWalletBalanceLovelace(lucid);

  console.log(`Your wallet's balance at the end is ${endBalance}`);

  const asset1 = gameData.assets[0];
  const asset2 = gameData.assets[1];

  // 1. Test that NFT1 is on user's address
  const nft1InUsersWallet = usersUTxOs.some((utxo) =>
    Object.prototype.hasOwnProperty.call(utxo.assets, asset1)
  );
  if (nft1InUsersWallet) {
    passTest(`TEST 1 PASSED - you bought NFT ${asset1}`, lucid);
  } else {
    failTest(`TEST 1 FAILED - you did not buy NFT ${asset1}`);
    passed = false;
  }

  //2. Test that NFT2 is on user's address
  const nft2InUsersWallet = usersUTxOs.some((utxo) =>
    Object.prototype.hasOwnProperty.call(utxo.assets, asset2)
  );
  if (nft2InUsersWallet) {
    passTest(`TEST 2 PASSED - you bought NFT ${asset2}`, lucid);
  } else {
    failTest(`TEST 2 FAILED - you did not buy NFT ${asset2}`);
    passed = false;
  }

  //3. Test that the user did not pay the full amounts for both UTxOs

  if (gameData.scriptUtxos[0].datum === null || gameData.scriptUtxos[1].datum === null) {
    throw new Error('UTxO object does not contain a datum.');
  }

  const datum1 = Data.from(gameData.scriptUtxos[0].datum!, SellNFTDatum);
  const datum2 = Data.from(gameData.scriptUtxos[1].datum!, SellNFTDatum);

  const spentFunds = gameData.originalBalance - endBalance;

  if (spentFunds < datum1.price + datum2.price) {
    passTest(`TEST 3 PASSED - you spent less than the price of both NFTs`, lucid);
  } else {
    failTest(`TEST 3 FAILED - you spent too much ADA!`);
    passed = false;
  }

  if (passed) {
    await submitSolutionRecord(lucid, 1n);

    const encodedBlogURL =
      'aHR0cHM6Ly9tZWRpdW0uY29tL0BpbnZhcmlhbnQwL2NhcmRhbm8tdnVsbmVyYWJpbGl0aWVzLTEtZG91YmxlLXNhdGlzZmFjdGlvbi0yMTlmMWJjOTY2NWU=';

    passAllTests(
      '\nCongratulations on the successful completion of the Level 01: Sell NFT\n' +
        `You can read more about the underlying vulnerability in this blog post: ${decodeBase64(
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
