require("@nomicfoundation/hardhat-toolbox");
require("dotenv/config")
require('@primitivefi/hardhat-dodoc');  // creates docs from every time one compiles

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

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
        url: "https://polygon-rpc.com",
        // url: "https://polygon-mainnet.g.alchemy.com/v2/" + process.env.ALCHEMY_POLYGON_API_KEY,
        blockNumber: 30713275  // July 14th 2022, around 12:20 UTC
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
};