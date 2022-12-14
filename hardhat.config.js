require("@nomicfoundation/hardhat-toolbox");
require("dotenv/config")
require('@primitivefi/hardhat-dodoc');  // creates docs from every time one compiles


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
        url: "https://polygon-mainnet.g.alchemy.com/v2/" + process.env.ALCHEMY_POLYGON_API_KEY,
        blockNumber: 35713480, // Nov 17th 2022, around 08:58 UTC
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
  }
};
