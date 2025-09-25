use aiken/collection/list
use cardano/address.{Address, Script}
use cardano/transaction.{OutputReference, Transaction}
use types.{
  AccountDatum, AccountRedeemer, ConfigDatum, DecreaseBalance, IncreaseBalance,
}
use utils.{get_account_datum, get_config_datum}

validator account {
  spend(
    datum: Option<AccountDatum>,
    redeemer: AccountRedeemer,
    own_ref: OutputReference,
    tx: Transaction,
  ) {
    let Transaction { outputs, reference_inputs, .. } = tx

    expect Some(account_input_datum) = datum

    let ConfigDatum { bank_script_credential, .. } =
      get_config_datum(reference_inputs |> list.head)

    expect Some(own_input) =
      list.find(tx.inputs, fn(input) { input.output_reference == own_ref })
    expect Script(own_credential) = own_input.output.address.payment_credential

    expect Some(account_output) =
      outputs
        |> list.find(
            fn(output) {
              and {
                output.address.payment_credential == Script(own_credential),
                get_account_datum(output).owner == account_input_datum.owner,
              }
            },
          )
    let account_output_datum = get_account_datum(account_output)

    // there has to be a bank input, meaning the bank validation is run as well
    expect Some(_bank_input) =
      tx.inputs
        |> list.find(
            fn(input) {
              input.output.address.payment_credential == Script(
                bank_script_credential,
              )
            },
          )

    when redeemer is {
      IncreaseBalance ->
        account_output_datum.balance > account_input_datum.balance
      DecreaseBalance -> and {
          account_output_datum.balance < account_input_datum.balance,
          list.has(tx.extra_signatories, account_input_datum.owner),
        }
    }
  }

  else(_) {
    fail
  }
}
