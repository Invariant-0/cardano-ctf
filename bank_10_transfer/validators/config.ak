use aiken/collection/list
use aiken/crypto.{ScriptHash}
use cardano/address.{Address, Script}
use cardano/assets.{PolicyId, flatten, lovelace_of}
use cardano/transaction.{
  Output, OutputReference, Transaction, TransactionId, find_script_outputs,
}
use types.{AccountDatum, ConfigDatum, config_token_name}
use utils.{get_account_datum}

// The config is a UTxO that holds all global config data:
// - The script hash of the bank validator
// - The script hash of the account validator
// It has to own a one-shot config token, otherwise it can not be trusted.
validator config(bootstrap_utxo_tx: TransactionId, bootstrap_utxo_idx: Int) {
  mint(_redeemer: Void, own_policy_id: PolicyId, tx: Transaction) {
    let Transaction { mint, inputs, .. } = tx
    expect [(policy_id, token_name, quantity)] = flatten(mint)

    // Note: We do NOT check where the token goes.
    // It's OK as invalid initial configuration just makes the whole protocol not trusted; before users even start using it.
    and {
      list.any(
        inputs,
        fn(input) {
          and {
            input.output_reference.transaction_id == bootstrap_utxo_tx,
            input.output_reference.output_index == bootstrap_utxo_idx,
          }
        },
      )?,
      policy_id == own_policy_id,
      token_name == config_token_name,
      quantity == 1,
    }
  }

  spend(
    _datum: Option<ConfigDatum>,
    _redeemer: Void,
    _own_ref: OutputReference,
    _tx: Transaction,
  ) {
    False
  }

  else(_) {
    fail
  }
}
