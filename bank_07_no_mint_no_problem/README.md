# Bank 07: No Mint, No Problem!

Welcome to our eighth challenge in the banking series! The bank developers have now fixed the
minting vulnerability from the previous level by ensuring that account tokens are only minted when
creating new accounts (and never minted separately).

## What's Changed

The loose token minting that allowed arbitrary account token creation has been fixed. The bank now
ensures that a new account token is minted if and only if a new account is being created and the
token is put into it.

## The New Challenge

You can no longer simply mint more account tokens. However, that's not a problem for you! The
protocol still has a critical weakness and you can still use the token to drain the bank.

The challenge is to find a way to still get the token and then use it to drain the bank. Since this
is the 8th level, we're confident you'll find a way to do it. There's a hint in the
`player_template` file in case you need more guidance, but try it without it.

## Your Goal

You start with no bank account, while another user has an account with significant funds deposited
(70 ADA). Your challenge is to find a way to get the same token that helped you drain the bank in
the previous level and use it to drain the bank in this level as well.

## How to Solve

1. Examine the validators to understand how account tokens are minted and used and what fixes were
   introduced in this level.
2. Copy `scripts/player_template.ts` to `scripts/player.ts`.
3. Implement your exploit in the interaction section of `player.ts`.
4. Run your solution with `yarn task:bank07` from the project root.
5. Fix the validators and double-check that your exploit fails when run on the fixed validators.

Good luck!
