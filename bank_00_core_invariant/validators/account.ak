use aiken/collection/list
use cardano/transaction.{OutputReference, Transaction}
use types.{AccountDatum, AccountRedeemer, DecreaseBalance, IncreaseBalance}

validator account {
  spend(
    datum: Option<AccountDatum>,
    redeemer: AccountRedeemer,
    _o: OutputReference,
    tx: Transaction,
  ) {
    when redeemer is {
      IncreaseBalance -> True
      DecreaseBalance -> {
        expect Some(account_datum) = datum
        list.has(tx.extra_signatories, account_datum.owner)
      }
    }
  }

  else(_) {
    fail
  }
}
