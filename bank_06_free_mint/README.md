# Bank 06: Free Mint

Welcome to our seventh challenge in the banking series! The bank developers have now added a
critical safety mechanism: a single-shot config token that identifies the one true protocol
configuration.

## What's Changed

The attacks from the previous levels are now prevented. The bank has implemented a configuration
token system:

- **Config Token (Single-Shot NFT)**: A one-time minted token (`CONFIG`) must be present in the
  config reference input. This ensures validators can only read from legitimate configurations. Only
  one config token should ever exist, and it is created during the initial system bootstrap.

- **Parametrized Validators**: All other validators (bank, account) are parametrized with the config
  policy ID. This ensures they can verify the config token's presence and prevent reading from
  unauthorized configurations.

## The New Challenge

With the config token system in place, the protocol is a little bit more complex again. However,
with so many tokens, is the protocol secure now or are there still things that can go wrong?

Think about all the tokens that are part of the current design now. Why were they introduced to the
protocol and what purpose do they serve? When and how can they be minted and where are they put?
There is a token where its minting process is not sufficiently checked and thus there is a way for
you to mint more of it. Can you identify the token, the transaction, and misuse it all the way to
draining the bank?

## Your Goal

You start with a bank account containing zero balance, while two other users have already deposited
significant funds (30 ADA and 40 ADA respectively). The bank holds all 70 ADA from these deposits.

Your challenge is to find a way to artificially increase your account balance without making
legitimate deposits. Focus on the protocol tokens, especially their minting process - there may be a
way to mint extra tokens and then use them to drain the entire bank.

## How to Solve

1. Examine the validators to refresh knowledge on the protocol tokens and understand token minting.
2. Copy `scripts/player_template.ts` to `scripts/player.ts`.
3. Implement your exploit in the interaction section of `player.ts`.
4. Run your solution with `yarn task:bank06` from the project root.

Good luck!
