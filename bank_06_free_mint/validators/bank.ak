use aiken/collection/list
use cardano/address.{Address, Script}
use cardano/assets.{PolicyId, lovelace_of, quantity_of}
use cardano/transaction.{
  Output, OutputReference, Transaction, find_script_outputs,
}
use types.{AccountDatum, ConfigDatum, account_token_name}
use utils.{get_account_datum, get_config_datum}

// The bank is a UTxO that holds all bank funds and validates:
// - Deposit: Funds are added to the bank and account datum updated
// - Withdrawal: Funds are leaving the bank and account datum updated
validator bank(config_policy_id: PolicyId) {
  spend(
    _datum: Option<Data>,
    _redeemer: Void,
    own_ref: OutputReference,
    tx: Transaction,
  ) {
    let Transaction { inputs, outputs, reference_inputs, .. } = tx

    let ConfigDatum { account_script_credential, .. } =
      get_config_datum(reference_inputs, config_policy_id)

    expect Some(own_input) =
      list.find(tx.inputs, fn(input) { input.output_reference == own_ref })
    expect Script(own_credential) = own_input.output.address.payment_credential
    expect [bank_output] = find_script_outputs(outputs, own_credential)

    let bank_input_value = lovelace_of(own_input.output.value)
    let bank_output_value = lovelace_of(bank_output.value)

    let maybe_account_input =
      inputs
        |> list.find(
            fn(input) {
              input.output.address.payment_credential == Script(
                account_script_credential,
              )
            },
          )
    // There is always an account output, find it. We don't allow closing accounts.
    expect Some(account_output) =
      outputs
        |> list.find(
            fn(output) {
              output.address.payment_credential == Script(
                account_script_credential,
              )
            },
          )
    let account_output_datum = get_account_datum(account_output)

    // for deposit, the fund difference is the amount deposited (positive)
    // for withdraw, the fund difference is the amount withdrawn (negative)
    let fund_difference = bank_output_value - bank_input_value

    // only "legal" accounts can be trusted
    // however, we allow no input as accounts have to be opened somehow
    let account_checks =
      when maybe_account_input is {
        Some(account_input) -> {
          let account_input_datum = get_account_datum(account_input.output)
          and {
            quantity_of(
              account_input.output.value,
              account_script_credential,
              account_token_name,
            ) > 0,
            // if there is an account input, the balance has to be updated, but can go both ways (deposit or withdraw)
            account_output_datum.balance == account_input_datum.balance + fund_difference,
          }
        }
        None -> and {
            // only deposit is okay in case there's no account input = no balance
            fund_difference >= 0,
            account_output_datum.balance == fund_difference,
          }
      }

    and {
      account_checks,
      // in any way, the account balance has to be updated correctly and can't go below 0
      account_output_datum.balance >= 0,
    }
  }

  else(_) {
    fail
  }
}
