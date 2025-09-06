# Solution recording

To monitor all CTF solutions, we've devised this simple smart contract. Once a task is successfully
completed on the testnet, an additional transaction is initiated, creating a UTxO at its address.
This UTxO logs a successful solution, comprising the task ID, the solution timestamp, and the
solver's address.

Note that these details are already publicly accessible on the testnet as part of the successful
submission. Thus, no private information is disclosed at any moment. This approach, however, lets us
track the solutions more easily and even you can display them using the `scoreboard.ts` script.

To ensure a fixed smart contract address, we've embedded the address into the code using the
`SOLUTION_RECORD_ADDRESS` variable. The smart contract is parametrized so its address won't clash
with a simple "always yields false" validator that could be used by other developers as well.
