# Bank 00: Core Invariant

Welcome to the very first challenge in our banking series! In this CTF series, you'll be exploring a
decentralized bank implementation on Cardano. We start with a very simple but super vulnerable
implementation and progress into more complex designs.

## The Bank System

The bank consists of two main components:

1. **Bank UTxO**: A single global UTxO containing pooled funds of all users (just Ada).
2. **Account UTxOs**: Represent individual accounts that don't hold funds directly but contain a
   datum field describing how much funds the account holds. The funds themselves are held by the
   bank.

### Account Operations

Users can:

- **Deposit**: Increase their account's balance by depositing funds to the bank. The transaction
  spends both their account UTxO and the bank UTxO and recreates them with modified balances.
- **Withdraw**: Withdraw funds from the bank and decrease their account's balance. This action
  requires the account owner's signature, spends both the relevent account's and the bank's UTxOs
  and recreates them with adjusted funds and balance.

For more details we recommend checking out the validators directly.

## The Vulnerability

In this very simple implementation that contains a number of both critical and less severe bugs, we
want you to focus on a very simple yet super critical flaw in the withdrawal mechanism. The bank
forgot to check arguably their most important withdrawal rule. Can you find and exploit it?

## Your Goal

The task starts by opening accounts for two users - yourself included. Both you and the other user
deposit funds into the bank. Your goal is to empty the whole bank by exploiting the bank's loose
withdrawal mechanism.

## How to Solve

1. Examine the validators in the `validators/` directory to understand both validators and look for
   the vulnerability in the deposit path.
2. Copy `scripts/player_template.ts` to `scripts/player.ts`.
3. Implement your exploit in the interaction section of `player.ts`.
4. Run your solution with `yarn task:bank00` from the project root.

Good luck!
