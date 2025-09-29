# Bank 05: Misconfiguration

Welcome to our sixth challenge in the banking series! The bank developers have addressed the
lifecycle vulnerability by introducing account validity tokens, but configuration management
introduced a while ago remains a critical attack surface.

## What's Changed

The attacks from the previous levels are now prevented. The bank has implemented significant
security enhancements:

- **Account Validity Tokens**: Since validators cannot run on UTxO creation, the bank now requires
  account validity tokens to ensure only legitimate accounts can interact with the system. These
  tokens must be minted when accounts are created (requiring the run of bank's validator, so that
  initial deposits are checked!), and must be present in all account UTxOs.

- **Enhanced Bank Validator**: The bank validator has been refactored to handle account creation
  scenarios. It now distinguishes between transactions with existing account inputs (requiring
  validity tokens) and new account creation (where no account input exists yet).

- **Token-Based Account Verification**: Account UTxOs must contain the account validity token to be
  considered legitimate. This prevents arbitrary UTxOs and their balance from being treated as
  valid.

In the off-chain scripts, notice how the setup transaction(s) changed significantly.

## The New Challenge

While the validity token system adds a layer of protection, the configuration system introduced in
the previous level may still have vulnerabilities. Consider how the validators discover and trust
each other through the configuration contract.

What if the configuration itself could be manipulated? As it is the cornerstone of trust in our
system, funds could be stolen easily if it could be modified. At first glance, it seems that the
configuration can not be modified (check out the validator to see why). However, equipped with our
thinking from the previous level and closely inspecting the contracts, there surely is a way.

## Your Goal

You again start with a bank account containing zero balance, while two other users have already
deposited significant funds. Your challenge is to find a way to artificially increase your account
balance without making legitimate deposits, then drain the entire bank.

Focus on the configuration system and how validators use it to reference each other. Once the
vulnerability is found, there are **numerous ways** to achieve the result. Any way is fine, and you
could take the additional challenge of thinking of and implementing two different implementations.

## How to Solve

1. Examine the validators to understand how balance updates are validated.
2. Copy `scripts/player_template.ts` to `scripts/player.ts`.
3. Implement your exploit in the interaction section of `player.ts`.
4. Run your solution with `yarn task:bank05` from the project root.

Good luck!
