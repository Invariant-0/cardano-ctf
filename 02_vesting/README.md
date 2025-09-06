# vesting

In this level, you are presented with a straightforward vesting smart contract. The contract locks a
certain amount of ADA assets, allowing the beneficiary to claim them in full once the specified
vesting period expires. In our example, the vesting period is set to 5 hours. However, waiting for
it is boring. Your task is to uncover the concealed vulnerability in the smart contract and unlock
the funds much sooner.

The setup involves creating a vesting UTxO that secures an ADA amount for a 5-hour period, with you
as the sole beneficiary.

## On-chain code

There is a single validator in `vesting.ak`.

Note the additional `?` after certain logical predicates in the code. These indicators assist in
pinpointing where the validator fails. You can check the documentation
[here](https://aiken-lang.org/language-tour/troubleshooting#-operator). To display the stack trace
of failed predicates, the validator needs to be compiled with a corresponding flag which may depend
on your Aiken version. The `--keep-traces` in older versions or `-t verbose` in newer ones. Check
the `aiken build --help` for more information.

## Off-chain code

Similar to the previous levels, you need to duplicate the `player_template.ts` file, naming it
`player.ts`, and executing the off-chain code with `yarn task:02` from the project root.

### Timestamps

Vesting operates with timestamps. However, the emulator used for testing contains an own internal
clock that does not correspond to the current time. This creates a discrepancy between the code run
on the emulator and on the testnet, each requiring different timestamps. To address this issue, the
`getCurrentTime(lucid)` function was introduced. This function returns the current timestamp (in
milliseconds) based on the used framework. You can then manipulate this timestamp as usual.

For instance, the timestamp at the time of the vesting creation could be `getCurrentTime(lucid)` and
the resulting vesting end would then be set to `getCurrentTime(lucid) + 5 * 60 * 60 * 1000`.

### Transaction building

Transactions in this level are somewhat more intricate, involving the setting of multiple additional
parameters to build the transactions. To understand the workings of these options and explore other
configurable parameters, refer to the
[Lucid Evolution documentation](https://github.com/Anastasia-Labs/lucid-evolution). While this level
provides all the necessary information, understanding the full extent of your options can prove
valuable in later levels.
