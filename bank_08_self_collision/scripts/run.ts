import { play } from './player';
import { setup, test } from './task';
import { runTask } from '../../common/offchain/utils';

await runTask(setup, play, test);
