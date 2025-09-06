import { Data } from '@lucid-evolution/lucid';
import { getAddressDetails } from '@lucid-evolution/utils';

const VestingSchema = Data.Object({
  lock_until: Data.Integer(),
  beneficiary: Data.Bytes(),
});

type VestingDatum = Data.Static<typeof VestingSchema>;
export const VestingDatum = VestingSchema as unknown as VestingDatum;

export function createVestingDatum(lockUntil: bigint, beneficiary: string): string {
  const beneficiaryHash = getAddressDetails(beneficiary).paymentCredential!.hash;
  const datum: VestingDatum = {
    lock_until: lockUntil,
    beneficiary: beneficiaryHash,
  };
  return Data.to(datum, VestingDatum);
}
