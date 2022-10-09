import { HardhatUserConfig } from "hardhat/config";
import '@openzeppelin/hardhat-upgrades';
import "@nomicfoundation/hardhat-toolbox";
import "./scripts/upgrade";
import "./scripts/verify-version";
import "./scripts/deploy";
import "./scripts/demo";


const PRIVATE_KEY = process.env['GOERLI_PRIVAT_KEY'];
const ALCHEMY_API_KEY = process.env['ALCHEMY_GOERLI_API_KEY'];

if(!PRIVATE_KEY || !ALCHEMY_API_KEY) {
  console.log("Demo is deployed on GOERLI testnet levarging alchemy api. To run demo please set up env variables: GOERLI_PRIVAT_KEY (funded with free eth) and ALCHEMY_GOERLI_API_KEY");
  process.exit(1);
}


const config: HardhatUserConfig = {
  networks: {
    hardhat: {
    },
    goerli: {
      url: `https://eth-goerli.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [PRIVATE_KEY]
    }
  },
  solidity: "0.8.9",
};

export default config;
