# discarbon-devcon-attendee-contract
This the smart contract for the devcon attendees to buy carbon tokens and send them to a wallet.

This smart contract has the following tasks:

1. Receive/Get coins/tokens from attendee.
2. Exchange for carbon token (NCT) on sushiswap.
3. Forward carbon token to a preprogrammed wallet address.
4. Store the attendee address and offset amount to issue a POAP.


## How to get started

Deploy the pooling contract with _

`npx hardhat run scripts/deploy_pooling.js`


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
