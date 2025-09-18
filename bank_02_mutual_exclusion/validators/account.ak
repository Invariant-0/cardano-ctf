use aiken/collection/list
use cardano/address.{Address, Script}
use cardano/transaction.{OutputReference, Transaction}
use types.{AccountDatum, AccountRedeemer, DecreaseBalance, IncreaseBalance}
use utils.{get_account_datum}

validator account {
  spend(
    datum: Option<AccountDatum>,
    redeemer: AccountRedeemer,
    own_ref: OutputReference,
    tx: Transaction,
  ) {
    let Transaction { outputs, .. } = tx

    expect Some(account_input_datum) = datum

    expect Some(own_input) =
      list.find(tx.inputs, fn(input) { input.output_reference == own_ref })
    expect Script(own_credential) = own_input.output.address.payment_credential

    // We don't care about the output too much, we just need to make sure there is one
    expect Some(_account_output) =
      outputs
        |> list.find(
            fn(output) {
              and {
                output.address.payment_credential == Script(own_credential),
                get_account_datum(output).owner == account_input_datum.owner,
              }
            },
          )

    when redeemer is {
      IncreaseBalance -> True
      DecreaseBalance ->
        list.has(tx.extra_signatories, account_input_datum.owner)
    }
  }

  else(_) {
    fail
  }
}
