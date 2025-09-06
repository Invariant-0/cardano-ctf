# tipjar_v2

**Spoiler alert: Do not attempt this level before solving level 04 - [tipjar](../04_tipjar/). This
task builds on top of it and reveals the idea of the vulnerability.**

The code and the goal of this level are both similar to the [tipjar](../04_tipjar/). The validator
is updated to mitigate two attack vectors present in the previous version. However, we believe that
it is still possible to perform a DoS attack on the Tip Jar and prevent other people from tipping.
Can you find and demonstrate the vulnerability?

## Warnings

Some solutions might pass in the emulator but not on the testnet. Always verify your solution on the
testnet as well.

If your solution from the [tipjar](../04_tipjar/) passes here as well, try to go back and find a
different attack vector for the first version of the tipjar.
