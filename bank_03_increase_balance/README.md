# Bank 03: Increase Balance

Welcome to the fourth challenge in our banking series! The bank developers continue to patch
vulnerabilities, but their smart contracts still have critical flaws. Can you find the new one?

## What's Changed

The attacks from the previous levels are now prevented. There are no other changes to the
validators.

## The New Challenge

The bank's account system tracks balances carefully, ensuring that deposits and withdrawals are
properly reflected in both the bank's funds and account balances. But what if you could manipulate
your account balance without actually depositing any funds?

Think about how the validators handle balance increases. Are all the necessary checks in place? What
assumptions do the validators make about who can increase an account's balance and under what
circumstances?

## Your Goal

You start with a bank account but no funds deposited. Two other users already have accounts with
significant funds in the bank. Your goal is to artificially increase your account balance, then use
this fraudulent balance to drain the entire bank, including all the legitimate deposits from other
users.

## How to Solve

1. Examine the validators to understand how balance updates are validated.
2. Copy `scripts/player_template.ts` to `scripts/player.ts`.
3. Implement your exploit in the interaction section of `player.ts`.
4. Run your solution with `yarn task:bank03` from the project root.

Good luck!
