import { task } from "hardhat/config";

task("upgrade", "Upgrade contract levarging proxy")
  .addPositionalParam("proxyAddress")
  .setAction(main);

const IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

async function main({proxyAddress} : {proxyAddress: string}, {ethers, upgrades}: any) {
  const counterV2Contract = await ethers.getContractFactory("CounterV2");

  const counterV2 = (await upgrades.upgradeProxy(proxyAddress, counterV2Contract));
  await counterV2.deployed();

  const implAddres = await ethers.provider.getStorageAt(counterV2.address, IMPLEMENTATION_SLOT, "latest");
  console.log(`Upgraded proxy for counterV2:\n\tproxy address: ${counterV2.address}\n\timpl address ${implAddres}\n\tat slot ${IMPLEMENTATION_SLOT}`)
}
