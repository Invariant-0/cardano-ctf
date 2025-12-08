use aiken/collection/dict
use aiken/collection/list
use cardano/address.{Address, Script}
use cardano/assets.{PolicyId, lovelace_of, quantity_of, tokens}
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
    let Transaction { inputs, outputs, mint, reference_inputs, .. } = tx

    let ConfigDatum { account_script_credential, .. } =
      get_config_datum(reference_inputs, config_policy_id)
    expect Some(own_input) =
      list.find(tx.inputs, fn(input) { input.output_reference == own_ref })
    expect Script(own_credential) = own_input.output.address.payment_credential

    // ensures there's just a single bank input
    expect [_bank_input] =
      find_script_outputs(
        inputs |> list.map(fn(input) { input.output }),
        own_credential,
      )
    expect [bank_output] = find_script_outputs(outputs, own_credential)

    let bank_input_value = lovelace_of(own_input.output.value)
    let bank_output_value = lovelace_of(bank_output.value)

    let maybe_account_inputs =
      inputs
        |> list.filter(
            fn(input) {
              input.output.address.payment_credential == Script(
                account_script_credential,
              )
            },
          )
    // There is always an account output, find it. We don't allow closing accounts.
    expect [account_output, ..more_account_outputs] =
      outputs
        |> list.filter(
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

    let minted_account_tokens =
      mint |> tokens(account_script_credential) |> dict.to_pairs()

    // only "legal" accounts can be trusted
    // however, we allow no input as accounts have to be opened somehow
    // also, we allow two account inputs in transfer flow, but not more
    let account_checks =
      when maybe_account_inputs is {
        [account_input1, account_input2] -> {
          expect [account_output2] = more_account_outputs
          let account_output_datum2 = get_account_datum(account_output2)

          let account_input_datum1 = get_account_datum(account_input1.output)
          let account_input_datum2 = get_account_datum(account_input2.output)

          and {
            // no account tokens should be minted here
            list.is_empty(minted_account_tokens),
            // the inputs have account tokens
            quantity_of(
              account_input1.output.value,
              account_script_credential,
              account_token_name,
            ) > 0,
            quantity_of(
              account_input2.output.value,
              account_script_credential,
              account_token_name,
            ) > 0,
            // the outputs have account tokens
            quantity_of(
              account_output.value,
              account_script_credential,
              account_token_name,
            ) > 0,
            quantity_of(
              account_output2.value,
              account_script_credential,
              account_token_name,
            ) > 0,
            // balance of participating inputs == balance of participating outputs
            account_input_datum1.balance + account_input_datum2.balance == account_output_datum.balance + account_output_datum2.balance,
            // fund difference is zero because this is the transfer flow, no deposits / withdrawals allowed here
            fund_difference == 0,
            // in any way, account balances have to be updated correctly and can't go below 0. This is relevant to the second account as well!
            account_output_datum2.balance >= 0,
          }
        }
        [account_input] -> {
          let account_input_datum = get_account_datum(account_input.output)
          and {
            // just a single account output is expected here
            list.is_empty(more_account_outputs),
            // no account tokens should be minted here
            list.is_empty(minted_account_tokens),
            // the input has the token
            quantity_of(
              account_input.output.value,
              account_script_credential,
              account_token_name,
            ) > 0,
            // the output has the token
            quantity_of(
              account_output.value,
              account_script_credential,
              account_token_name,
            ) > 0,
            // if there is an account input, the balance has to be updated, but can go both ways (deposit or withdraw)
            account_output_datum.balance == account_input_datum.balance + fund_difference,
          }
        }
        [] -> {
          expect [Pair(minted_token_name, minted_quantity)] =
            minted_account_tokens
          and {
            // just a single account output is expected here
            list.is_empty(more_account_outputs),
            // only one account token is minted here
            minted_token_name == account_token_name,
            minted_quantity == 1,
            // the newly minted account token has to go to the account output
            quantity_of(
              account_output.value,
              account_script_credential,
              account_token_name,
            ) > 0,
            // only deposit is okay in case there's no account input = no balance
            fund_difference >= 0,
            account_output_datum.balance == fund_difference,
          }
        }
        _ -> fail @"more than two account inputs not supported for safety"
      }

    and {
      account_checks,
      // in any way, account balances have to be updated correctly and can't go below 0
      account_output_datum.balance >= 0,
    }
  }

  else(_) {
    fail
  }
}
