# Bank 11: Cheques

Welcome to our 12th challenge in the banking series! The bank developers have fixed the
vulnerability from the previous level - the fix is very simple, check it out! This level introduces
a brand new feature - off-chain shareable **cheques**!

## What's Changed

The bank validator is modified to fix the previous level's vulnerability. Without going into
details, it is a very minor change and you're free to explore it on your own. It will be commented
on further in our upcoming _Hints and Solutions_ blog post.

Additionally, a new feature has been added: **cheques**. Just as in the real world (although mostly
obsolete these days), they are signed blobs shareable off-chain. Account owners can sign and hand
them over to a beneficiary via any encrypted communication channel or in-person. They authorize the
beneficiary to withdraw a specific amount from the account owner's account.

The cheque mechanism works as follows:

- An account owner signs a message containing an allowed withdrawal amount using their private key.
- The signature and the signer's public key form a cheque that can be shared off-chain.
- Anyone with the cheque can redeem it to withdraw the specified amount from the signer's account.

The new logic is mostly in the `account.ak`. Note how the `AccountRedeemer` was changed to
distinguish decreasing the account balance by the owner vs. by another party using a valid cheque.
An example valid cheque interaction can be seen in the `player_template.ts` and a cheque generation
in the `task.ts`.

## The New Challenge

The cheque feature uses Ed25519 signature verification to ensure that only properly signed cheques
can be redeemed. However, there's a subtle flaw in the flow, making the whole protocol vulnerable
once again.

Your task is to find the vulnerability and exploit it to drain the **whole** bank. As always, there
is a hint in the `player_template` file in case you need more guidance.

## Your Goal

You start with:

- Your bank account containing 20 Ada.
- Victim 1's account with 5 Ada (this victim does NOT share a cheque with you).
- Victim 2's account with 10 Ada (this victim shares a 10 Ada cheque with you).

Your challenge is to drain the entire bank (35 Ada total) by exploiting the newly added cheque code
path.

Note: Naturally, you are always allowed to use your private key but not private keys of other
players - if you had access to those, what would even be the point of hacking the smart contracts?
;)

## How to Solve

1. Examine the validators, especially `account.ak`, to understand how cheques work.
2. Copy `scripts/player_template.ts` to `scripts/player.ts`.
3. Implement your exploit in the interaction section of `player.ts`.
4. Run your solution with `yarn task:bank11` from the project root.
5. Fix the validators and double-check that your exploit fails when run on the fixed validators.

Good luck!
