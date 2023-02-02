require("@nomicfoundation/hardhat-toolbox");
require("dotenv/config")
require('@primitivefi/hardhat-dodoc');  // creates docs from every time one compiles
require("hardhat-gas-reporter");


// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.17",
  networks: {
    hardhat: {
      forking: {
        url: process.env.POLYGON_RPC_URL,
        blockNumber: 38824166, // https://polygonscan.com/block/38824166 Feb-02-2023 01:30:00 PM +UTC
      }
    },
    polygon: {
      url: "https://polygon-rpc.com",
      accounts: {
        mnemonic: process.env.MNEMONIC,
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20,
        passphrase: "",
      },
    }
  },
  etherscan: {
    apiKey: process.env.POLYGONSCAN_API_KEY
  },
  dodoc: {
    runOnCompile: true,
    debugMode: false,
    exclude: ['interfaces', 'types', '@openzeppelin'],
  },
  gasReporter: {
    currency: 'ETH',
    gasPrice: 30,
    enabled: true
  }
};
