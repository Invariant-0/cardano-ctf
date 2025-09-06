# tipjar

We created a Tip Jar where you can send us tips with nice messages attached! You can use it to show
how much you appreciate the CTF. The Jar works very simply – anyone can put (testnet) ADA into it
and write a new message into the datum. We enforce a minimum tip to prevent attackers from
increasing contention of the Tip Jar by adding too little ADA. The owner can empty the Tip Jar
anytime.

Your goal in this task is different from the previous tasks – you want to just **damage** the owner
and **forbid other people from tipping** into the Jar. Such attacks are called Denial Of Service
(DoS). The tests in this task will try to add one more tip, and if they fail, you win!

## Warnings

Be careful, some solutions might pass in the emulator but not on the testnet - even if the idea is
the same. If you need to set up the attack differently for the emulator vs the testnet, we recommend
using the `isEmulator(lucid)` function from the common offchain utils' file. Also, because of the
nature of this task, there are possibly more paths to the solution. Please drop us a comment if you
think you found a unique solution!
