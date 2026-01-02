use aiken/builtin
use aiken/collection/list
use cardano/address.{Address, Script}
use cardano/assets.{PolicyId}
use cardano/transaction.{OutputReference, Transaction}
use types.{
  AccountDatum, AccountRedeemer, ConfigDatum, DecreaseBalanceByCheque,
  DecreaseBalanceByOwner, IncreaseBalance, MakeChequesUsable,
}
use utils.{get_account_datum, get_config_datum}

validator account(config_policy_id: PolicyId) {
  mint(_redeemer: Void, _own_policy_id: PolicyId, tx: Transaction) {
    let Transaction { inputs, reference_inputs, .. } = tx
    let ConfigDatum { bank_script_credential, .. } =
      get_config_datum(reference_inputs, config_policy_id)

    // By finding a bank script input, we are sure that bank validator was run in this transaction
    inputs
      |> list.any(
          fn(input) {
            input.output.address.payment_credential == Script(
              bank_script_credential,
            )
          },
        )
  }

  spend(
    datum: Option<AccountDatum>,
    redeemer: AccountRedeemer,
    own_ref: OutputReference,
    tx: Transaction,
  ) {
    let Transaction { outputs, reference_inputs, .. } = tx

    expect Some(account_input_datum) = datum

    let ConfigDatum { bank_script_credential, .. } =
      get_config_datum(reference_inputs, config_policy_id)

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
      IncreaseBalance -> and {
          account_output_datum.balance > account_input_datum.balance,
          // no updates to the valid cheque ids are expected here
          account_output_datum.valid_cheque_ids == account_input_datum.valid_cheque_ids,
        }
      DecreaseBalanceByOwner -> and {
          account_output_datum.balance < account_input_datum.balance,
          list.has(tx.extra_signatories, account_input_datum.owner),
          // no updates to the valid cheque ids are expected here (although this is not strictly necessary to check here)
          account_output_datum.valid_cheque_ids == account_input_datum.valid_cheque_ids,
        }
      DecreaseBalanceByCheque { cheque_id, amount, key, signature } -> and {
          // the cheque id has to be valid
          list.has(account_input_datum.valid_cheque_ids, cheque_id),
          // the cheque id is removed from the valid list
          account_output_datum.valid_cheque_ids == list.filter(
            account_input_datum.valid_cheque_ids,
            fn(id) { id != cheque_id },
          ),
          // exactly the authorized amount has to be withdrawn, no less nor more
          account_output_datum.balance == account_input_datum.balance - amount,
          // the cheque is properly authorized - check the signature
          builtin.verify_ed25519_signature(
            key,
            builtin.serialise_data(amount),
            signature,
          ),
          // the signing party is the account owner
          builtin.blake2b_224(key) == account_input_datum.owner,
        }
      MakeChequesUsable { cheque_ids } -> and {
          // auth and sanity checks
          list.has(tx.extra_signatories, account_input_datum.owner),
          account_output_datum.balance == account_input_datum.balance,
          // ids are appended - it is up to the user to ensure they are not repeated here, etc
          account_output_datum.valid_cheque_ids == list.concat(
            account_input_datum.valid_cheque_ids,
            cheque_ids,
          ),
        }
    }
  }

  else(_) {
    fail
  }
}
