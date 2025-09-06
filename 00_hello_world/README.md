# hello_world

So, you managed to install everything and now are eager to try your hands on the real stuff. You are
in the right place!

The validator in this task simply locks given ADA and you have to provide the correct password to
unlock it. However, something is wrong and the unlocking of the funds fails with an error:

```
error: Uncaught (in promise) "Redeemer (Spend, 0): The provided Plutus code called 'error'.\n\nExBudget {\n    mem: 21485,\n    cpu: 8262844,\n}\n\n"
```

This error means that the validator does not validate your transaction. Can you find out why and
unlock the funds?

## How to solve the challenges

Each challenge consists of 2 files that you should interact with:

- The validator, located in [validators/hello_world.ak](./validators/hello_world.ak)
- The off-chain code, located in [scripts/player_template.ts](./scripts/player_template.ts)

The validator code is read only — you are not supposed to modify it, you are supposed to exploit it.
The off-chain is divided into 3 parts:

1. Setup — this part setups the vulnerable scenario. This means deploying the smart contracts,
   minting NFTs if needed, ... You should not make changes to this part of the file. Setup is done
   by calling the `setup` function from [task.ts](./scripts/task.ts).
2. Interaction part — this is the only part that you need to edit. All your exploits should go here.
   Usually, this part already includes an example interaction which can get you going faster but is
   not sufficient just yet. This code interacts with the smart contract in some way, but does not
   exploit the vulnerability. This part is located in the
   [player_template.ts](./scripts/player_template.ts) file. To play, we recommend keeping the
   template as is and **copying it** into a file called `player.ts` which you can then freely edit.
3. Tests — the tests verify whether you correctly achieved your goal. Tests are done by calling the
   `test` function from the [task.ts](./scripts/task.ts). Do not modify this part.

   Note: It may be possible to satisfy the tests by not exploiting the contract the way it was
   intended to. Especially later in the more complex scenarios, there may be multiple paths to
   achieve the same goal. If you think you came up with a unique attack,
   [drop us a line](../README.md#feedback). We would love to hear about that!

The above parts communicate through a structure called `GameData`. It is created during the setup,
and it contains everything you need for solving the challenges and everything that the tests
require. You should not modify it. The tests may require additional info contained within a
`TestData` structure. You will be specifically instructed on how to modify it if needed. It is not
needed for this task.

To start, you can compile the validators by running `aiken build` in the root of the task. Then you
can run the sample code by running `yarn task:00` from the project root. This command runs our
wrapper that calls the function `play` from `player.ts` (if you did not copy `player_template.ts`,
it will not work).

The wrapper first tests your code in the Lucid Evolution emulator. If all the tests inside the
emulator pass, the code is tested one more time against the testnet. The emulator provides early
feedback so that you do not need to wait for all the transactions being validated and accepted on
the actual blockchain. Once you solve the task, though, only the testnet offers a real-world
environment and so it is really important to pass there as well. This default behavior can be
changed in the `common/offchain/config.ts`.

The goal of each task is to pass all the tests by editing the editable parts of off-chain code. You
will get a _green_ congrats message once you get there.

With all that said, good luck and have fun!
