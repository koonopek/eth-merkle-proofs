import { AlchemyProvider, JsonRpcProvider } from '@ethersproject/providers';
import { utils } from 'ethers';
import { BaseTrie } from 'merkle-patricia-tree';

// proxy address: 0x78B3FFd482c3D7eD63E993bAc56Ed7B1FB2428A7
// impl address 0x000000000000000000000000c67fb25649490a4ea9e66a05f5295a77e20945e0
// at slot 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc
const IMPL_ADDRESS = "0xc67fb25649490a4ea9e66a05f5295a77e20945e0";
const CONTRACT_ADDRESS = "0x78B3FFd482c3D7eD63E993bAc56Ed7B1FB2428A7";
const STORAGE_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
const BLOCK_NUMBER = "latest";

export interface StorageSlotProof {
  header: HeaderProof,
  accountProof?: AccountProof,
  storageSlotProof?: StorageSlotProof 
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
    nonce: string,
    balance: string,
    storageHash: string,
    codeHash: string,
}

export interface StorageSlotProof {
  key: string,
  trieNodes: string[]
}

export type BlockHeader = any;

const connection = new AlchemyProvider('goerli', process.env["ALCHEMY_GOERLI_API_KEY"]);

async function main() {

  const blockHeader = await getBlockHeader(connection, BLOCK_NUMBER);

  const proofResponse = await getStateProof(connection, CONTRACT_ADDRESS, STORAGE_SLOT);

  const proof: StorageSlotProof = {
    header: blockHeader,
    accountProof: {
      address: proofResponse.address,
      trieNodes: proofResponse.accountProof,
      nonce: proofResponse.nonce,
      balance: proofResponse.balance,
      storageHash: proofResponse.storageHash,
      codeHash: proofResponse.codeHash
    },
    storageSlotProof: {
      key: proofResponse.storageProof[0].key,
      trieNodes: proofResponse.storageProof[0].proof
    }
  };

  await validateProof(proof);
}


// in solidity
async function validateProof({ header, storageSlotProof: stateProof, accountProof }: StorageSlotProof): Promise<boolean> {
  // this can be obtain from on chain smart contract
  const trustedChainBlockHash = await solidity_blockhash(header.number);

  verifyHeaderProof(header, trustedChainBlockHash);

  if (accountProof) {
    const verifiedStorageHash = await verifyAccountProof(header.stateRoot, accountProof);

    if (stateProof) {
      await verifyStorageProof(verifiedStorageHash, stateProof);
    }
  }

  return true;
}


async function solidity_blockhash(blockNumber: string) {
  const block = await getBlockHeader(connection, blockNumber);

  return block.hash;
}

function verifyHeaderProof(header: HeaderProof, trustedChainBlockHash: any) {
  if (blockHash(header) === trustedChainBlockHash) {
    console.log("Block hash is valid => state root is valid");
  } else {
    console.log("Block hash is not valid");
  }
}

async function verifyStorageProof(verifiedStorageHash: string, storageSlotProof: StorageSlotProof) {
  const storageValueRLP = await BaseTrie.verifyProof(hexToBuffer(verifiedStorageHash), hexToBuffer(utils.keccak256(storageSlotProof.key)), storageSlotProof.trieNodes.map(hexToBuffer));

  if (storageValueRLP) {
    const storageValue = utils.RLP.decode(storageValueRLP);
    console.log("Storage proof is valid => ", `storage_slot: ${storageSlotProof.key} value: ${storageValue}`);
    if (storageValue !== IMPL_ADDRESS) {
      console.log("Implementation address has changed!");
    } else {
      console.log("Implementation address hasn't changed!");
    }
  } else {
    console.log("Storage proof is not valid");
  }
}

async function verifyAccountProof(verifiedStateRoot: string, accountProof: { address: string; trieNodes: string[]; nonce: string; balance: string; storageHash: string; codeHash: string; }) {
  const accountStateRLP = await BaseTrie.verifyProof(hexToBuffer(verifiedStateRoot), hexToBuffer(utils.keccak256(accountProof.address)), accountProof.trieNodes.map(hexToBuffer));

  if (accountStateRLP) {
    const accountState = utils.RLP.decode(accountStateRLP) as string[];
    const untrustedState = [accountProof.nonce, accountProof.balance, accountProof.storageHash, accountProof.codeHash].map(nibbleToHex);
    const isStateEq = accountState.every((_, i) => accountState[i] === untrustedState[i]);

    console.log("Account state is valid => ", `${accountProof.address} => ${accountState}`);

    if (isStateEq) {
      console.log("Account state is eq to given one: ", untrustedState, " === ", accountState);
    } else {
      console.log("Account state is not eq to given one: ", untrustedState, " !== ", accountState);
    }

  } else {
    console.log("Account state is not valid");
  }

  return accountProof.storageHash;
}

function hexToBuffer(hex: string) {
  const buff = Buffer.from(hex.slice(2), "hex")
  return buff;
}

async function getBlockHeader(
  connection: JsonRpcProvider,
  blockNumber: string
): Promise<BlockHeader> {
  const response = await connection.send("eth_getBlockByNumber", [blockNumber, false]);

  return response;
}

function nibbleToHex(nibbles: string): string {
  if (nibbles.length % 2 === 0) {
    return nibbles;
  }

  if (nibbles === '0x0') {
    return '0x'
  }

  return `0x0${nibbles.slice(2)}`
}

function blockHash(blockHeader: HeaderProof) {
  const payload = [
    blockHeader.parentHash,
    blockHeader.sha3Uncles,
    blockHeader.miner,
    blockHeader.stateRoot,
    blockHeader.transactionsRoot,
    blockHeader.receiptsRoot,
    blockHeader.logsBloom,
    blockHeader.difficulty,
    blockHeader.number,
    blockHeader.gasLimit,
    blockHeader.gasUsed,
    blockHeader.timestamp,
    blockHeader.extraData,
    blockHeader.mixHash,
    blockHeader.nonce,
    blockHeader.baseFeePerGas
  ].map(nibbleToHex);

  return utils.keccak256(utils.RLP.encode(payload))
}

async function getStateProof(
  connection: JsonRpcProvider,
  contractAddress: string,
  storageSlot: string,
  blockNumber: string = "latest"
) {
  const response = await connection.send("eth_getProof", [contractAddress, [storageSlot], blockNumber]);

  return response;
}

main()

