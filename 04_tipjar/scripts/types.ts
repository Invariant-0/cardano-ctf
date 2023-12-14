import { Data, fromText } from "https://deno.land/x/lucid@0.10.7/mod.ts";

const TipJarDatumSchema = Data.Object({
  owner: Data.Bytes(),
  messages: Data.Array(Data.Bytes()),
});

const TipJarRedeemerSchema = Data.Enum([
  Data.Literal("Claim"),
  Data.Literal("AddTip"),
]);

type TipJarDatum = Data.Static<typeof TipJarDatumSchema>;
export const TipJarDatum = TipJarDatumSchema as unknown as TipJarDatum;

type TipJarRedeemer = Data.Static<typeof TipJarRedeemerSchema>;
export const TipJarRedeemer = TipJarRedeemerSchema as unknown as TipJarRedeemer;

export function createTipJarDatum(
  owner: string,
  messages: string[],
): string | undefined {
  const datum: TipJarDatum = {
    owner: owner,
    messages: messages.map(fromText),
  };
  const retdat = Data.to(datum, TipJarDatum);
  return retdat;
}
