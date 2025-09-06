import { Lucid } from '@lucid-evolution/lucid';
import {
  credentialToAddress,
  generatePrivateKey,
  keyHashToCredential,
} from '@lucid-evolution/utils';
import { privateKeyToPubKeyHash } from './utils';

const lucid = await Lucid(undefined, 'Preview');

const privateKey = generatePrivateKey();
const fs = await import('fs/promises');
await fs.writeFile('key.sk', privateKey);
console.log('Your private key is stored in key.sk');

const address = credentialToAddress(
  lucid.config().network!,
  keyHashToCredential(privateKeyToPubKeyHash(privateKey).to_hex())
);
await fs.writeFile('key.addr', address);
console.log('Your address is:', address);
