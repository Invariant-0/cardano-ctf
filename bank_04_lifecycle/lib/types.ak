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
  DecreaseBalance
}
