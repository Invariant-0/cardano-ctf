import { Data, fromText } from '@lucid-evolution/lucid';

const TipJarDatumSchema = Data.Object({
  owner: Data.Bytes(),
  messages: Data.Array(Data.Bytes()),
});

const TipJarRedeemerSchema = Data.Enum([Data.Literal('Claim'), Data.Literal('AddTip')]);

type TipJarDatum = Data.Static<typeof TipJarDatumSchema>;
export const TipJarDatum = TipJarDatumSchema as unknown as TipJarDatum;

type TipJarRedeemer = Data.Static<typeof TipJarRedeemerSchema>;
export const TipJarRedeemer = TipJarRedeemerSchema as unknown as TipJarRedeemer;

export function createTipJarDatum(owner: string, messages: string[]): string {
  const datum: TipJarDatum = {
    owner: owner,
    messages: messages.map(fromText),
  };
  const retdat = Data.to(datum, TipJarDatum);
  return retdat;
}
