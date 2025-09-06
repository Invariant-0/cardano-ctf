import {
  BLOCKFROST_API_KEY,
  BLOCKFROST_URL,
  CONFIRMS_WAIT,
  PRIVATE_KEY,
  USE_EMULATOR,
  USE_TESTNET,
} from './config';
import { emulator, EMULATOR_PRIVATE_KEY, lucidEmulator, lucidTestnet } from './setup_lucid';
import {
  applyParamsToScript,
  CML,
  Data,
  LucidEvolution,
  MintingPolicy,
  Script,
  SpendingValidator,
  UTxO,
  Emulator,
} from '@lucid-evolution/lucid';
import { validatorToScriptHash, validatorToAddress } from '@lucid-evolution/utils';
// import { OurEmulator } from './emulator_provider';

export const FIXED_MIN_ADA = 2000000n;

function writeStringWithoutNewline(s: string) {
  process.stdout.write(s);
}

export function isEmulator(lucid: LucidEvolution) {
  return lucid.config().provider instanceof Emulator;
}

export function awaitTxConfirms(
  lucid: LucidEvolution,
  txHash: string,
  confirms = CONFIRMS_WAIT,
  checkInterval = 3000
): Promise<boolean> {
  return new Promise((res) => {
    if (isEmulator(lucid)) {
      emulator.awaitBlock(confirms);
      return res(true);
    }

    writeStringWithoutNewline(`Waiting for ${confirms} tx confirmations...`);
    const confirmation = setInterval(async () => {
      try {
        const isConfirmed = await fetch(`${BLOCKFROST_URL}/txs/${txHash}`, {
          headers: { project_id: BLOCKFROST_API_KEY },
        }).then((res) => res.json());
        writeStringWithoutNewline('.');

        if (isConfirmed && !isConfirmed.error) {
          try {
            const blockHash = isConfirmed.block;
            const block = await fetch(`${BLOCKFROST_URL}/blocks/${blockHash}`, {
              headers: { project_id: BLOCKFROST_API_KEY },
            }).then((res) => res.json());

            if (block.confirmations >= confirms) {
              writeStringWithoutNewline('\n');
              console.log(`Transaction confirmed!${getFormattedTxDetails(txHash, lucid)}`);
              clearInterval(confirmation);
              await new Promise((res) => setTimeout(() => res(1), 1000));
              return res(true);
            }
          } catch (error) {
            console.log('Error fetching block info, retrying...', error);
          }
        }
      } catch (error) {
        console.log('Error fetching transaction info, retrying...', error);
      }
    }, checkInterval);
  });
}

export function filterUTXOsByTxHash(utxos: UTxO[], txhash: string) {
  return utxos.filter((x) => txhash === x.txHash);
}

export async function getWalletBalanceLovelace(lucid: LucidEvolution) {
  const utxos = await lucid.wallet().getUtxos();
  return utxos.reduce((sum, utxo) => sum + utxo.assets.lovelace, 0n);
}

export function cardanoscanLink(txHash: string, lucid: LucidEvolution) {
  return isEmulator(lucid)
    ? ''
    : `Check details at https://preview.cardanoscan.io/transaction/${txHash} `;
}

export function getFormattedTxDetails(txHash: string, lucid: LucidEvolution) {
  return `\n\tTx ID: ${txHash}\n\t${cardanoscanLink(txHash, lucid)}`;
}

export function encodeBase64(str: string): string {
  return Buffer.from(str, 'utf8').toString('base64');
}

export function decodeBase64(str: string): string {
  return Buffer.from(str, 'base64').toString('utf8');
}

export function runTask<GameData, TestData>(
  setup: (lucid: LucidEvolution) => Promise<GameData>,
  play: (lucid: LucidEvolution, gameData: GameData) => Promise<TestData>,
  test: (lucid: LucidEvolution, gameData: GameData, testData: TestData) => Promise<boolean>
) {
  /**
   * Given a specific environment provided by lucid (emulator, testnet), we:
   *   1. Set up the level by creating necessary UTxOs.
   *   2. Run your interaction.
   *   3. Run tests on the resulting state to find out whether you successfully completed the level.
   */
  const runInSingleEnvironment = async (lucid: LucidEvolution): Promise<boolean> => {
    const gameData = await setup(lucid);
    const testData = await play(lucid, gameData);
    return test(lucid, gameData, testData);
  };

  const runInAllEnvironments = async (run: (lucid: LucidEvolution) => Promise<boolean>) => {
    let testsPassedEmulator = true;
    if (USE_EMULATOR) {
      try {
        console.log('Running on emulator...');
        testsPassedEmulator = await run(lucidEmulator);
      } catch (e) {
        console.log(e);
        console.log('An error happened while running your code in the emulator.');
        testsPassedEmulator = false;
      }
    } else {
      console.log('Emulator is disabled, skipping...');
    }
    if (testsPassedEmulator) {
      if (!USE_TESTNET) {
        console.log('Testnet is disabled, skipping...');
      } else if (lucidTestnet === undefined) {
        console.log('Testnet is not configured, finish your configuration according to the README');
      } else {
        console.log('Running the task on testnet now, this will take some time...');
        await run(lucidTestnet);
      }
    } else {
      console.log(
        'Tests did not pass on emulator, skipping the testnet. To force testnet, set USE_EMULATOR in config to false.'
      );
    }
  };

  runInAllEnvironments(runInSingleEnvironment);
}

