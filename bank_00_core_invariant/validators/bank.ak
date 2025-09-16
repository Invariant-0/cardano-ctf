use aiken/collection/list
use aiken/crypto.{ScriptHash}
use cardano/address.{Address, Script}
use cardano/assets.{lovelace_of}
use cardano/transaction.{
  InlineDatum, Output, OutputReference, Transaction, find_script_outputs,
}
use types.{AccountDatum}

// The bank is a UTxO that holds all bank funds and validates:
// - Deposit: Funds are added to the bank and account datum updated
// - Withdrawal: Funds are leaving the bank and account datum updated
validator bank(account_script_credential: ScriptHash) {
  spend(
    _datum: Option<Data>,
    _redeemer: Void,
    own_ref: OutputReference,
    tx: Transaction,
  ) {
    let Transaction { inputs, outputs, .. } = tx

    expect Some(own_input) =
      list.find(tx.inputs, fn(input) { input.output_reference == own_ref })
    expect Script(own_credential) = own_input.output.address.payment_credential
    expect [bank_output] = find_script_outputs(outputs, own_credential)

    let bank_input_value = lovelace_of(own_input.output.value)
    let bank_output_value = lovelace_of(bank_output.value)

    // There is always an account input doing a bank operation, find it
    expect Some(account_input) =
      inputs
        |> list.find(
            fn(input) {
              input.output.address.payment_credential == Script(
                account_script_credential,
              )
            },
          )
    expect Some(account_output) =
      outputs
        |> list.find(
            fn(output) {
              output.address.payment_credential == Script(
                account_script_credential,
              )
            },
          )
    let account_input_datum = get_account_datum(account_input.output)
    let account_output_datum = get_account_datum(account_output)

    // for deposit, the fund difference is the amount deposited (positive)
    // for withdraw, the fund difference is the amount withdrawn (negative)
    let fund_difference = bank_output_value - bank_input_value

    // in any way, the account balance has to be updated correctly
    account_output_datum.balance == account_input_datum.balance + fund_difference
  }

  else(_) {
    fail
  }
}

pub fn get_account_datum(account_output: Output) -> AccountDatum {
  expect InlineDatum(account_datum_raw) = account_output.datum
  expect account_datum: AccountDatum = account_datum_raw
  account_datum
}
