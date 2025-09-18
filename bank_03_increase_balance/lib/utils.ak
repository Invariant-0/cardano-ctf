use cardano/transaction.{InlineDatum, Output}
use types.{AccountDatum}

pub fn get_account_datum(account_output: Output) -> AccountDatum {
  expect InlineDatum(account_datum_raw) = account_output.datum
  expect account_datum: AccountDatum = account_datum_raw
  account_datum
}
