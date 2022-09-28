# discarbon-devcon-attendee-contract
This the smart contract for the devcon attendees to buy carbon tokens and send them to a wallet.

This smart contract has the following tasks:

1. Receive/Get coins/tokens from attendee.
2. Exchange for carbon token (NCT) on sushiswap.
3. Forward carbon token to a preprogrammed wallet address.
4. Store the attendee address and offset amount to issue a POAP.

A more detailed descirption of the methods in the contract can be found in the
[automatically generated documentation](docs/Devcon_Offset_Pool.md).

The contract is deployed on the polygon mainnet: [0x2608cDFCAe67d96A120bba7407d75c1F871221f6](https://polygonscan.com/address/0x2608cDFCAe67d96A120bba7407d75c1F871221f6)

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

`hh verify 0x2608cDFCAe67d96A120bba7407d75c1F871221f6 --network polygon`

## hardhat sample project readme

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a script that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
GAS_REPORT=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.js
```
