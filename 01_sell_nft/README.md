# sell_nft

In this task, we will explore a simple peer to peer NFT marketplace. The validator is a simple
contract where the seller locks an NFT. The datum contains the address of the seller and the price
of the NFT he wants to sell for. Anyone can then buy this NFT by spending the UTxO in a transaction
given he sends the price of the NFT to the seller.

During the setup, two UTxOs are created at that script address. They both contain a different NTF,
belong to the same owner and have different price. Your goal is to acquire both of them without
spending too much ADA.

## On-chain code

The important validator here is the [nft_sell.ak](./validators/nft_sell.ak). That is the smart
contract that governs the selling and buying of the NFTs.

The other two files are helpers that you do not need to use, but feel free to explore:

- [locked.ak](./validators/locked.ak) — A validator where anything gets locked. Forever. The address
  of this validator is used as the seller of the NFTs.
- [nft.ak](./validators/nft.ak) — The minting policy of the NFTs. It checks that given UTxOs are
  spent, thus guaranteeing that the minted NFTs are not reminted in future transactions.

## Off-chain code

You only have to make changes in the `player.ts` file. Similar to the previous level, you can create
it by copying the [player_template.ts](./scripts/player_template.ts). Inside the file, the relevant
parts are clearly commented, starting with `================ YOUR CODE STARTS HERE` and ending with
`================ YOUR CODE ENDS HERE`.

You should interact with the deployed smart contracts in between the two comments. The code that is
already there buys a single NFT from the seller — it doesn't pass all the tests because it buys only
one of the two required NFTs. Try to pass all the tests by modifying it.

As before, you can run the code and tests with: `yarn task:01` from the project root
