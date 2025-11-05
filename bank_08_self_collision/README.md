# Bank 08: Self Collision

Welcome to our ninth challenge in the banking series! The bank developers have now fixed the
vulnerability from the previous level by making sure that also the account output contains the
account token and thus it can't be stolen - or can it?

## What's Changed

The bank validator now always verifies that the account output contains an account token. This
prevents the vulnerability from the previous level as the token can not be misplaced.

## The New Challenge

You got used to the previous levels' critical impact that was possible just by gaining possession of
an account token. Fortunately for you, the protocol still has a critical weakness that allows you to
get the account token which can then be used in a familiar fashion to drain the bank.

The challenge is to find a way to obtain the token and then use it to drain the bank. Let the name
of the task guide you in determining what could be done to obtain the token. As always, there is a
hint in the `player_template` file in case you need more guidance.

## Your Goal

You start with no bank account, while another user has an account with significant funds deposited
(70 ADA). Your challenge is to find a way to get the same token that helped you drain the bank in
the previous levels and use it to drain the bank in this level as well.

## How to Solve

1. Examine the validators to understand the fix that was introduced in this level.
2. Copy `scripts/player_template.ts` to `scripts/player.ts`.
3. Implement your exploit in the interaction section of `player.ts`.
4. Run your solution with `yarn task:bank08` from the project root.
5. Fix the validators and double-check that your exploit fails when run on the fixed validators.

Good luck!
