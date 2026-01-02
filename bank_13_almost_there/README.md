# Bank 13: Almost There

Welcome to our 14th and final challenge in the banking series! The bank developers have learned
their lesson from the previous cheque attack - or have they? They've now added cheque IDs to prevent
reusing the same cheque. Each account now tracks a list of valid cheque IDs, similar to how a person
might take numbered blank cheques from a bank.

## What's Changed

The account datum now includes a `valid_cheque_ids` field - a list of integers representing cheque
IDs that can be used for withdrawals when signed and distributed by the owner. When a cheque is
redeemed, its ID is removed from the list, preventing the exact same cheque from being used again.

A new redeemer `MakeChequesUsable` has been added, allowing account owners to add cheque IDs to
their account. Think of this as taking blank numbered cheques from the bank - you need to authorize
which cheque IDs are valid before you can use them.

The cheque redemption now requires:

- The cheque ID must be in the account's `valid_cheque_ids` list.
- After redemption, the cheque ID is removed from the valid list.
- Naturally, the amount and that the signer is the account owner is still verified.

Note: The bank input is enforced in the transaction for convenience as there are many important
checks there that we added over time, even though the bank UTxO is not strictly necessary for the
action of adding cheque IDs. Feel free to consider refactoring this as an exercise - but be careful
not to reintroduce vulnerabilities!

## The New Challenge

The developers thought adding unique IDs to cheques would prevent attacks similar to the previous
level. After all, once a cheque ID is used, it's removed from the valid list... right?

Your task is to find the gap in the logic and/or its implementation and exploit it to drain the
victim's account beyond what the single cheque authorizes.

## Your Goal

You start with:

- No bank account of your own.
- A victim's account with 40 Ada deposited.
- The victim has taken 3 blank cheques (IDs: 1, 2, 3).
- He signed one for 20 Ada (using ID 1) for you.

Your challenge is to drain the victim's entire account (40 Ada) using only the 20 Ada cheque.

## How to Solve

1. Examine the validators, especially `account.ak` and `types.ak`, to understand how cheque IDs work
   and what is actually being signed. Carefully check all changes made in this level.
2. Copy `scripts/player_template.ts` to `scripts/player.ts`.
3. Implement your exploit in the interaction section of `player.ts`.
4. Run your solution with `yarn task:bank13` from the project root.
5. Try to fix the validators and double-check that your exploit fails when run on the fixed
   validators.

Good luck!
