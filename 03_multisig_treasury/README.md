# multisig_treasury

This level introduces a simple multi-signature treasury. The treasury holds a certain amount of ADA
and is owned by a group of addresses. To release any portion of the funds, all its owners must
agree. To express their will, they sign a Multisig UTxO that specifies the amount to be released and
the destination address – where the funds should be released. Most importantly, it accumulates
signatures as they can sign it across multiple transactions.

In this task, a treasury UTxO is created, locking 10 ADA for two owners – yourself and an another
owner. To withdraw the funds, you must provide the treasury validator with a multisig UTxO signed by
both owners. However, you lack the private key for the second address and can not contact him,
making it seemingly impossible to obtain his signature. Can you find a way to bypass the contract
and release the funds?

## On-chain code

Two validators are involved in this task:

- `treasury`: Treasury UTxOs contain ADA, and their datum includes a set of owners. Withdrawal from
  this UTxO is possible when a multisig UTxO, containing signatures from all treasury owners, is
  provided.

- `multisig`: Multisig UTxOs contain withdrawal proposals in their datum. A proposal specifies the
  amount, beneficiary, and a set of addresses that need to sign it. This UTxO collects signatures
  one by one, allowing any specified address to add its signature in the appropriate transaction.

Note that the treasury validator is parameterized with a hash of the multisig validator, ensuring
that only the corresponding multisig script can unlock the given treasury.

In addition to the validators, `lib/types.ak` contains the datum and the redeemer specifications for
both validators. There is also the `lib/utils.ak` utils file containing some of the common parser
logic to not polute the checks.

## Off-chain code

As usual, create a copy of the `player_template.ts` named `player.ts` that you can run with the
`yarn task:03` command from the project root. The code that requires modification lies in this file
in the appropriate section.

We recommend examining the rest of the off-chain code, especially the `setup()` function, which can
aid in understanding the setup of this level and provide useful examples of how to interact with the
validators. This approach is also recommended for later levels.
