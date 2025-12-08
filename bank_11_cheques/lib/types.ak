use aiken/crypto.{ScriptHash}

pub type ConfigDatum {
  bank_script_credential: ScriptHash,
  account_script_credential: ScriptHash,
}

// Account script types
pub type AccountDatum {
  // amount of ADA deposited into the bank by this account, can be withdrawn
  balance: Int,
  // pub key hash of the owner
  owner: ByteArray,
}

pub type AccountRedeemer {
  IncreaseBalance
  DecreaseBalanceByOwner
  DecreaseBalanceByCheque { amount: Int, key: ByteArray, signature: ByteArray }
}

// constant token name for the account token
pub const account_token_name = "A"

// constant token name for the config token
pub const config_token_name = "CONFIG"
