import { task } from "hardhat/config";

task("deploy", "Deploy upgradable contract")
  .setAction(main);

const INIT_COUNTER_VALUE = 0;

const IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

async function main(_args: any, {ethers, upgrades}: any) {
  const CounterV1 = await ethers.getContractFactory("CounterV1");

  const counterV1 = (await upgrades.deployProxy(CounterV1, [INIT_COUNTER_VALUE]));
  await counterV1.deployed();

  const implAddres = await ethers.provider.getStorageAt(counterV1.address, IMPLEMENTATION_SLOT, "latest");
  console.log(`Deployed counterV1:\n\tproxy address: ${counterV1.address}\n\timpl address ${implAddres}\n\tat slot ${IMPLEMENTATION_SLOT}`)
}

