import { HardhatUserConfig } from "hardhat/config";
import '@openzeppelin/hardhat-upgrades';
import "@nomicfoundation/hardhat-toolbox";
import "./scripts/upgrade";
import "./scripts/verify-version";
import "./scripts/deploy";

const PRIVATE_KEY = process.env['GOERLI_PRIVAT_KEY'] as string;

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
    },
    goerli: {
      url: `https://eth-goerli.g.alchemy.com/v2/${process.env['ALCHEMY_GOERLI_API_KEY']}`,
      accounts: [PRIVATE_KEY]
    }
  },
  solidity: "0.8.9",
};

export default config;
