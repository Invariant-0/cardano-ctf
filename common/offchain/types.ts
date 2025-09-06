import {
  CML,
  Data,
  getAddressDetails,
  LucidEvolution,
  networkToId,
  Credential as LucidCredential,
} from '@lucid-evolution/lucid';
import { PointerAddress, Pointer, KeyHash, ScriptHash } from '@lucid-evolution/experimental';
import { credentialToAddress } from '@lucid-evolution/utils';
import { Effect, Schema } from 'effect';

export const CredentialSchema = Data.Enum([
  Data.Object({ VerificationKeyCredential: Data.Tuple([Data.Bytes()]) }),
  Data.Object({ ScriptCredential: Data.Tuple([Data.Bytes()]) }),
]);

const PaymentCredentialSchema = CredentialSchema;
const StakeCredentialSchema = Data.Enum([
  Data.Object({ Inline: Data.Tuple([CredentialSchema]) }),
  Data.Object({
    Pointer: Data.Tuple([Data.Integer(), Data.Integer(), Data.Integer()]),
  }),
]);

export const AddressSchema = Data.Object({
  payment_credential: PaymentCredentialSchema,
  stake_credential: Data.Nullable(StakeCredentialSchema),
});

type Credential = Data.Static<typeof CredentialSchema>;
type Address = Data.Static<typeof AddressSchema>;

function getCredential(credential: LucidCredential): Credential {
  switch (credential.type) {
    case 'Script':
      return {
        ScriptCredential: [credential.hash] as [string],
      };
    case 'Key':
      return {
        VerificationKeyCredential: [credential.hash] as [string],
      };
  }
}

function getLucidCredential(credential: Credential): LucidCredential {
  if ('VerificationKeyCredential' in credential) {
    return {
      type: 'Key',
      hash: credential.VerificationKeyCredential[0],
    };
  }

  return {
    type: 'Script',
    hash: credential.ScriptCredential[0],
  };
}

export function getAddressFromBech32(bech32Address: string): Address {
  const addressDetails = getAddressDetails(bech32Address);

  if (!addressDetails.paymentCredential) {
    throw Error("Invalid bech32 address' payment credential");
  }

  return {
    payment_credential: getCredential(addressDetails.paymentCredential),
    stake_credential: addressDetails.stakeCredential
      ? { Inline: [getCredential(addressDetails.stakeCredential)] }
      : null,
  };
}

export function getBech32FromAddress(lucid: LucidEvolution, address: Address): string {
  const paymentCredential = getLucidCredential(address.payment_credential);

  if (!address.stake_credential || 'Inline' in address.stake_credential) {
    const stakeCredential = address.stake_credential
      ? getLucidCredential(address.stake_credential['Inline'][0])
      : undefined;
    return credentialToAddress(lucid.config().network!, paymentCredential, stakeCredential);
  }

  // Extract pointer values
  const [slot, txIndex, certIndex] = address.stake_credential.Pointer;

  // Create the experimental PointerAddress - only that one somewhat handles pointer addresses
  // Beware: Only positive slot, txIndex, and certIndex are supported by this library (non-zero non-negatives)
  const PointerAddressClass = PointerAddress.PointerAddress;
  const experimentalPointerAddress = new PointerAddressClass({
    networkId: networkToId(lucid.config().network!) as any,
    paymentCredential:
      paymentCredential.type === 'Key'
        ? new KeyHash.KeyHash({ hash: paymentCredential.hash as any })
        : new ScriptHash.ScriptHash({ hash: paymentCredential.hash as any }),
    pointer: Pointer.make(slot as any, txIndex as any, certIndex as any),
  });

  // Convert to bytes using Effect Schema
  const encoded = Schema.encode(PointerAddress.Bytes)(experimentalPointerAddress);
  const bytes = Effect.runSync(encoded);

  // Convert bytes to CML Address and then to bech32
  const cmlAddress = CML.Address.from_raw_bytes(bytes);
  return cmlAddress.to_bech32(undefined);
}