export function filterUndefined(inputList: (string | undefined)[]): string[] {
  return inputList.filter((item): item is string => !!item);
}

export async function sleep(milliseconds: bigint): Promise<void> {
  const oneDayInMilliseconds = BigInt(24 * 60 * 60 * 1000);

  if (milliseconds >= oneDayInMilliseconds) {
    await new Promise((resolve) => setTimeout(resolve, Number(oneDayInMilliseconds)));
    await sleep(milliseconds - oneDayInMilliseconds);
  } else {
    await new Promise((resolve) => setTimeout(resolve, Number(milliseconds)));
  }
}

export function getCurrentTime(lucid: LucidEvolution) {
  if (isEmulator(lucid)) {
    return (lucid.config().provider as unknown as Emulator).now();
  }
  const current = new Date();
  return current.getTime();
}

export function second() {
  return 1000;
}

export function minute() {
  return 60 * second();
}

export function hour() {
  return 60 * minute();
}

export function day() {
  return 24 * hour();
}

export function privateKeyToPubKeyHash(bech32PrivateKey: string) {
  return CML.PrivateKey.from_bech32(bech32PrivateKey).to_public().hash();
}

export function pubKeyHashToAddress(pubKeyHash: CML.Ed25519KeyHash) {
  return CML.EnterpriseAddress.new(0, CML.Credential.new_pub_key(pubKeyHash))
    .to_address()
    .to_bech32(undefined);
}

export function resetWallet(lucid: LucidEvolution) {
  if (isEmulator(lucid)) {
    lucid.selectWallet.fromPrivateKey(EMULATOR_PRIVATE_KEY);
  } else {
    lucid.selectWallet.fromPrivateKey(PRIVATE_KEY);
  }
}

export async function fundWallet(lucid: LucidEvolution, address: string, lovelace: bigint) {
  const tx = await lucid.newTx().pay.ToAddress(address, { lovelace }).complete();

  const signedTx = await tx.sign.withWallet().complete();
  const submittedTx = await signedTx.submit();

  console.log(`Funded wallet ${address}${getFormattedTxDetails(submittedTx, lucid)}`);

  await awaitTxConfirms(lucid, submittedTx);
}

interface BlueprintJSON {
  validators: {
    title: string;
    compiledCode: string;
    hash: string;
  }[];
}

type ValidatorData = {
  validator: SpendingValidator;
  address: string;
  hash: string;
};

export function setupValidator(
  lucid: LucidEvolution,
  blueprint: BlueprintJSON,
  name: string,
  parameters?: Data[]
): ValidatorData {
  const jsonData = blueprint.validators.find((v) => v.title === name);
  if (!jsonData) {
    throw new Error(`Validator with a name ${name} was not found.`);
  }
  const compiledCode = jsonData.compiledCode;
  const validator: Script = {
    type: 'PlutusV2',
    script: parameters === undefined ? compiledCode : applyParamsToScript(compiledCode, parameters),
  };
  const address = validatorToAddress(lucid.config().network!, validator);
  const hash = validatorToScriptHash(validator);

  return { validator, address, hash };
}

type MintingPolicyData = {
  policy: MintingPolicy;
  policyId: string;
};

export function setupMintingPolicy(
  lucid: LucidEvolution,
  blueprint: BlueprintJSON,
  name: string,
  parameters?: Data[]
): MintingPolicyData {
  const jsonData = blueprint.validators.find((v) => v.title === name);
  if (!jsonData) {
    throw new Error('Validation token policy not found.');
  }
  const compiledCode = jsonData.compiledCode;
  const policy: MintingPolicy = {
    type: 'PlutusV2',
    script: parameters === undefined ? compiledCode : applyParamsToScript(compiledCode, parameters),
  };
  const policyId = validatorToScriptHash(policy);
  return { policy, policyId };
}
