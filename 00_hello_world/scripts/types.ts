import { Data } from '@lucid-evolution/lucid';

const HelloRedeemerSchema = Data.Object({
  msg: Data.Bytes(),
});

type HelloRedeemer = Data.Static<typeof HelloRedeemerSchema>;
export const HelloRedeemer = HelloRedeemerSchema as unknown as HelloRedeemer;
