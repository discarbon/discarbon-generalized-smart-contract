# discarbon-generalized-smart-contract
This the smart contract to swap and retire carbon tokens.

This smart contract is planned to do the following tasks:

1. Receive/Get coins/tokens from the user.
2. Exchange for carbon token (NCT) on sushiswap.
3. Swap for TCO2 token from a project (default or user selectd).
4. Retire TCO2s.
5. Store the attendee address and offset amount.
6. Claim the NFT from Toucan

A more detailed description of the methods in the contract can be found in the
[automatically generated documentation](docs/disCarbonSwapAndRetire.md). We use
[dodoc](https://github.com/primitivefinance/primitive-dodoc) to generate it.

The contract is not yet deployed:

## How to get started

Install all dependencies

```npm install```

copy the "env" file to ".env" and fill in the needed Keys.

Fork the polygon mainnet

```hh node```

(need to have hardhat shorthand installed for this: ```npm i -g hardhat-shorthand```)

Deploy the pooling contract with:

`hh run scripts/deploy.js`


## Tests

Run tests using:

`hh test`

You can also run a forked chain locally and then deploy test on it by running:

`hh node`

in the first terminal window and:

`hh test --network localhost`

in the second terminal window to run the tests.

You can also locally deploy the contracts manually using:

`hh run scripts/deploy.js --network localhost`



## Deploy

Manual deployment can be done by first:

`hh run scripts/deploy.js --network polygon`

and then verify the contract:

`hh verify 0xb6A5D547d0A325Ffa0357E2698eB76E165b606BA --network polygon`