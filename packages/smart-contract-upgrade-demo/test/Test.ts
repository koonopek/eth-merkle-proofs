import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { CounterV1 } from "../typechain-types";

const INIT_COUNTER_VALUE = 420;
const IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

describe("Proxy detector PoC", function () {
  async function deployV1Upgradable() {

    const [owner, otherAccount] = await ethers.getSigners();

    const CounterV1 = await ethers.getContractFactory("CounterV1");

    const counterV1 = (await upgrades.deployProxy(CounterV1, [INIT_COUNTER_VALUE])) as CounterV1; // proxy all calls, so same interface
    await counterV1.deployed();

    return { counterV1, owner, otherAccount };
  };


  it('should increment counter', async function () {
    const { counterV1, owner } = await loadFixture(deployV1Upgradable);

    await expect(counterV1.connect(owner).inc()).not.to.be.reverted;

    expect(
      await counterV1.connect(owner).getCounter()
    ).to.be.eq(INIT_COUNTER_VALUE + 1);
  });

  it('should update implementation', async function () {
    const { counterV1, owner } = await loadFixture(deployV1Upgradable);
    await expect(counterV1.connect(owner).inc()).not.to.be.reverted;

    expect(
      await counterV1.connect(owner).getCounter()
    ).to.be.eq(INIT_COUNTER_VALUE + 1);

    const CounterV2 = await ethers.getContractFactory("CounterV2");
    const counterV2 = await upgrades.upgradeProxy(counterV1, CounterV2);

    await expect(counterV2.connect(owner).inc()).not.to.be.reverted;

    expect(
      await counterV1.connect(owner).getCounter()
    ).to.be.eq(INIT_COUNTER_VALUE + 1 + 2); // now counter increase by 2 as in new implementation
  });

  it('should notice change of implementation', async () => {
    const { counterV1 } = await loadFixture(deployV1Upgradable);

    const storageAtV1 = await ethers.provider.getStorageAt(counterV1.address, IMPLEMENTATION_SLOT, "latest");
    console.log(`Implementation behind proxy V1 (before upgrade):${storageAtV1}`)

    const CounterV2 = await ethers.getContractFactory("CounterV2");
    const counterV2 = await upgrades.upgradeProxy(counterV1, CounterV2);

    const storageAtV2 = await ethers.provider.getStorageAt(counterV2.address, IMPLEMENTATION_SLOT, "latest");
    console.log(`Implementation behind proxy V2 (after upgrade):${storageAtV2}`)

    expect(storageAtV1).not.to.eq(storageAtV2);
  });

});
