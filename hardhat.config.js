/** @type import('hardhat/config').HardhatUserConfig */

require("@nomicfoundation/hardhat-ethers");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: { enabled: true, runs: 200 }
    }
  },

  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC,
      chainId: Number(process.env.SEPOLIA_CHAIN_ID),
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },
    iitbhilaiBlockchain: {
      url: process.env.IITBH_RPC,
      chainId: Number(process.env.IITBH_CHAIN_ID),
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    }
  }
};
