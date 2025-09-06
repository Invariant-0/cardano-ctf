import { Data, toText } from '@lucid-evolution/lucid';
import { lucidTestnet } from './common/offchain/setup_lucid';

import { SOLUTION_RECORD_ADDRESS, SolutionRecordDatum } from './common/offchain/test_utils';
import chalk from 'chalk';
import promptSync from 'prompt-sync';

console.log('Running scoreboard, please wait...');

// Create prompt function similar to Deno's prompt
const prompt = promptSync();

const RECORD_LIMIT = 11;

const TEAM_ADDRESSES = [
  'addr_test1vr4wtjyyzuzhsxzfpzdmqj65pp3r7644wfl0u8lq6eh4jnqay43fc',
  'addr_test1vzmegp355jwkyudds3rhl5hv82zuze2hphy5peghfqcwq3qd5daxy',
  'addr_test1vznszvym4gy2ch8h5uk9hkt8ytkfly4zlk84qjsulpfjryg87qlg6',
];

type ParsedDatumType = {
  problem_id: number;
  timestamp: bigint;
  address: string;
};

const taskNames = [
  '00_hello_world',
  '01_sell_nft',
  '02_vesting',
  '03_multisig_treasury',
  '04_tipjar',
  '05_purchase_offer',
  '06_tipjar_v2',
  '07_multisig_treasury_v2',
  '08_lending',
  '09_multisig_treasury_v3',
  '10_king_of_cardano',
];

function showSolvedTasks(parsedDatums: ParsedDatumType[], ownAddress: string) {
  const solvedTasks = parsedDatums
    .filter((datum) => datum.address === ownAddress)
    .sort((a, b) => a.problem_id - b.problem_id);

  console.log(chalk.bold('Your solved tasks:'));
  solvedTasks.forEach((task) => {
    const solutionDate = new Date(Number(task.timestamp));
    console.log(`\t${task.problem_id}\t at ${solutionDate.toLocaleString()}`);
  });
}

function showTaskRecords(
  parsedDatums: ParsedDatumType[],
  taskId: number,
  ownAddress: string,
  showAll: boolean
) {
  const records = parsedDatums.filter((datum) => datum.problem_id === taskId);

  console.log(
    chalk.bold(
      `Task ${chalk.green(taskNames[taskId])} was solved by ${chalk.green(
        records.length.toString()
      )} unique addresses`
    )
  );

  const showRecords = records.filter((record, i) => {
    const hideRow =
      !showAll &&
      records.length > RECORD_LIMIT &&
      i > RECORD_LIMIT / 2 &&
      i < records.length - RECORD_LIMIT / 2 &&
      record.address !== ownAddress;

    return !hideRow;
  });

  showRecords.forEach((record) => {
    const solutionDate = new Date(Number(record.timestamp));
    const row = `\t${solutionDate.toLocaleString()}\t${record.address}`;
    const displayRow =
      record.address === ownAddress ? chalk.yellow(row + `\t (your solution)`) : row;

    console.log(displayRow);
  });

  const hidden = records.length - showRecords.length;
  if (hidden > 0) console.log(`\t(... ${hidden} other records ...)`);
}

if (lucidTestnet === undefined) {
  console.log('Testnet is not setup correctly, refer to README before proceeding');
  process.exit(1);
}

const ownAddress = await lucidTestnet!.wallet().address();
const allSolutionRecords = await lucidTestnet!.utxosAt(SOLUTION_RECORD_ADDRESS);
const parsedDatums = allSolutionRecords.map((utxo) => Data.from(utxo.datum!, SolutionRecordDatum));

const datumsWithParsedAddresses: ParsedDatumType[] = parsedDatums
  .map((datum) => ({
    problem_id: Number(datum.problem_id),
    timestamp: datum.timestamp,
    address: toText(datum.solver_address),
  }))
  .sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1))
  .filter((datum) => !TEAM_ADDRESSES.includes(datum.address) || datum.address === ownAddress)
  // Filter repeated solutions
  .filter(
    (value, index, self) =>
      index ===
      self.findIndex(
        (value2) => value2.address === value.address && value2.problem_id === value.problem_id
      )
  );

console.log(chalk.bold(`Your address: ${ownAddress}`));
console.log('To show the scoreboard for all tasks, input a');
console.log('To view a complete scoreboard for a single task, input its task number (0..10)');
console.log('To show all tasks that you have solved, input s');
console.log('To exit, input e');

// eslint-disable-next-line no-constant-condition
while (true) {
  const choice = prompt('Please enter your choice:');
  if (choice === null || choice.trim() === '') {
    console.log('Invalid choice');
  } else if (choice === 'a') {
    for (let taskId = 0; taskId <= 10; taskId++) {
      showTaskRecords(datumsWithParsedAddresses, taskId, ownAddress, false);
    }
  } else if (choice === 'e') {
    process.exit(0);
  } else if (choice === 's') {
    showSolvedTasks(datumsWithParsedAddresses, ownAddress);
  } else {
    const choiceNum = parseInt(choice, 10);
    if (choiceNum < 0 || choiceNum > 10 || isNaN(choiceNum)) {
      console.log('Invalid choice!');
      continue;
    }
    showTaskRecords(datumsWithParsedAddresses, choiceNum, ownAddress, true);
  }
}
