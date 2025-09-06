# multisig_treasury_v3

**Spoiler alert:** This level is a direct continuation of
[Level 07: Multisig Treasury v2](../07_multisig_treasury_v2/) and contains spoilers for its
solution. We recommend solving this level only after successfully completing Level 07.

This level again uses a simple multi-signature treasury. The treasury holds a certain amount of ADA
and is owned by a group of addresses. To release any portion of the funds, all its owners must
agree. To express their will, they sign a Multisig UTxO that specifies the amount to be released and
the destination address – where the funds should be released. Most importantly, it accumulates
signatures as they can sign it across multiple transactions.

The statement is the same as in the previous Multisig Treasury level. A treasury UTxO is created,
locking 10 ADA for two owners – yourself and an another owner. To withdraw the funds, you must
provide the treasury validator with a multisig UTxO signed by both owners. However, you lack the
private key for the second address and can not contact him, making it seemingly impossible to obtain
his signature.

## Changes

**The multisig UTxO validator has been modified** to mitigate a specific attack vector that could be
exploited in Level 07.

⚠️ However, it's important to note that the remaining attack vector was also present in the Level
07's validator. If you successfully exploited it in the previous level, congratulations! You can
find out whether that's the case by trying to run your `player.ts` from the Level 07 in this task.
If it passes this level, we encourage you to return to Level 07 and try to solve it differently
**without** reading the codebase of this level.

The on-chain code in this level is the same as in the previous level except for the vulnerability
from the Level 07 that is fixed. The off-chain code of this task is exactly the same as before. You
can refer to their high-level descriptions
[in the previous README](../07_multisig_treasury_v2/README.md#on-chain-code).
