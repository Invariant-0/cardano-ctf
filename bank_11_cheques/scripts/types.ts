import { CML, Data } from '@lucid-evolution/lucid';

// Cheque data type - a signed authorization to withdraw funds
export type Cheque = {
  amount: bigint;
  key: string; // hex-encoded full public key of the signer
  signature: string; // hex-encoded ed25519 signature
};

// Helper function to sign a cheque amount using a private key
export function signCheque(privateKey: string, amount: bigint): Cheque {
  const cmlPrivateKey = CML.PrivateKey.from_bech32(privateKey);
  const publicKey = cmlPrivateKey.to_public();

  // Serialize amount as CBOR Data (matching Aiken's builtin.serialise_data)
  const amountCbor = Data.to(amount);
  const messageBytes = Buffer.from(amountCbor, 'hex');

  // Sign the serialized data
  const signature = cmlPrivateKey.sign(messageBytes);

  return {
    amount: amount,
    key: Buffer.from(publicKey.to_raw_bytes()).toString('hex'),
    signature: Buffer.from(signature.to_raw_bytes()).toString('hex'),
  };
}

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
  Data.Literal('DecreaseBalanceByOwner'),
  Data.Object({
    DecreaseBalanceByCheque: Data.Object({
      amount: Data.Integer(),
      key: Data.Bytes(),
      signature: Data.Bytes(),
    }),
  }),
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

// Helper function to create a DecreaseBalanceByCheque redeemer
export function createDecreaseBalanceByChequeRedeemer(
  amount: bigint,
  key: string,
  signature: string
): string {
  return Data.to(
    {
      DecreaseBalanceByCheque: {
        amount,
        key,
        signature,
      },
    },
    AccountRedeemer
  );
}

// Account token name constant (matching Aiken validator)
export const ACCOUNT_TOKEN_NAME = '41'; // Hex for 'A'

// Config token name constant (matching Aiken validator)
export const CONFIG_TOKEN_NAME = '434f4e464947'; // Hex for 'CONFIG'
