import { Data } from '@lucid-evolution/lucid';

// Config datum type definition matching the Aiken validator
const ConfigDatumSchema = Data.Object({
  bank_script_credential: Data.Bytes(),
  account_script_credential: Data.Bytes(),
});

type ConfigDatum = Data.Static<typeof ConfigDatumSchema>;
export const ConfigDatum = ConfigDatumSchema as unknown as ConfigDatum;

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
export function createAccountDatum(balance: bigint, ownerPkh: string): string {
  const datum: AccountDatum = {
    balance: balance,
    owner: ownerPkh,
  };
  return Data.to(datum, AccountDatum);
}

// Account token name constant (matching Aiken validator)
export const ACCOUNT_TOKEN_NAME = '41'; // Hex for 'A'
