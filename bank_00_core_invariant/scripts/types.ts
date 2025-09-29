import { Data } from '@lucid-evolution/lucid';
import { getAddressDetails } from '@lucid-evolution/utils';

// Account datum type definition matching the Aiken validator
const AccountDatumSchema = Data.Object({
  balance: Data.Integer(),
  owner: Data.Bytes(),
});

type AccountDatum = Data.Static<typeof AccountDatumSchema>;
export const AccountDatum = AccountDatumSchema as unknown as AccountDatum;

// Account redeemer type definition
const AccountRedeemerSchema = Data.Enum([
  Data.Literal('IncreaseBalance'),
  Data.Literal('DecreaseBalance'),
]);

type AccountRedeemer = Data.Static<typeof AccountRedeemerSchema>;
export const AccountRedeemer = AccountRedeemerSchema as unknown as AccountRedeemer;

// Helper function to create an account datum
export function createAccountDatum(balance: bigint, owner: string): string {
  const ownerHash = getAddressDetails(owner).paymentCredential!.hash;
  const datum: AccountDatum = {
    balance: balance,
    owner: ownerHash,
  };
  return Data.to(datum, AccountDatum);
}
