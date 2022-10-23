import assert from "assert";
import { task } from "hardhat/config";
import { createAccountProof, createHeaderProof, createStorageSlotProof, FullAccountProof, FullStorageSlotProof, HeaderProof, hexPadWithZero } from "js-prover";
import { VerifedAccountState, VerifiedHeader, VerifiedStorageSlotState } from "js-verifer";
import { promises as fs } from 'fs';
import * as path from 'path';

task("test-data", "Generate test data")
  .setAction(generateTestData);

export type TestStorageSlotProof = {
  desc?: string,
  proof: FullStorageSlotProof,
  expectedValue: VerifiedStorageSlotState,
  trustedStorageHash: string,
  shouldThrow: boolean,
}

export type TestAccountProof = {
  desc?: string,
  proof: FullAccountProof,
  expectedValue: VerifedAccountState,
  trustedRootHash: string,
}

export type TestHeaderProof = {
  desc?: string,
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
  const counterStartValue = (await counterV1.getCounter()).toNumber();
  const testRecords: TestStorageSlotProof[] = [];

  for (let value = counterStartValue; value < counterStartValue + 5; value++) {
    const testRecord = await genStorageSlotProof(ethers, counterV1.address, MEMORY_SLOT_COUNTERV1, value);
    testRecords.push(testRecord);
    testRecord.desc = "With chaning with incremetning slot value";
    await counterV1.inc();
  }

  {
    const testRecord = await genStorageSlotProof(ethers, counterV1.address, "0xFF");
    testRecord.desc = "With not existsing memory slot";
    testRecords.push(testRecord)
  }

  {
    const [alice] = await ethers.getSigners();
    const testRecord = await genStorageSlotProof(ethers, alice.address, "0x0");
    testRecord.desc = "With not smart contract account";
    testRecord.shouldThrow = true;
    testRecords.push(testRecord)
  }
  return testRecords;
}

async function genStorageSlotProof(ethers: any, address: string, slotAddres: string, expected?: number) {
  const blockNumber = await getBlockNumber(ethers);
  const { storageHash } = await getAccountProof(ethers.provider, address, blockNumber);

  let expectedValue: VerifiedStorageSlotState;
  if (expected) {
    expectedValue = { exists: true, value: encodeNumberToRlpHex(ethers, expected) };
  } else {
    expectedValue = { exists: false, value: "" }
  }

  const proof = await createStorageSlotProof(ethers.provider, blockNumber, address, slotAddres);
  const testRecord: TestStorageSlotProof = {
    proof,
    trustedStorageHash: storageHash,
    expectedValue,
    shouldThrow: false
  };
  return testRecord;
}

function encodeNumberToRlpHex(ethers: any, expected: number): string {
  assert(expected < 10, "Not implemented for values > 10");
  return ethers.utils.RLP.encode(Buffer.from("0" + expected.toString(), "hex"));
}

async function genAccountProofs(ethers: any) {
  const testRecords: TestAccountProof[] = [];

  const [alice] = await ethers.getSigners();
  // pre defined truffle address with eth
  const bob = (new ethers.Wallet("8646e9a8e7b0d9d171041af9bba1095831e5f5e4c07dc624eb06cfbf34e45f1e", ethers.provider));

  for (let i = 0; i < 5; i++) {
    const testRecord: TestAccountProof = await genAccountProof(ethers, alice.address);
    testRecord.desc = `With increasing account balance ${0.1 * i}`;
    testRecords.push(testRecord);
    await bob.sendTransaction({
      to: alice.address,
      value: ethers.utils.parseEther("0.1")
    }).then((tx: any) => tx.wait())
  }

  { // this is corner case because node will return data for account, but till first transaction it is not included in state trie
    const testRecord: TestAccountProof = await genAccountProof(ethers, ethers.Wallet.createRandom().address);
    testRecord.expectedValue = {
      exists: false,
      nonce: "",
      balance: "",
      storageHash: "",
      codeHash: ""
    }
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
  const blockNumber = await getBlockNumber(ethers);
  const trustedRootHash = await ethers.provider.send("eth_getBlockByNumber", [blockNumber, false]).then((block: any) => block.stateRoot);

  const trustedAccountState = await getAccountProof(ethers.provider, address, blockNumber);
  const expectedValue: VerifedAccountState = {
    exists: true,
    ...parseAccountState(trustedAccountState)
  };

  const proof = await createAccountProof(ethers.provider, blockNumber, address);
  const testRecord: TestAccountProof = {
    proof,
    trustedRootHash,
    expectedValue
  };
  return testRecord;
}

async function genHeaderProofs(ethers: any) {
  const testRecords: TestHeaderProof[] = [
    { ...await genHeaderProof(ethers), desc: "Header proof 1" },
    { ...await genHeaderProof(ethers), desc: "Header proof 2" }
  ];

  return testRecords;
}

async function genHeaderProof(ethers: any) {
  const blockNumber = await getBlockNumber(ethers);
  const trustedBlock = await ethers.provider.send("eth_getBlockByNumber", [blockNumber, false]);

  const headerProof = await createHeaderProof(ethers.provider, blockNumber);

  const testRecord: TestHeaderProof = {
    proof: headerProof,
    trustedBlockHash: trustedBlock.hash,
    expectedValue: {
      hash: trustedBlock.hash,
      number: toCompressedHex(blockNumber),
      timestamp: trustedBlock.timestamp,
      stateRootHash: trustedBlock.stateRoot,
    }
  };
  return testRecord;
}


async function getBlockNumber(ethers: any) {
  const unFormated = await ethers.provider.getBlockNumber();

  return hexPadWithZero(ethers.utils.hexValue(unFormated));
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

function parseAccountState(state: VerifedAccountState) {
  const hexedState = { ...extractFromObject(state, ['nonce', 'balance', 'storageHash', 'codeHash']) };
  for (const [key, value] of Object.entries(state)) {
    hexedState[key] = hexPadWithZero(value as string);
  }
  return hexedState;
}

function toCompressedHex(hex: string) {
  if (hex === "0x0") {
    return "0x";
  }
  return hex;
} 
