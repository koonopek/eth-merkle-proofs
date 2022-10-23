import assert, { AssertionError } from 'assert';
import { verifyAccountProof, verifyHeaderProof, verifyStorageSlotProof } from './main';
import { readFileSync } from 'fs';
import { resolve as resolvePath } from 'path';

const TEST_DATA_PATH = resolvePath(__dirname, '..', '..', 'test-data', 'data.json');

function getTestData() {
  return JSON.parse(readFileSync(TEST_DATA_PATH).toString());
}

async function test() {
  const failures = [];

  for (const suite of getTestData()) {
    console.log(`STARTING SUITE created at: ${suite.when} network: ${JSON.stringify(suite.network)}\n`)

    console.log(`\tHeader proofs`);
    for (const headerTest of suite.testData.headerProofs) {
      const result = verifyHeaderProof(headerTest.proof, headerTest.trustedBlockHash)
      const error = assertEq(result, headerTest.expectedValue, headerTest.desc);
      if (error) {
        failures.push(error);
      }
    }

    console.log(`\tAccount proofs`);
    for (const accountTest of suite.testData.accountProofs) {
      const result = await verifyAccountProof(accountTest.trustedRootHash, accountTest.proof[1])
      const error = assertEq(result, accountTest.expectedValue, accountTest.desc);
      if (error) {
        failures.push(error);
      }
    }

    console.log(`\tStorage slot proofs`);
    for (const storageSlotTest of suite.testData.storageSlotProofs) {
      await testStorageSlotProof(storageSlotTest, failures);
    }
  }
}


async function testStorageSlotProof(storageSlotTest: any, failures: any[]) {
  let result;
  let hasThrown = false;
  try {
    result = await verifyStorageSlotProof(storageSlotTest.trustedStorageHash, storageSlotTest.proof[2]);
  } catch (e) {
    hasThrown = true;
  }

  if (storageSlotTest.shouldThrow) {
    if (!hasThrown) {
      const error = onFailure("Should have thrown error", storageSlotTest.desc);
      failures.push(error);
      return error;
    } else  {
      return onSuccess(storageSlotTest.desc)
    }
  }

  const error = assertEq(result, storageSlotTest.expectedValue, storageSlotTest.desc);

  if (error) {
    failures.push(error);
  }
}

function assertEq(actual: any, expected: any, desc: string) {
  try {
    assert.deepStrictEqual(actual, expected)
  } catch (e: any) {
    const error = e as AssertionError;
    return onFailure(error.message, desc);
  }
  onSuccess(desc);
  return null;
}

function onFailure(message: string, desc: string) {
  console.log(`\t\tFailure: ${desc}`);
  console.log(`\t\t${message.split('\n').join('\n\t\t\t')}\n`)

  return { message, desc }
}

function onSuccess(desc: string) {
  console.log(`\t\tSuccess: ${desc}`);
}


test().then(() => {
  process.exit(0);
}).catch(e => {
  console.log(e)
  process.exit(1);
});
