# king_of_cardano

The King of Cardano is a competition, where the winner gets the opportunity to mint his own
customized King of Cardano NFT! The rules of the competition are simple — you have to spend more
money than your predecessor to overthrow him as a king. The overthrown king gets all his money back.
Whoever is the king once the competition is over is the real king and can mint his NFT.

## On-chain code

There is a single validator and two minting policies that are involved in this task:

- `king_nft`: The price for the winner. The actual King of Cardano NFT. It can be minted only once
  and by the current king once the competition is over.

- `king_of_cardano`: The main contract. It allows for three actions:
  - **OverthrowKing**: Enables you to overthrow the current king and become one.
  - **CloseCompetition**: The admin uses it to end the competition.
  - **MintKingNFT**: Once the competition is closed, the final king can use it to mint the NFT.

- `unique_nft`: This is a similar policy used in other tasks as well, for the purpose of minting a
  unique NFT that can not be minted again. It is modified to allow burning of the token. In this
  task, it is used in the bootstrapping process: The person that initializes the competition first
  mints the unique NFT using this policy, then compiles all the other scripts using this NFT as a
  parameter and puts the NFT itself into the newly created `king_of_cardano` UTxO. In a way, it also
  serves as a validity token for that UTxO, uniquely identifying the correct competition UTxO.

## Off-chain code

As usual, create a copy of the `player_template.ts` named `player.ts` that you can run with the
`yarn task:10` command from the project root.

The testing process in this task is as follows:

1. We try to overthrow the current king. You pay for the fees, so you should leave enough ADA in
   your wallet so that the transaction is feasible. We check that you do. The attempt should fail.
2. The admin closes the competition. This is a simplification to simulate an accelerated passage of
   time. Under normal circumstances, no administrative role would be required. This adjustment is
   made purely for simplification purposes.
3. We try to claim the King of Cardano NFT on your behalf.

Your aim is to become a king who can not be overthrown and who ultimately claims a customized King
of Cardano NFT. Don't forget to pick a cool nickname :).

## Notes

This task points to a number of problems and is language specific. There are at least two distinct
attack vectors with the stack we chose. The upcoming blogpost discussing this will discuss three
problems this points to. Ultimately, there is at least one issue that is an issue in all the common
languages — Plutus, Plutarch, Aiken. Try to find it. Good luck and have fun!
