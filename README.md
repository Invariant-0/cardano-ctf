# Cardano Vulnerabilities Game — Capture the Flag (CTF)

Welcome to the Cardano Capture the Flag (CTF) challenge by [Invariant0](https://invariant0.com/),
the former Vacuumlabs Auditing team!

It is a game where Cardano developers and enthusiasts can try to exploit purposely vulnerable smart
contracts and learn about the most common security issues and how to prevent them. In a way, you can
try the job of auditors on some common Cardano vulnerabilities.

We believe this will provide the community with educational materials needed to write more secure
smart contracts.

<p align="center">
  <a href="https://discord.gg/5XVW2MUdWu">
    <img alt="Discord" src="https://img.shields.io/badge/Join%20us%20on-Discord-blue?logo=discord">
  </a>
  <a href="https://medium.com/@invariant0">
    <img alt="Medium" src="https://img.shields.io/badge/Read%20our%20blogs-on%20Medium-blue?logo=medium">
  </a>
  <a href="https://x.com/invariant0_com">
    <img alt="Twitter" src="https://img.shields.io/badge/Follow-@invariant0_com-blue?logo=x">
  </a>
</p>

<p align="center">
  <img src="images/invariant0_logo.jpg" alt="Invariant0" width="55%">
</p>

## Tasks

0. [hello_world](./00_hello_world/) — A sanity check to verify that everything's setup correctly.
1. [sell_nft](./01_sell_nft/) — Try to buy two NFTs by paying less than their stated prices!
2. [vesting](./02_vesting/) — Try to skip the vesting period.
3. [multisig_treasury](./03_multisig_treasury/) — Unlock treasury without all the signatures.
4. [tipjar](./04_tipjar/) — Try to prevent others from tipping into a Tip Jar.
5. [purchase_offer](./05_purchase_offer/) — Sell an NFT while collecting more money than offerred.
6. [tipjar_v2](./06_tipjar_v2/) — The Tip Jar was patched. Try to prevent others from tipping into
   the upgraded Tip Jar.
7. [multisig_treasury_v2](./07_multisig_treasury_v2/) — The treasury was upgraded. Try to unlock it
   without all the signatures again.
8. [lending](./08_lending/) — Hack a simple peer-to-peer lending protocol.
9. [multisig_treasury_v3](./09_multisig_treasury_v3/) — The treasury was upgraded again! Let's
   compromise it once again 💪.
10. [king_of_cardano](./10_king_of_cardano/) — Become the King of Cardano and prevent others from
    overthrowing you.

## How it works

Each task has its own folder. It consists of three main parts:

- The validators written in [Aiken](https://aiken-lang.org/). They are located in the `validators`
  folder. You can compile them by running `aiken build` in the root directory of the task. Make sure
  that you use (old) Aiken version `v1.0.26-alpha`.
- The off-chain code. We use the
  [Lucid Evolution](https://github.com/Anastasia-Labs/lucid-evolution) library and
  [Blockfrost](https://blockfrost.io/) API to interact with the Preview testnet. The off-chain
  scripts contain:
  - Code deploying the smart contracts onto the Cardano Preview testnet.
  - Sample interaction with the deployed contract. This is the part you should modify and / or
    extend to exploit a vulnerability.
  - Tests that verify if you successfully exploited the vulnerability or not.
- A README file containing task-specific instructions. The first sample
  [hello_world](./00_hello_world/README.md#how-to-solve-the-challenges) task contains a bit more
  info on how exactly to play.

The tasks are more or less of an increasing difficulty. The suggested path is to go from a simple
[hello_world](./00_hello_world/) task up. The tasks' README's also explain more in the beginning,
leaving more up to you in the more complex levels.

## Setup

To be able to run the first task, just 4 steps of setup are needed:

1. Install [Node.js](https://nodejs.org/) and [Yarn](https://yarnpkg.com/getting-started/install).
2. Install dependencies by running `yarn install` in the project root.
3. Install [Aiken](https://aiken-lang.org/installation-instructions).
4. Copy the template config file in `common/offchain/config_temp.ts` to `common/offchain/config.ts`.

That's it and you can now play in the local Lucid Evolution emulator! The emulator is great for
testing smart contracts fast.

You can now try the first [hello_world](./00_hello_world/) task (read its README carefully) and get
to the _yellow_ test results.

## Finishing the setup

To get to the _green_ test results and really finish the task, it is required to finish it in the
testnet environment. To set this up, there are a few more steps you need to take:

1. Generate a private key and address. We prepared a private key generation code for you, you can
   run it by:

   ```
   yarn gen-keys
   ```

   Put your private key into the `PRIVATE_KEY` constant located in the `common/offchain/config.ts`.

   DO NOT REUSE A PRIVATE KEY THAT YOU USE FOR MAINNET! Generate a new one instead!

2. Get Blockfrost API key by registering at https://blockfrost.io/ . Put this API key into the
   `BLOCKFROST_API_KEY` constant in the `common/offchain/config.ts`.
3. You need some starting ADA in your wallet so you can interact with the Cardano testnet. Request
   tADA into your address (see the newly created `key.addr` file) from the
   [Cardano Faucet](https://docs.cardano.org/cardano-testnet/tools/faucet/). The environment we use
   is **Preview Testnet**.
4. You are good to go! To verify that everything is set up correctly, try solving the very first
   sample task: [Hello World](./00_hello_world/). You should see green test results when everything
   is done correctly.

## Troubleshooting

### Videos

There are videos in the [videos folder](./videos/). Check them out if you're struggling with making
the framework work. Beware, it can contain spoilers, especially the first video that solves the
_hello_world_ task entirely. The later videos do not explain the solutions. They are here mostly to
demonstrate Catalyst milestones' completion. You should strive to find the solutions yourself.

### Errors during a transaction submission

Sometimes, LucidEvolution errors out when it submits a transaction. This usually happens on the real
testnet when you wait for too short between two different transactions from your wallet. It can also
happen when running different tasks on testnet too close to each other, as for statistics we submit
a successful solution record to the chain when you solve a task on the testnet and we don't wait for
that transaction's completion. That might make the following testnet transaction fail if you run it
too soon after that.

In the meantime, if you encounter this error, you can try to change the default value of
`CONFIRMS_WAIT` in the [config](./common/offchain/config.ts) to a higher number. This makes it wait
for more confirmations before it follows up with the next transaction, increasing the time and
making the chance of such errors smaller. Additionally, if you run more tasks just after each other
on testnet, such as using `./scripts/run_all.sh` with testnet enabled, we recommend waiting for a
few seconds at least after each task.

We have also encountered transactions in which Lucid Evolution wasn't able to determine the correct
amount of ADA that needed to be placed into the UTxO, resulting in the transaction erroring out with
`Not enough ADA leftover to cover minADA`, even if a sufficient amount of ADA was available. To
address this issue, our transactions now deposit a fixed amount of at least 2 ADA into each UTxO.

### Long waiting time on the testnet

From our experience, the time required for a transaction validation are ever changing on the preview
testnet. If it takes too long, try to decrease the default value of `CONFIRMS_WAIT` in the
[config](./common/offchain/config.ts) to a lower number. Be careful not to change it too low,
otherwise you might get errors during submissions.

This is why we run the transactions on the Lucid Evolution emulator first. Only if they pass there
we try to replicate it on the testnet as well.

### Aiken compilation issues

We use old Aiken version `v1.0.26-alpha` and `aiken-stdlib` version `1.6.0` (you can see this in
`aiken.toml` files). As Aiken syntax changed and newer Aiken versions are
[unable](https://github.com/aiken-lang/stdlib/blob/main/README.md#compatibility) to compile this,
you need to downgrade Aiken.

## Scoreboard

Successful solutions are recorded on the testnet. There is a script called `scoreboard.ts` that
displays the number of successful solutions in a succinct way. You can run it using the command
`yarn scoreboard`.

## Feedback

[Join our Discord](https://discord.gg/5XVW2MUdWu). You can ask questions, share your solutions and
discuss anything (not only) security related. Alternatively, you can share your thoughts and
feedback with us at info@invariant0.com as well.

## Warning & Disclaimer

The smart contract code in the examples is purposely vulnerable. DO NOT copy parts of the code into
your project, as you may copy a vulnerability, too. Beware that the code may contain more than a
single vulnerability.

## Changelog

This project is ever evolving. Please refer to the [Changelog](./CHANGELOG.md) to see the changes
over time.

## License

Licensed under GPL-3.0. Full license text can be found [here](./LICENSE).
