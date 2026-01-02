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
  // these cheques can be redeemed when distributed by the owner
  valid_cheque_ids: List<Int>,
}

pub type AccountRedeemer {
  IncreaseBalance
  DecreaseBalanceByOwner
  DecreaseBalanceByCheque {
    cheque_id: Int,
    amount: Int,
    key: ByteArray,
    signature: ByteArray,
  }
  MakeChequesUsable { cheque_ids: List<Int> }
}

// constant token name for the account token
pub const account_token_name = "A"

// constant token name for the config token
pub const config_token_name = "CONFIG"
