import { task } from "hardhat/config";
import { deploy } from "./deploy";
import {IMPLEMENTATION_SLOT, upgrade} from "./upgrade";
import { verifyVersion } from "./verify-version";

task("demo")
  .setAction(demo);

export async function demo(_: any, {ethers, upgrades}: any) {
    console.log("\n### DEPLOYING ###\n")
    const deployResult = await deploy({},{ethers, upgrades});
  
    const blockNumber = await ethers.provider.getBlockNumber();
    
    console.log("\n### VERIFING VERSION BEFORE UPGRADE###\n")
    await verifyVersion({proxyAddress: deployResult.proxyAddress, implAddress: deployResult.implAddress, storageSlot: IMPLEMENTATION_SLOT, blockNumber}, {ethers});

    console.log("\n### UPGRADING ###\n")
    await upgrade({proxyAddress: deployResult.proxyAddress}, {ethers, upgrades});
  
    const blockNumberAfterUpgrade = await ethers.provider.getBlockNumber();
    console.log("\n### VERIFING VERSION AFTER UPGRADE ###\n")
    await verifyVersion({proxyAddress: deployResult.proxyAddress, implAddress: deployResult.implAddress, storageSlot: IMPLEMENTATION_SLOT, blockNumber: blockNumberAfterUpgrade}, {ethers});
}