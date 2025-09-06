import { Data } from '@lucid-evolution/lucid';

import { AddressSchema, getAddressFromBech32 } from '../../common/offchain/types';

const AssetClassSchema = Data.Object({
  policy_id: Data.Bytes(),
  asset_name: Data.Bytes(),
});

type AssetClass = Data.Static<typeof AssetClassSchema>;
export const AssetClass = AssetClassSchema as unknown as AssetClass;

const LendingDatumSchema = Data.Object({
  borrower: AddressSchema,
  lender: Data.Nullable(AddressSchema),
  borrowed_amount: Data.Integer(),
  interest: Data.Integer(),
  loan_duration: Data.Integer(),
  loan_end: Data.Nullable(Data.Integer()),
  collateral: AssetClassSchema,
  repaid: Data.Boolean(),
  unique_id: Data.Integer(),
});

type LendingDatum = Data.Static<typeof LendingDatumSchema>;
export const LendingDatum = LendingDatumSchema as unknown as LendingDatum;

export function createLendingDatum(
  borrowerBech32: string,
  lenderBech32: string | null,
  borrowedAmount: bigint,
  interest: bigint,
  loanDuration: bigint,
  loanEnd: bigint | null,
  collateralPolicy: string,
  collateralName: string,
  repaid: boolean,
  uniqueId: bigint
): string {
  const borrower = getAddressFromBech32(borrowerBech32);
  const lender = lenderBech32 !== null ? getAddressFromBech32(lenderBech32) : null;

  const collateral: AssetClass = {
    policy_id: collateralPolicy,
    asset_name: collateralName,
  };

  const datum: LendingDatum = {
    borrower,
    lender,
    borrowed_amount: borrowedAmount,
    interest,
    loan_duration: loanDuration,
    loan_end: loanEnd,
    collateral,
    repaid,
    unique_id: uniqueId,
  };

  return Data.to(datum, LendingDatum);
}

const LendingRedeemerSchema = Data.Enum([
  Data.Literal('Lend'),
  Data.Literal('Repay'),
  Data.Literal('ClaimRepayment'),
  Data.Literal('ClaimCollateral'),
]);

type LendingRedeemer = Data.Static<typeof LendingRedeemerSchema>;
export const LendingRedeemer = LendingRedeemerSchema as unknown as LendingRedeemer;
