# purchase_offer

This level concerns a peer to peer NFT marketplace with an advanced feature — purchase offers. A
buyer is able to create a purchase offer where she puts the ADA amount she offers in exchange for an
asset she wants to purchase. She specifies the asset in the datum. Moreover, she can choose to ask
for any NFT from a particular collection.

During the setup, a unique precious NFT is minted and put into your wallet. In the same transaction,
multiple purchase offers are created. Since you own an NFT somebody is asking for in their purchase
offers, you can sell it to them and unlock their ADA. Can you unlock more than they offer?

## On-chain code

There is a single validator and a single minting policy that are involved in this task:

- `nft`: It is a simple minting policy by which your unique precious NFT is minted. It is the same
  policy used in the [sell_nft](../01_sell_nft/) task.

- `purchase_offer`: Purchase offer validator. The amount of ADA locked in purchase offer UTxOs is
  fully unlocked if the desired NFT is sold in the transaction. The sold NFT is checked against the
  configuration in the datum. The datum carries the desired policy id and an optional token name of
  the asset. If no token name is set, any NFT from the collection is accepted. The redeemer
  specifies the specific asset that is being sold.

## Off-chain code

As usual, create a copy of the `player_template.ts` named `player.ts` that you can run with the
`yarn task:05` command from the project root. The code that requires modification lies in this file
in the appropriate section.

As always, we recommend examining the rest of the off-chain code, especially the `setup()` function
in [task.ts](./scripts/task.ts) which can aid in understanding the setup of this level and provide
useful examples of how to interact with the validators.
