# Bank 09: Twin Bank

Welcome to our tenth challenge in the banking series! The bank developers have now fixed the
vulnerability from the previous level by tightening the bank validations. This level will look at a
so-far maintained but not enforced principle, which is actually vulnerable to a similar attack
vector with critical consequences.

## What's Changed

The bank validator now strictly enforces that there is at most a single account input and always
exactly one account output in every transaction. This prevents the vulnerability from the previous
level.

## The New Challenge

One seemingly innocent assumption so far has been that there is always just a single bank UTxO - but
is this actually enforced anywhere? Is the assumption that innocent? As you might correctly guess at
this point, it actually opens up the protocol for another critical vulnerability that can lead all
the way to draining the funds.

The challenge is to again find a way to drain the bank. Use a vulnerability in concept similar to
the previous level, but this time not by using fake account balances or stealing account tokens.
Instead, think about what multiple bank UTxOs mean for the protocol. Let the name of the task guide
you in determining what could be done. As always, there is a hint in the `player_template` file in
case you need more guidance.

## Your Goal

You start with no bank account, while another user has an account with significant funds deposited
(70 ADA). Your challenge is to find a way to drain the bank by exploiting the assumption about there
being only a single bank UTxO.

## How to Solve

1. Examine the validators to understand the fix that was introduced in this level.
2. Copy `scripts/player_template.ts` to `scripts/player.ts`.
3. Implement your exploit in the interaction section of `player.ts`.
4. Run your solution with `yarn task:bank09` from the project root.
5. Fix the validators and double-check that your exploit fails when run on the fixed validators.

Good luck!
