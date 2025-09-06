import { Data } from '@lucid-evolution/lucid';

import { AddressSchema, getAddressFromBech32 } from '../../common/offchain/types';

const AssetClassSchema = Data.Object({
  policy_id: Data.Bytes(),
  asset_name: Data.Bytes(),
});

const PurchaseOfferDatumSchema = Data.Object({
  owner: AddressSchema,
  desired_policy_id: Data.Bytes(),
  desired_token_name: Data.Nullable(Data.Bytes()),
});

type PurchaseOfferDatum = Data.Static<typeof PurchaseOfferDatumSchema>;
export const PurchaseOfferDatum = PurchaseOfferDatumSchema as unknown as PurchaseOfferDatum;

const SellRedeemerSchema = Data.Object({
  sold_asset: AssetClassSchema,
});

type SellRedeemer = Data.Static<typeof SellRedeemerSchema>;
export const SellRedeemer = SellRedeemerSchema as unknown as SellRedeemer;

export function createPurchaseOfferDatumSchema(
  addressBech32: string,
  desiredPolicyId: string,
  desiredAssetName: string | null // null for any asset name
): string {
  const owner = getAddressFromBech32(addressBech32);

  const datum: PurchaseOfferDatum = {
    owner,
    desired_policy_id: desiredPolicyId,
    desired_token_name: desiredAssetName,
  };

  return Data.to(datum, PurchaseOfferDatum);
}
