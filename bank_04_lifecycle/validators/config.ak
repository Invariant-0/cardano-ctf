use aiken/collection/list
use aiken/crypto.{ScriptHash}
use cardano/address.{Address, Script}
use cardano/assets.{lovelace_of}
use cardano/transaction.{
  Output, OutputReference, Transaction, find_script_outputs,
}
use types.{AccountDatum, ConfigDatum}
use utils.{get_account_datum}

// The config is a UTxO that holds all global config data:
// - The script hash of the bank validator
// - The script hash of the account validator
validator config {
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
