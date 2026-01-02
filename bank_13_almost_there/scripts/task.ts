import {
  Data,
  LucidEvolution,
  MintingPolicy,
  SpendingValidator,
  UTxO,
} from '@lucid-evolution/lucid';
import {
  validatorToAddress,
  validatorToScriptHash,
  mintingPolicyToId,
  generatePrivateKey,
  getAddressDetails,
} from '@lucid-evolution/utils';
import {
  awaitTxConfirms,
  filterUTXOsByTxHash,
  getWalletBalanceLovelace,
  isEmulator,
  resetWallet,
  setupMintingPolicy,
  setupValidator,
} from '../../common/offchain/utils';
import blueprint from '../plutus.json' with { type: 'json' };
import {
  failTest,
  failTests,
  passAllTests,
  passTest,
  submitSolutionRecord,
} from '../../common/offchain/test_utils';
import {
  AccountDatum,
  Cheque,
  ConfigDatum,
  signCheque,
  createMakeChequesUsableRedeemer,
  ACCOUNT_TOKEN_NAME,
  CONFIG_TOKEN_NAME,
} from './types';
import { PRIVATE_KEY } from '../../common/offchain/config';
import { EMULATOR_PRIVATE_KEY } from '../../common/offchain/setup_lucid';

export type GameData = {
  bankValidator: SpendingValidator;
  accountValidator: SpendingValidator;
  configValidator: SpendingValidator;
  accountMintingPolicy: MintingPolicy;
  configMintingPolicy: MintingPolicy;
  bankAddress: string;
  accountAddress: string;
  configAddress: string;
  accountAsset: string;
  configAsset: string;
  victimAccountUtxo: UTxO; // Victim: 40 ADA, has 3 valid cheque ids (1, 2, 3)
  bankUtxo: UTxO;
  configUtxo: UTxO;
  playerAddress: string;
  playerPkh: string;
  playerPrivateKey: string;
  victimAddress: string;
  victimPkh: string;
  chequeFromVictim: Cheque; // Signed cheque from victim for 20 ADA with id 1
  originalBalance: bigint;
};
export type TestData = { lastBankTxHash: string };

function readValidators(
  lucid: LucidEvolution,
  bootstrapUtxo: UTxO
): {
  bankValidator: SpendingValidator;
  accountValidator: SpendingValidator;
  configValidator: SpendingValidator;
  accountMintingPolicy: MintingPolicy;
  configMintingPolicy: MintingPolicy;
} {
  const bootstrapParams = [bootstrapUtxo.txHash, BigInt(bootstrapUtxo.outputIndex)];
  const configMintingPolicy = setupMintingPolicy(
    lucid,
    blueprint,
    'config.config.mint',
    'PlutusV3',
    bootstrapParams
  );
  const configValidator = setupValidator(
    lucid,
    blueprint,
    'config.config.spend',
    'PlutusV3',
    bootstrapParams
  );

  const accountValidator = setupValidator(lucid, blueprint, 'account.account.spend', 'PlutusV3', [
    configMintingPolicy.policyId,
  ]);
  const bankValidator = setupValidator(lucid, blueprint, 'bank.bank.spend', 'PlutusV3', [
    configMintingPolicy.policyId,
  ]);
  const accountMintingPolicy = setupMintingPolicy(
    lucid,
    blueprint,
    'account.account.mint',
    'PlutusV3',
    [configMintingPolicy.policyId]
  );

  return {
    bankValidator: bankValidator.validator,
    accountValidator: accountValidator.validator,
    configValidator: configValidator.validator,
    accountMintingPolicy: accountMintingPolicy.policy,
    configMintingPolicy: configMintingPolicy.policy,
  };
}

