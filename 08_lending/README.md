# lending

In this level, you'll analyze a straightforward peer-to-peer lending platform where borrowers
request loans by creating UTxOs specifying the loan amount (only ADA is supported) and locking
collateral tokens to guarantee repayment. Anyone can fulfill the loan, activating it by sending
funds to the borrower. Each loan must be repaid within the specified time frame, along with the
specified interest.

Upon loan repayment, borrowers can unlock their collateral, and lenders can claim the repaid ADA. If
a loan remains unpaid within the set time frame, lenders can claim the locked collateral.

Two borrowers have requested multiple loans. Your task is to uncover a hidden vulnerability and
acquire some ADA for yourself. Keep in mind three key assumptions:

- Collateral tokens locked in lending UTxOs hold no real value for you; your sole aim is to acquire
  ADA. Stealing collateral tokens won't lead to a successful pass of the tests. Imagine that there's
  no market to exchange those.
- You seek to obtain more ADA than you started with. Merely gaining interest from the loans won't
  suffice.
- Locked collateral tokens are invaluable to the borrowers. They are certainly worth more for them
  than the value borrowed. Even if they suspect foul play, they'll proceed through the lending
  protocol to reclaim the collateral tokens.

## On-chain code

The on-chain code comprises two files:

- `lending`: This serves as the primary validator responsible for validating all interactions
  involving lending UTxOs. Pay close attention to its datum as it's rather intricate, requiring
  careful parameter configuration for the validator to advance through various stages.

- `collateral_token`: This file contains the minting policy for our collateral tokens. It's utilized
  by the borrowers. To ensure uniqueness for each user, tokens can only be minted if their asset
  name matches the hash of the user's signature. In other words, you can't mint collateral tokens
  that are put as collateral in someone else's loan request.

## Off-chain code

As usual, create a copy of the `player_template.ts` named `player.ts` that you can run with the
`yarn task:08` command from the project root. The code that requires modification lies in this file
in the appropriate section.

Note that the code necessitates interaction among different users. The `GameData` includes wallets
for other users, along with their private keys. **Do not use these private keys** while solving the
level. It is not needed. The only exception is the `askForRepayment` function, which simulates a
borrower seeking to unlock their collateral tokens. When provided with the correct collateral token
within the lending UTxO, they will repay it in full. Utilize this function solely to repay the UTxOs
created during the setup. Do not exploit any vulnerability found within this function. Find a smart
contract vulnerability instead.

See the `player_template.ts` for an example of a single interaction between a borrower and a lender.
