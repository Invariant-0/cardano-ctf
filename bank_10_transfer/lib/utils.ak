use aiken/collection/list
use cardano/assets.{PolicyId, quantity_of}
use cardano/transaction.{InlineDatum, Input, Output}
use types.{AccountDatum, ConfigDatum, config_token_name}

pub fn get_account_datum(account_output: Output) -> AccountDatum {
  expect InlineDatum(account_datum_raw) = account_output.datum
  expect account_datum: AccountDatum = account_datum_raw
  account_datum
}

pub fn get_config_datum(
  ref_inputs: List<Input>,
  config_policy_id: PolicyId,
) -> ConfigDatum {
  expect Some(config_input) =
    ref_inputs
      |> list.find(
          fn(input) {
            quantity_of(input.output.value, config_policy_id, config_token_name) == 1
          },
        )
  expect InlineDatum(config_datum_raw) = config_input.output.datum
  expect config_datum: ConfigDatum = config_datum_raw
  config_datum
}
