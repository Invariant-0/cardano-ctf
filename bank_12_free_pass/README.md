# Bank 12: Free Pass

Welcome to our 13th challenge in the banking series! The bank developers have fixed the
vulnerability from the previous level - the fix is very simple yet maybe not so intuitive, check it
out! The cheque feature remains, but it's no longer possible to forge cheques using your own key.

## What's Changed

The bank validator is modified to fix the previous level's vulnerability. Without going into
details, it is a very minor change and you're free to explore it on your own. It will be commented
on further in our upcoming _Hints and Solutions_ blog post.

The cheque mechanism from the previous level remains:

- An account owner signs a message containing an allowed withdrawal amount using their private key.
- The signature and the signer's public key form a cheque that can be shared off-chain.
- Anyone with the cheque can redeem it to withdraw the specified amount from the signer's account.

The key difference is that the fix now ensures the cheque signer is actually the account owner.
However, somehow, sharing a cheque is still so dangerous..

## The New Challenge

While the signature verification is now properly tied to the account owner, there's still a subtle
but serious flaw in the cheque protocol. Think about what the cheque actually consists of and what
might be missing.

Your task is to find the vulnerability and use it to drain the victim's account beyond what the
cheque that is shared with you authorizes.

## Your Goal

You start with:

- Your bank account containing 20 Ada.
- A victim's account with 30 Ada deposited.
- A properly signed cheque from the victim for 20 Ada.

Your challenge is to drain the entire victim's account (30 Ada) using only the 20 Ada cheque. For
completeness, withdraw all the funds - together with the stolen funds, that means nothing is left in
the bank.

## How to Solve

1. Examine the validators, especially `account.ak`, to understand how cheques work and what changed.
2. Copy `scripts/player_template.ts` to `scripts/player.ts`.
3. Implement your exploit in the interaction section of `player.ts`.
4. Run your solution with `yarn task:bank12` from the project root.
5. Try to fix the validators (even though this might be a bit trickier problem to fix) and
   double-check that your exploit fails when run on the fixed validators.

Good luck!