export async function setup(lucid: LucidEvolution) {
  console.log(`\n=== SETUP IN PROGRESS ===`);

  // We need to bootstrap the protocol by a bootstrap UTxO.
  // We'll use the first UTxO from the player's wallet - it doesn't matter much.
  const bootstrapUtxo = (await lucid.wallet().getUtxos())[0];

  const {
    bankValidator,
    accountValidator,
    configValidator,
    accountMintingPolicy,
    configMintingPolicy,
  } = readValidators(lucid, bootstrapUtxo);

  const bankAddress = validatorToAddress(lucid.config().network!, bankValidator);
  const accountAddress = validatorToAddress(lucid.config().network!, accountValidator);
  const configAddress = validatorToAddress(lucid.config().network!, configValidator);
  const accountPolicyId = mintingPolicyToId(accountMintingPolicy);
  const configPolicyId = mintingPolicyToId(configMintingPolicy);
  const accountAsset = accountPolicyId + ACCOUNT_TOKEN_NAME;
  const configAsset = configPolicyId + CONFIG_TOKEN_NAME;
  const playerAddress = await lucid.wallet().address();
  const playerPkh = getAddressDetails(playerAddress).paymentCredential!.hash;

  // Create victim wallet
  const victimPrivateKey = generatePrivateKey();
  lucid.selectWallet.fromPrivateKey(victimPrivateKey);
  const victimAddress = await lucid.wallet().address();
  const victimPkh = getAddressDetails(victimAddress).paymentCredential!.hash;

  resetWallet(lucid);

  console.log(`Creating bank and victim account...`);

  // Initial deposit - only victim account
  const victimDepositAmount = 40_000_000n; // 40 ADA

  // Create config datum
  const configDatum = {
    bank_script_credential: validatorToScriptHash(bankValidator),
    account_script_credential: validatorToScriptHash(accountValidator),
  };

  // First transaction: Mint config token and create the config and bank UTxOs
  const setupTx = await lucid
    .newTx()
    .collectFrom([bootstrapUtxo])
    .mintAssets({ [configAsset]: 1n }, Data.void())
    .attach.MintingPolicy(configMintingPolicy)
    .pay.ToContract(bankAddress, { kind: 'inline', value: Data.void() }, { lovelace: 2_000_000n })
    .pay.ToContract(
      configAddress,
      { kind: 'inline', value: Data.to(configDatum, ConfigDatum) },
      { lovelace: 2_000_000n, [configAsset]: 1n }
    )
    .complete();

  const setupSignedTx = await setupTx.sign.withWallet().complete();
  const setupTxHash = await setupSignedTx.submit();
  await awaitTxConfirms(lucid, setupTxHash);

  let currentBankUtxo = filterUTXOsByTxHash(await lucid.utxosAt(bankAddress), setupTxHash)[0];
  const configUtxo = filterUTXOsByTxHash(await lucid.utxosAt(configAddress), setupTxHash)[0];

  // Create victim's account with initial deposit (no valid cheque ids yet)
  console.log(`Setting up victim account (${victimDepositAmount / 1_000_000n} ADA)...`);

  const victimAccountDatumInitial = {
    balance: victimDepositAmount,
    owner: victimPkh,
    valid_cheque_ids: [] as bigint[],
  };
  const newBankBalanceAfterDeposit = currentBankUtxo.assets.lovelace + victimDepositAmount;

  const createAccountTx = await lucid
    .newTx()
    .collectFrom([currentBankUtxo], Data.void())
    .attach.SpendingValidator(bankValidator)
    .readFrom([configUtxo])
    .mintAssets({ [accountAsset]: 1n }, Data.void())
    .attach.MintingPolicy(accountMintingPolicy)
    .pay.ToContract(
      bankAddress,
      { kind: 'inline', value: Data.void() },
      { lovelace: newBankBalanceAfterDeposit }
    )
    .pay.ToContract(
      accountAddress,
      { kind: 'inline', value: Data.to(victimAccountDatumInitial, AccountDatum) },
      { lovelace: 2_000_000n, [accountAsset]: 1n }
    )
    .complete();

  const createAccountSignedTx = await createAccountTx.sign.withWallet().complete();
  const createAccountTxHash = await createAccountSignedTx.submit();
  await awaitTxConfirms(lucid, createAccountTxHash);

  currentBankUtxo = filterUTXOsByTxHash(await lucid.utxosAt(bankAddress), createAccountTxHash)[0];
  let victimAccountUtxo = filterUTXOsByTxHash(
    await lucid.utxosAt(accountAddress),
    createAccountTxHash
  )[0];

  // Victim takes 3 blank cheques (ids 1, 2, 3) - like getting numbered cheques from a bank
  console.log(`Victim takes 3 blank cheques (ids: 1, 2, 3)...`);

  const chequeIds = [1n, 2n, 3n];
  const victimAccountDatumWithCheques = {
    balance: victimDepositAmount,
    owner: victimPkh,
    valid_cheque_ids: chequeIds,
  };

  const makeChequesRedeemer = createMakeChequesUsableRedeemer(chequeIds);

  const makeChequesTx = await lucid
    .newTx()
    .collectFrom([victimAccountUtxo], makeChequesRedeemer)
    .attach.SpendingValidator(accountValidator)
    .collectFrom([currentBankUtxo], Data.void())
    .attach.SpendingValidator(bankValidator)
    .readFrom([configUtxo])
    .addSigner(victimAddress)
    .pay.ToContract(
      bankAddress,
      { kind: 'inline', value: Data.void() },
      { lovelace: currentBankUtxo.assets.lovelace }
    )
    .pay.ToContract(
      accountAddress,
      { kind: 'inline', value: Data.to(victimAccountDatumWithCheques, AccountDatum) },
      { lovelace: 2_000_000n, [accountAsset]: 1n }
    )
    .complete();

  const makeChequesSignedTx = await makeChequesTx.sign
    .withPrivateKey(victimPrivateKey) // they are taking the blank cheques
    .sign.withWallet()
    .complete();
  const makeChequesTxHash = await makeChequesSignedTx.submit();
  await awaitTxConfirms(lucid, makeChequesTxHash);

  currentBankUtxo = filterUTXOsByTxHash(await lucid.utxosAt(bankAddress), makeChequesTxHash)[0];
  victimAccountUtxo = filterUTXOsByTxHash(
    await lucid.utxosAt(accountAddress),
    makeChequesTxHash
  )[0];

  // Victim signs a cheque for 20 ADA and shares it with the player
  // The cheque uses id 1 (the first of the valid cheque ids)
  const chequeAmount = 20_000_000n; // 20 ADA
  const chequeId = 1n;
  const chequeFromVictim = signCheque(victimPrivateKey, chequeId, chequeAmount);

  console.log(`Bank initialized with ${victimDepositAmount / 1_000_000n} ADA total deposits`);

  console.log(`\n=== SETUP WAS SUCCESSFUL ===\n`);
  console.log(`The victim has an account with ${victimDepositAmount / 1_000_000n} ADA deposited.`);
  console.log(`The victim has taken 3 blank cheques with ids: 1, 2, 3.`);
  console.log(
    `\nThe victim has shared a signed cheque with you for ${chequeAmount / 1_000_000n} ADA (id: ${chequeId})!`
  );
  console.log(
    `This cheque allows you to withdraw ${chequeAmount / 1_000_000n} ADA from the victim's account.`
  );
  console.log(
    `\nBut they have ${victimDepositAmount / 1_000_000n} ADA in their account... Can you get it all?\n`
  );

  return {
    bankValidator,
    accountValidator,
    configValidator,
    accountMintingPolicy,
    configMintingPolicy,
    bankAddress,
    accountAddress,
    configAddress,
    accountAsset,
    configAsset,
    victimAccountUtxo,
    bankUtxo: currentBankUtxo,
    configUtxo,
    playerAddress,
    playerPkh,
    playerPrivateKey: isEmulator(lucid) ? EMULATOR_PRIVATE_KEY : PRIVATE_KEY,
    victimAddress,
    victimPkh,
    chequeFromVictim,
    originalBalance: await getWalletBalanceLovelace(lucid),
  };
}

