# Bank 10: Transfer

Welcome to our eleventh challenge in the banking series! The bank developers have now fixed the
vulnerability from the previous level by tightening the bank validations. This level (re-)introduces
a feature that has been missing from the protocol for some time - a transfer between two accounts.
However, during its implementation, a critical security assumption was overlooked.

## What's Changed

The bank validator now strictly enforces that there is at most a single bank input in every
transaction. This prevents the vulnerability from the previous level.

Additionally, a transfer feature has been (re-)added to the protocol. As the validators were
tightened over the levels, transfers between two accounts became impossible, which is an essential
feature for a banking system. As such, the validators now explicitly support spending two account
inputs in the case of a transfer, checking that there is no deposit or withdrawal to the bank - just
a net-zero change between the accounts.

## The New Challenge

During the refactor and feature addition, the developers had to handle multiple account inputs and
outputs in the transfer flow. Bigger refactors like this can be tricky, and it's easy to miss some
past security assumptions that were previously enforced.

The challenge is to find what security check was missed during this refactor and exploit it to drain
the bank. As always, there is a hint in the `player_template` file in case you need more guidance.

## Your Goal

You start with a bank account containing 20 ADA, while another user has an account with 30 ADA
deposited. Your challenge is to find a way to drain the bank by exploiting the missing security
check.

## How to Solve

1. Examine the validators to understand the new transfer feature, the refactor that happened and the
   fix that was introduced in this level to prevent previous level's attack vector.
2. Copy `scripts/player_template.ts` to `scripts/player.ts`.
3. Implement your exploit in the interaction section of `player.ts`.
4. Run your solution with `yarn task:bank10` from the project root.
5. Fix the validators and double-check that your exploit fails when run on the fixed validators.

Good luck!
