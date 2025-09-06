# multisig_treasury_v2

**Spoiler alert:** This level is a direct continuation of
[Level 03: Multisig Treasury](../03_multisig_treasury/) and contains spoilers for its solution. We
recommend solving this level only after successfully completing Level 03.

This level once again uses a simple multi-signature treasury. The treasury holds a certain amount of
ADA and is owned by a group of addresses. To release any portion of the funds, all its owners must
agree. To express their will, they sign a Multisig UTxO that specifies the amount to be released and
the destination address – where the funds should be released. Most importantly, it accumulates
signatures as they can sign it across multiple transactions.

To add more protection to the smart contract, a validation token is introduced. For the multisig
UTxO to be accepted and funds be released, the validation token must be present within the UTxO. The
validation token can only be minted during the creation of the multisig UTxO, and it validates its
datum. To link the validation token with the multisig UTxO, the token's name must be equal to the
validator hash of the multisig contract.

The statement is similar to the previous Multisig Treasury level. A treasury UTxO is created,
locking 10 ADA for two owners – yourself and an another owner. To withdraw the funds, you must
provide the treasury validator with a multisig UTxO signed by both owners. However, you lack the
private key for the second address and can not contact him, making it seemingly impossible to obtain
his signature. Can you find a way to bypass the contract and release the funds?

## On-chain code

Two validators and one minting policy are involved in this task:

- `treasury`: Treasury UTxOs contain ADA, and their datum includes a set of owners. Withdrawal from
  this UTxO is possible when a multisig UTxO, containing signatures from all treasury owners, is
  provided.

- `multisig`: Multisig UTxOs contain withdrawal proposals in their datum. A proposal specifies the
  amount, beneficiary, and a set of addresses that need to sign it. This UTxO collects signatures
  one by one, allowing any specified address to add its signature in the appropriate transaction. To
  be validated, the UTxO must contain the proper validation token.

- `validation_token`: Minting policy for the validation token. The token can only be minted when a
  multisig UTxO with a correct datum is created, and the token must be locked inside the UTxO.

Note that the multisig validator is parameterized with the hash of the treasury validator, and the
treasury contains the hash of the multisig validator in its datum. This ensures that a multisig can
only be used with a valid treasury and vice versa. The multisig validator is also parametrized with
the policy id of the validation token to ensure that it can only be spent if a valid validation
token is present.

In addition to the validators, `lib/types.ak` contains the datum and the redeemer specifications for
both validators. There is also the `lib/utils.ak` utils file containing some of the common parser
logic to not polute the checks.

## Off-chain code

As usual, create a copy of the `player_template.ts` named `player.ts` that you can run with the
`yarn task:07` command from the project root. The code that requires modification lies in this file
in the appropriate section.
