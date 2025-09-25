# Bank 04: Lifecycle

Welcome to the fifth challenge in our banking series! The bank developers have had a hard time
fixing the previous attacks, but finally they came up with a way to provide a bank validator hash to
the account validator and vice versa by introducing a new config validator which stores both the
hashes. Is the vulnerability fully gone?

## What's Changed

The attacks from the previous levels are now prevented. The bank has implemented a new architecture
to address the security vulnerabilities:

- **Configuration Contract**: A new config contract has been introduced that holds both the bank and
  account script hashes. This solves the circular dependency problem that would arise if the bank
  and account validators directly referenced each other (if you're unsure about where the circular
  dependency problem is, try to do it).

- **Decoupled Validators**: The bank validator no longer takes the account script hash as a
  parameter. Instead, both validators now use the config contract to find each other.

- **Reference Input Requirement**: When spending either bank or account UTxOs, the config datum must
  be attached as a reference input. This ensures both validators can verify they're interacting with
  the correct companion validator.

## The New Challenge

The bank's validation logic is now more robust, with decent separation of concerns between the
validators. However, when designing secure systems, it's crucial to consider the entire lifecycle of
every componentl; every state transition must be properly validated for the system to be
bulletproof.

## Your Goal

Your goal and the setup is the same as you had in the previous level. You start with a bank account
but zero balance, while two other users have already deposited significant funds. The challenge is
to again find a way to artificially increase your account balance without making any legitimate
deposits, then use this fraudulent balance to drain the entire bank.

This time, focus on every stage of the account lifecycle - there might be a critical validation
missing at one particular point.

## How to Solve

1. Examine the validators to understand how balance updates are validated.
2. Copy `scripts/player_template.ts` to `scripts/player.ts`.
3. Implement your exploit in the interaction section of `player.ts`.
4. Run your solution with `yarn task:bank04` from the project root.

Good luck!
