## Version 2.0.0 - [2025-09-13]

### Changed

- **BREAKING**: Migrated from Lucid to Lucid Evolution library for better maintanance support and
  newer features.
- **BREAKING**: Replaced Deno with Node.js + Yarn for package management and task execution.
- Updated all task commands from `deno run --allow-net --allow-read ./scripts/run.ts` to
  `yarn task:XX` with `XX` being the task number.
- Scoreboard is run with `yarn scoreboard` now and key generation with `yarn gen-keys`.
- If a Blockfrost _get_ transaction status call fails, it retries instead of failing the run.
- **Migration notes**: It is natural that your solutions will not run straight away after upgrading,
  as lucid-evolution API is a little bit different. Please check out `player_template` files again
  to see how the transaction building should work now. To double-check that all your solutions still
  work, you can temporarily disable testnet runs in `config.ts` and run all solutions in emulator by
  running `./scripts/run_all.sh`.

## Version 1.0.0 - [2024-05-20] - tag #ctf-1.0

### Added

- Project closeout report and link to the closeout video on Youtube.

### Changed

- The messages you get when you solve a task successfully changed in a few levels. They now refer to
  new blogs that have been published in the meantime.

## Version 0.5.0 - [2024-03-29]

### Added

- A simple `scripts/run_all.sh` script that runs all the tasks. Useful for testing.

### Fixed

- Explicitly specified minAda for each created UTxO. It should make the code even more stable.
- Fixed a test in the [01_sell_nft](./01_sell_nft/) task which was not working properly. Please
  rerun the tests to find out whether you solved the task properly or not yet. Unified balance
  computation in other tasks as well.

### Changed

- Simplifying of the `config_temp.ts` file and moving non-variable parts into the `setup_lucid.ts`
  file. The change should be backwards compatible.
- Adding utility functions for reading validators and minting policies to not repeat ourselves.
- Making other small, non-breaking refactor changes.

## Version 0.4.1 - [2024-03-02]

### Added

- We added the [scoreboard](./scoreboard.ts) script, useful for displaying the number of people that
  solved the tasks.

### Fixed

- Explicitly specified minAda for the solution recording UTxO creation transaction. It should be
  more stable.

## Version 0.4 (Milestone 4) - [2024-02-20]

### Added

- We added **three more complex tasks**:
  - [lending](./08_lending/)
  - [multisig_treasury_v3](./09_multisig_treasury_v3/)
  - [king_of_cardano](./10_king_of_cardano/)
- We added **videos** for clear Milestone achievement purposes.

### Changed

- The logging of transaction details is reworked and unified. The logs should be consistent and
  beautiful.
- `player_template`s across the codebase have been updated. If you want the update, please modify
  your `player.ts` files by comparing it to the `player_template.ts`. If you don't care, you don't
  need to do anything. We kept the previous logging system as well so we don't break your files.
- We added and modified some common logic. It should have no impact on any of the previous tasks.
- Solution aggregation: To better track the users' progress, we utilize a custom smart contract for
  aggregating the number of correct solutions. It's important to note that this contract **does not
  gather any private information**, it solely collects data already publicly available on the
  testnet in a more accessible format.

## Version 0.3 (Milestone 3) - [2024-01-19]

### Added

- We added **three more tasks**:
  - [purchase_offer](./05_purchase_offer/)
  - [tipjar_v2](./06_tipjar_v2/)
  - [multisig_treasury_v2](./07_multisig_treasury_v2/)
- We added **videos** for clear Milestone achievement purposes.

### Changed

- The code of setting the game up, running the interaction and testing whether the level is
  successfully completed is now abstracted into a `runTask` function located inside
  `common/offchain/utils.ts` and run from `run.ts`.
- The `player_template.ts` and the `player.ts` now contain only the interactions with an already set
  up environment.
- These changes are made for all levels. If you have a legacy `player.ts`, compare
  `player_template.ts` to it to find out what needs to be updated for it to work properly.

## Version 0.2 (Milestone 2) - [2023-12-15]

### Added

- We added the **Lucid emulator** as an alternative to running on the testnet. It speeds up playing
  the game significantly. No more waiting times for unsuccessful runs!
- We added **three more tasks**:
  - [vesting](./02_vesting/)
  - [multisig_treasury](./03_multisig_treasury/)
  - [tipjar](./04_tipjar/)
- We added **videos** for even clearer Milestone achievement purposes.

### Changed

- Tests run now first on the emulator. Only if they pass on the emulator, they are run on the
  testnet as well. The behavior can be changed in the config.
- The player now edits the file `player.ts` and starts the tests by running `run.ts`.
- These changes make the videos for Milestone 1 slightly imprecise, refer to the updated READMEs for
  precise instructions.

## Version 0.1 (Milestone 1) - [2023-11-15]

### Added

- We added the framework.
- **Two tasks**: [hello_world](./00_hello_world/) and [sell_nft](./01_sell_nft/).
- We included **videos** for the Milestone completion.
