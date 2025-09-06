import { Data } from '@lucid-evolution/lucid';
import { getAddressDetails } from '@lucid-evolution/utils';

import { AddressSchema, getAddressFromBech32 } from '../../common/offchain/types';
import { filterUndefined } from '../../common/offchain/utils';

const TreasuryDatumSchema = Data.Object({
  value: Data.Integer(),
  multisig_hash: Data.Bytes(),
  owners: Data.Array(Data.Bytes()),
});

type TreasuryDatum = Data.Static<typeof TreasuryDatumSchema>;
export const TreasuryDatum = TreasuryDatumSchema as unknown as TreasuryDatum;

export function createTreasuryDatum(value: bigint, owners: string[], multisigHash: string): string {
  const verificationKeyHashes = owners.map(
    (address) => getAddressDetails(address).paymentCredential?.hash
  );
  const datum: TreasuryDatum = {
    value,
    multisig_hash: multisigHash,
    owners: filterUndefined(verificationKeyHashes),
  };
  return Data.to(datum, TreasuryDatum);
}

const MultisigRedeemerSchema = Data.Enum([Data.Literal('Use'), Data.Literal('Sign')]);

type MultisigRedeemer = Data.Static<typeof MultisigRedeemerSchema>;
export const MultisigRedeemer = MultisigRedeemerSchema as unknown as MultisigRedeemer;

const MultisigDatumSchema = Data.Object({
  release_value: Data.Integer(),
  beneficiary: AddressSchema,
  required_signers: Data.Array(Data.Bytes()),
  signed_users: Data.Array(Data.Bytes()),
});

type MultisigDatum = Data.Static<typeof MultisigDatumSchema>;
export const MultisigDatum = MultisigDatumSchema as unknown as MultisigDatum;

export function createMultisigDatum(
  releaseValue: bigint,
  beneficiaryBech32: string,
  signers: string[],
  alreadySigned: string[]
): string {
  const beneficiary = getAddressFromBech32(beneficiaryBech32);
  if (beneficiary === undefined) {
    throw new Error('Beneficiary address can not be parsed.');
  }
  const verificationKeyHashesSigners = signers.map(
    (address) => getAddressDetails(address).paymentCredential?.hash
  );
  const verificationKeyHashesSigned = alreadySigned.map(
    (address) => getAddressDetails(address).paymentCredential?.hash
  );
  const datum: MultisigDatum = {
    release_value: releaseValue,
    beneficiary,
    required_signers: filterUndefined(verificationKeyHashesSigners),
    signed_users: filterUndefined(verificationKeyHashesSigned),
  };
  return Data.to(datum, MultisigDatum);
}
