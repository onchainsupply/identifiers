require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./contracts",
    artifacts: "./dist/artifacts",
  },
  typechain: {
    outDir: "dist/types",
    target: "ethers-v6",
  },
  networks: {
    etherlinkMainnet: {
      url: "https://node.mainnet.etherlink.com",
      accounts: [process.env.OCS_PRIVATE_KEY],
    },
    etherlinkTestnet: {
      url: "https://node.ghostnet.etherlink.com",
      accounts: [process.env.OCS_PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      etherlinkMainnet: "abc",
      etherlinkTestnet: "abc",
    },
    customChains: [
      {
        network: "etherlinkMainnet",
        chainId: 42793,
        urls: {
          apiURL: "https://explorer.etherlink.com/api",
          browserURL: "https://explorer.etherlink.com",
        },
      },
      {
        network: "etherlinkTestnet",
        chainId: 128123,
        urls: {
          apiURL: "https://testnet.explorer.etherlink.com/api",
          browserURL: "https://testnet.explorer.etherlink.com",
        },
      },
    ],
  },
};
