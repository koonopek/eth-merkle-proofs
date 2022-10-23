import { HardhatUserConfig } from "hardhat/config";
import '@openzeppelin/hardhat-upgrades';
import "@nomicfoundation/hardhat-toolbox";
import "./scripts/test-data";

// const PRIVATE_KEY = process.env['GOERLI_PRIVAT_KEY'] as string;
// const ALCHEMY_API_KEY = process.env['ALCHEMY_GOERLI_API_KEY'] as string;

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
    },
    // goerli: {
    //   url: `https://eth-goerli.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    //   accounts: [`0x${PRIVATE_KEY}`]
    // },
    truffle: {
      url: 'http://localhost:9545',
      accounts: ['0x8646e9a8e7b0d9d171041af9bba1095831e5f5e4c07dc624eb06cfbf34e45f1e']
    }
  },
  solidity: "0.8.9",
};

export default config;
