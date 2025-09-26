use cardano/transaction.{InlineDatum, Input, Output}
use types.{AccountDatum, ConfigDatum}

pub fn get_account_datum(account_output: Output) -> AccountDatum {
  expect InlineDatum(account_datum_raw) = account_output.datum
  expect account_datum: AccountDatum = account_datum_raw
  account_datum
}

pub fn get_config_datum(config_ref_input: Option<Input>) -> ConfigDatum {
  expect Some(config_input) = config_ref_input
  expect InlineDatum(config_datum_raw) = config_input.output.datum
  expect config_datum: ConfigDatum = config_datum_raw
  config_datum
}
