import assert from "assert";
import { task } from "hardhat/config";
import { createAccountProof, createHeaderProof, createStorageSlotProof, FullAccountProof, FullStorageSlotProof, HeaderProof } from "js-prover";
import { VerifedAccountState, VerifiedHeader, VerifiedStorageSlotState } from "js-verifer";
import { promises as fs } from 'fs';
import * as path from 'path';

task("test-data", "Generate test data")
  .setAction(generateTestData);

export enum ProofType {
  Header = "PROOF_HEADER",
  Account = "PROOF_ACCOUNT",
  Slot = "PROOF_SLOT"
}

export type TestStorageSlotProof = {
  desc?: string,
  type: ProofType.Slot,
  proof: FullStorageSlotProof,
  expectedValue: VerifiedStorageSlotState,
  trustedBlockHash: string,
}

export type TestAccountProof = {
  desc?: string,
  type: ProofType.Account,
  proof: FullAccountProof,
  expectedValue: VerifedAccountState,
  trustedBlockHash: string,
}

export type TestHeaderProof = {
  desc?: string,
  type: ProofType.Header,
  proof: HeaderProof,
  expectedValue: VerifiedHeader,
  trustedBlockHash: string,
}

const MEMORY_SLOT_COUNTERV1 = "0x0";
const FILE_PATH = path.resolve(__dirname, "..", "data.json");

export async function generateTestData(_args: any, { ethers }: { ethers: any }) {
  console.log("Starting generating test proofs");

  const headerProofs = await genHeaderProofs(ethers);
  console.log("Generate header proofs")
  const accountProofs = await genAccountProofs(ethers);
  console.log("Generated account proofs")
  const storageSlotProofs = await genStorageSlotProofs(ethers);
  console.log("Generated storage slot proofs")

  const testData = {
    when: new Date().toISOString(),
    network: await ethers.provider.getNetwork(),
    testData: {
      storageSlotProofs,
      accountProofs,
      headerProofs
    }
  }

  const currentData = JSON.parse(await fs.readFile(FILE_PATH).then((c: any) => c.toString()));

  currentData.push(testData);
 
  console.log(`Appending generated test-data to ${FILE_PATH}`)
  await fs.writeFile(FILE_PATH, JSON.stringify(currentData, undefined, 4))
}

async function genStorageSlotProofs(ethers: any) {
  const CounterV1 = await ethers.getContractFactory("CounterV1");

  const counterV1 = await CounterV1.deploy();
  await counterV1.deployed();
  const testRecords: TestStorageSlotProof[] = [];

  for (let value = 0; value < 10; value++) {
    await counterV1.inc();
    const testRecord = await genStorageSlotProof(ethers, counterV1.address, MEMORY_SLOT_COUNTERV1, value);
    testRecords.push(testRecord);
    testRecord.desc = "Exists, with chaning with incremetning slot value";
  }

  {
    const testRecord = await genStorageSlotProof(ethers, counterV1.address, "0xFF");
    testRecord.desc = "With not existsing memory slot";
    testRecords.push(testRecord)
  }

  {
    const testRecord = await genStorageSlotProof(ethers, ethers.provider.getSigner().address, "0x0");
    testRecord.desc = "With not smart contract address";
    testRecords.push(testRecord)
  }
  return testRecords;
}

async function genStorageSlotProof(ethers: any, address: string, slotAddres: string, expected?: number) {
  const blockNumber = await ethers.provider.getBlockNumber();
  const trustedBlockHash = await ethers.provider.send("eth_getBlockByNumber", [blockNumber, false]).then((block: any) => block.hash);

  let expectedValue: VerifiedStorageSlotState;
  if (expected) {
    assert(expected < 10, "Not implemented for values > 10");
    expectedValue = { exists: true, value: ethers.utils.RLP.encode(Buffer.from("0" + expected.toString(), "hex")) };
  } else {
    expectedValue = { exists: false, value: "" }
  }

  const proof = await createStorageSlotProof(ethers.provider, blockNumber, address, slotAddres);
  const testRecord: TestStorageSlotProof = {
    type: ProofType.Slot,
    proof,
    trustedBlockHash,
    expectedValue
  };
  return testRecord;
}

async function genAccountProofs(ethers: any) {
  const testRecords: TestAccountProof[] = [];

  const [alice] = await ethers.getSigners();
  // pre defined truffle address with eth
  const bob = (new ethers.Wallet("8646e9a8e7b0d9d171041af9bba1095831e5f5e4c07dc624eb06cfbf34e45f1e", ethers.provider));

  for (let i = 0; i < 10; i++) {
    const testRecord: TestAccountProof = await genAccountProof(ethers, alice.address);
    testRecord.desc = "With increasing account balance";
    testRecords.push(testRecord);
    await bob.sendTransaction({
      to: alice.address,
      value: ethers.utils.parseEther("0.1")
    }).then((tx: any) => tx.wait())
  }

  {
    const testRecord: TestAccountProof = await genAccountProof(ethers, ethers.Wallet.createRandom().address);
    testRecord.desc = "With new account";
    testRecords.push(testRecord);
  }

  {
    const CounterV1 = await ethers.getContractFactory("CounterV1");

    const counterV1 = await CounterV1.deploy();
    await counterV1.deployed();
    const testRecord: TestAccountProof = await genAccountProof(ethers, counterV1.address);
    testRecord.desc = "With smart contract account";
    testRecords.push(testRecord);
  }

  return testRecords;
}

async function genAccountProof(ethers: any, address: string) {
  const blockNumber = await ethers.provider.getBlockNumber();
  const trustedBlockHash = await ethers.provider.send("eth_getBlockByNumber", [blockNumber, false]).then((block: any) => block.hash);

  const trustedAccountState = await getAccountProof(ethers.provider, address, blockNumber);
  const expectedValue: VerifedAccountState = {
    exists: true,
    ...extractFromObject(trustedAccountState, ['nonce', 'balance', 'storageHash', 'codeHash'])
  };

  const proof = await createAccountProof(ethers.provider, blockNumber, address);
  const testRecord: TestAccountProof = {
    type: ProofType.Account,
    proof,
    trustedBlockHash,
    expectedValue
  };
  return testRecord;
}

async function genHeaderProofs(ethers: any) {
  const testRecords: TestHeaderProof[] = [
    await genHeaderProof(ethers),
    await genHeaderProof(ethers)
  ];

  return testRecords;
}

async function genHeaderProof(ethers: any) {
  const blockNumber = await ethers.provider.getBlockNumber();
  const trustedBlock = await ethers.provider.send("eth_getBlockByNumber", [blockNumber, false]);

  const headerProof = await createHeaderProof(ethers.provider, blockNumber);

  const testRecord: TestHeaderProof = {
    type: ProofType.Header,
    proof: headerProof,
    trustedBlockHash: trustedBlock.hash,
    expectedValue: {
      hash: trustedBlock.hash,
      stateRootHash: trustedBlock.stateRoot,
      number: blockNumber,
      timestamp: trustedBlock.timestamp
    }
  };
  return testRecord;
}


async function getAccountProof(
  connection: any,
  address: string,
  blockNumber: string
) {
  const response = await connection.send("eth_getProof", [address, [], blockNumber]);

  return response;
}

function extractFromObject(obj: any, keys: string[]): any {
  for (const [key] of Object.entries(obj)) {
    if (!keys.includes(key)) {
      delete obj[key]
    }
  }
  return obj;
}



