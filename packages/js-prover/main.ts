import { JsonRpcProvider } from '@ethersproject/providers';

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

export type FullAccountProof = [HeaderProof, AccountProof];

export type FullStorageSlotProof = [HeaderProof, AccountProof, StorageSlotProof];

/**
Creates Header Proof.
Fetch a block header from node, which is can be hashed to retrive blockHash.
@param connection {JsonRpcProvider} json rpc provider from ethers.js
@param blockNumber {string} number of block to fetch (for example "1")

@return headerProof proof for block header
*/
export async function createHeaderProof(connection: JsonRpcProvider, blockNumber: string): Promise<HeaderProof> {
  return await getBlockHeader(connection, blockNumber);
}

/**
Creates Account Proof.
Account Proof in Patrice Merkle Trie proof, so beside proof it also contains data that it commits to.
@param connection {JsonRpcProvider} json rpc provider from ethers.js
@param blockNumber {string} number of block to fetch (for example "1")
@param accountAddress {string} smart contract address or ether address

@return [headerProof,accountProof] to verify accountProof, we first have to validate headerProof
*/
export async function createAccountProof(connection: JsonRpcProvider, blockNumber: string, accountAddress: string): Promise<FullAccountProof> {
  const headerProof = await createHeaderProof(connection, blockNumber);

  const ethProof = await getAccountProof(connection, accountAddress, blockNumber);

  const accountProof: AccountProof = {
    address: ethProof.address,
    trieNodes: ethProof.accountProof
  }

  return [headerProof, accountProof]
}

/**
Creates Storage Slot Proof.
Account Proof in Patrice Merkle Trie proof, so beside proof it also contains data that it commits to.
@param connection {JsonRpcProvider} json rpc provider from ethers.js
@param blockNumber {string} number of block to fetch (for example "1")
@param accountAddress {string} smart contract address or ether address
@param memorySlotAddress {string} keccak(index_in_memory) for example keccak(0) (more info: https://medium.com/@chiqing/verify-usdc-balance-and-nft-meta-data-with-proof-3b4d065ae923)

@return [headerProof,accountProof, storageSlotProof] to verify storageProof, we first have to validate headerProof and accountProof 
*/
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
