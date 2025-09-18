# Bank 02: Mutual Exclusion

Welcome to the third challenge in our banking series! The bank developers fixed the deposit
vulnerability you exploited in the previous level. However, the bank's far from secure still.

## What's Changed

The attack from the previous level is now prevented (for advanced users: ok, not really 😉).

Note: As there were and still are more attack vectors possible, we recommend that you check whether
your attack is actually really prevented by these new contracts (just run your `player.ts` in this
level). If it still succeeds, you likely exploited a different vulnerability (congrats!) and you can
go back to the previous level and think of a different way to exploit it before proceeding, taking
our recommendations more literally.

## The New Challenge

This level focuses on what parts of transaction data is free for you to provide and how the
validators handle that fact. They should not trust data that you are free to modify to your
advantage, right?

## Your Goal

Similar to the previous level, you again start with no bank account while another user already has
an account with funds deposited. Your goal is to withdraw their funds by recognizing which
transaction fields are up to you to provide, are trusted and so you are free to modify them to your
advantage.

After you solve the level, we recommend thinking of a fix to the validators that would prevent your
attack. Does the name of the task make sense now?

## How to Solve

1. Examine the validators.
2. Copy `scripts/player_template.ts` to `scripts/player.ts`.
3. Implement your exploit in the interaction section of `player.ts`.
4. Run your solution with `yarn task:bank02` from the project root.

Good luck!
