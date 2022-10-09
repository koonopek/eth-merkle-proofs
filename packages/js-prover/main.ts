import { JsonRpcProvider } from '@ethersproject/providers';

export interface Proof {
  header: HeaderProof,
  accountProof: AccountProof,
  storageSlotProof: StorageSlotProof
}

export interface HeaderProof {
  parentHash: string,
  sha3Uncles: string,
  miner: string,
  stateRoot: string,
  transactionsRoot: string,
  receiptsRoot: string,
  logsBloom: string,
  difficulty: string,
  number: string,
  gasLimit: string,
  gasUsed: string,
  timestamp: string,
  extraData: string,
  mixHash: string,
  nonce: string,
  baseFeePerGas: string
}

export interface AccountProof {
  address: string,
  trieNodes: string[],
}

export interface StorageSlotProof {
  key: string,
  trieNodes: string[]
}

export type BlockHeader = any;

export async function createHeaderProof(connection: JsonRpcProvider, blockNumber: string): Promise<HeaderProof> {
  return await getBlockHeader(connection, blockNumber);
}

export type FullAccountProof = [HeaderProof, AccountProof];

export async function createAccountProof(connection: JsonRpcProvider, blockNumber: string, accountAddress: string): Promise<FullAccountProof> {
  const headerProof = await createHeaderProof(connection, blockNumber);

  const ethProof = await getAccountProof(connection, accountAddress, blockNumber);

  const accountProof: AccountProof = {
    address: ethProof.address,
    trieNodes: ethProof.accountProof
  }

  return [headerProof, accountProof]
}

export type FullStorageSlotProof = [HeaderProof, AccountProof, StorageSlotProof];

export async function createStorageSlotProof(connection: JsonRpcProvider, blockNumber: string, accountAddress: string, memorySlotAddress: string): Promise<FullStorageSlotProof> {
  const [headerProof, accountProof] = await createAccountProof(connection, blockNumber, accountAddress);

  const ethProof = await getStorageProof(connection, accountAddress, memorySlotAddress, blockNumber);

  const storageSlotProof: StorageSlotProof = {
    key: ethProof.storageProof[0].key,
    trieNodes: ethProof.storageProof[0].proof
  }

  return [headerProof, accountProof, storageSlotProof]
}

async function getBlockHeader(
  connection: JsonRpcProvider,
  blockNumber: string
): Promise<BlockHeader> {
  const response = await connection.send("eth_getBlockByNumber", [blockNumber, false]);

  return response;
}

async function getStorageProof(
  connection: JsonRpcProvider,
  contractAddress: string,
  storageSlot: string,
  blockNumber: string
) {
  const response = await connection.send("eth_getProof", [contractAddress, [storageSlot], blockNumber]);

  return response;
}

async function getAccountProof(
  connection: JsonRpcProvider,
  address: string,
  blockNumber: string
) {
  const response = await connection.send("eth_getProof", [address, [], blockNumber]);

  return response;
}
