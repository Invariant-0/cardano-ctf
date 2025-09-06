import chalk from 'chalk';
import { Data, fromText, LucidEvolution } from '@lucid-evolution/lucid';
import { lucidTestnet } from './setup_lucid';
import { FIXED_MIN_ADA, getCurrentTime, isEmulator } from './utils';

export function passTest(s: string, l: LucidEvolution) {
  if (isEmulator(l)) {
    console.log(chalk.yellow(s));
  } else {
    console.log(chalk.green(s));
  }
}

export function passAllTests(s: string, l: LucidEvolution) {
  console.log('');
  if (isEmulator(l)) {
    console.log(chalk.yellow('Congratulations! You seem to succesfully pass all the tests.'));
    console.log(chalk.yellow('To fully finish this task, you have to finish it on testnet too.'));
    if (lucidTestnet === undefined) {
      console.log(chalk.yellow('Please refer to the README to configure everything correctly.'));
    }
  } else {
    console.log(chalk.green(s));
  }
}

export function failTest(s: string) {
  console.log(chalk.red(s));
}

export function failTests() {
  console.log("Some tests did not pass, don't stop trying!");
}

export const SolutionRecordSchema = Data.Object({
  problem_id: Data.Integer(),
  timestamp: Data.Integer(),
  solver_address: Data.Bytes(),
});

export type SolutionRecordDatum = Data.Static<typeof SolutionRecordSchema>;
export const SolutionRecordDatum = SolutionRecordSchema as unknown as SolutionRecordDatum;

function createSolutionRecordDatum(
  problemId: bigint,
  timestamp: bigint,
  solverAddress: string
): string {
  const datum: SolutionRecordDatum = {
    problem_id: problemId,
    timestamp,
    solver_address: fromText(solverAddress),
  };
  return Data.to(datum, SolutionRecordDatum);
}

export const SOLUTION_RECORD_ADDRESS =
  'addr_test1wqxdcgqqexv4mqfnaj2lp77824hcgz4fgsrkdhzwy2a20fq5zsp5u';

export async function submitSolutionRecord(lucid: LucidEvolution, problemId: bigint) {
  if (isEmulator(lucid)) return;
  const ownAddress = await lucid.wallet().address();
  const tx = await lucid
    .newTx()
    .pay.ToContract(
      SOLUTION_RECORD_ADDRESS,
      {
        kind: 'inline',
        value: createSolutionRecordDatum(problemId, BigInt(getCurrentTime(lucid)), ownAddress),
      },
      { lovelace: FIXED_MIN_ADA }
    )
    .complete();

  const signedTx = await tx.sign.withWallet().complete();
  await signedTx.submit();

  console.log(`Submitting solution record on the testnet.`);
}
