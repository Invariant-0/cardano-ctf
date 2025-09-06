import {
  Blockfrost,
  Lucid,
  generateEmulatorAccountFromPrivateKey,
  Emulator,
} from '@lucid-evolution/lucid';
import { BLOCKFROST_API_KEY, BLOCKFROST_URL, PRIVATE_KEY } from './config';

const uidInputData = new TextEncoder().encode(PRIVATE_KEY + BLOCKFROST_API_KEY);
const uidHashArray = Array.from(
  new Uint8Array(await crypto.subtle.digest('sha-256', uidInputData))
);
export const UNIQUE_ID = uidHashArray
  .map((b) => b.toString(16).padStart(2, '0'))
  .join('')
  .substring(0, 10);

const emulatorAccount = generateEmulatorAccountFromPrivateKey({ lovelace: BigInt(1e14) });
export const EMULATOR_PRIVATE_KEY = emulatorAccount.privateKey;
export const emulator = new Emulator([emulatorAccount]);
export const lucidEmulator = await Lucid(emulator, 'Custom');
lucidEmulator.selectWallet.fromPrivateKey(EMULATOR_PRIVATE_KEY);

const testnetConfigured = BLOCKFROST_API_KEY.length !== 0 && PRIVATE_KEY.length !== 0;
export const lucidTestnet = testnetConfigured
  ? await Lucid(new Blockfrost(BLOCKFROST_URL, BLOCKFROST_API_KEY), 'Preview')
  : undefined;
lucidTestnet?.selectWallet.fromPrivateKey(PRIVATE_KEY);