export async function test(
  lucid: LucidEvolution,
  gameData: GameData,
  testData: TestData
): Promise<boolean> {
  let passed = true;
  console.log('\n================TESTS==================');

  // Check if player successfully withdrew funds
  const endBalance = await getWalletBalanceLovelace(lucid);
  const gained = endBalance - gameData.originalBalance;

  // Player should have gained significant funds (at least 36 ADA from the 40 ADA total deposits)
  // 40 ADA total - some min ADA left = around 36 ADA gained
  if (gained < 36_000_000n) {
    failTest('TEST 1 FAILED -- you did not successfully drain enough from the bank');
    passed = false;
  } else {
    passTest('TEST 1 PASSED', lucid);
  }

  // Check that the bank is essentially empty (only min ADA left)
  const bankUtxos = filterUTXOsByTxHash(
    await lucid.utxosAt(gameData.bankAddress),
    testData.lastBankTxHash
  );
  const totalBankFunds = bankUtxos.reduce((sum, utxo) => sum + utxo.assets.lovelace, 0n);

  if (totalBankFunds > 3_000_000n) {
    // Allow for min ADA
    failTest('TEST 2 FAILED -- the bank still contains significant funds');
    passed = false;
  } else {
    passTest('TEST 2 PASSED', lucid);
  }

  if (passed) {
    await submitSolutionRecord(lucid, 113n); // bank_13 level

    passAllTests(
      '\nCongratulations on completing Bank 13: Almost There!\n' +
        'You successfully exploited the cheque ID vulnerability!\n' +
        "Actually, we're far from there and we definitely don't guarantee that the final version is error-free.\n" +
        "Hope you've enjoyed this banking series and be careful out there - there's always something so easy to miss when coding!",
      lucid
    );

    return true;
  } else {
    failTests();
    return false;
  }
}
