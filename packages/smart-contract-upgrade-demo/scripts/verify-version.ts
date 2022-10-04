import { task } from "hardhat/config";
import { AlchemyProvider, JsonRpcProvider } from '@ethersproject/providers';
import { utils } from 'ethers';
import { BaseTrie } from 'merkle-patricia-tree';

task("verify-version", "Verify if contract implementation behin proxy has not changed")
  .addPositionalParam("proxyAddress", "address of contract upgradable proxy [example on goerli: 0x78B3FFd482c3D7eD63E993bAc56Ed7B1FB2428A7]")
  .addPositionalParam("implAddress", "address to wchich proxy points for implementation [example on goerli: 0x78B3FFd482c3D7eD63E993bAc56Ed7B1FB2428A7]")
  .addOptionalPositionalParam("blockNumber", "block number to proof on => default to latest", "latest")
  .addOptionalPositionalParam("storageSlot", "storage slot defaults to openzeppeli implementation of upgradable proxy: https://docs.openzeppelin.com/upgrades-plugins/1.x/proxies ", "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc")
  .setAction(main);

// proxy address: 0x78B3FFd482c3D7eD63E993bAc56Ed7B1FB2428A7
// impl address 0x000000000000000000000000c67fb25649490a4ea9e66a05f5295a77e20945e0
// at slot 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc

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

export type Args = {
  "proxyAddress": string,
  "implAddress": string,
  "storageSlot": string,
  "blockNumber": string
}

async function main({ proxyAddress, implAddress: expectedImplAddress, storageSlot, blockNumber }: Args) {
  const connection = new AlchemyProvider('goerli', process.env["ALCHEMY_GOERLI_API_KEY"]);

  const blockHeader = await getBlockHeader(connection, blockNumber);

  const proofResponse = await getStateProof(connection, proxyAddress, storageSlot);


  const proof: Proof = {
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

  // this can be obtain from on chain smart contract
  const trustedBlockHash = await solidity_blockhash(connection, blockNumber);

  await validateProof(trustedBlockHash, expectedImplAddress, proof);
}


// in solidity
async function validateProof(trustedBlockHash: string, expectedImplAddress: string, { header, storageSlotProof, accountProof }: Proof): Promise<boolean> {
  verifyHeaderProof(header, trustedBlockHash);

  const verifiedStorageHash = await verifyAccountProof(header.stateRoot, accountProof);

  await verifyStorageProof(verifiedStorageHash, storageSlotProof, expectedImplAddress);

  return true;
}


async function solidity_blockhash(connection: JsonRpcProvider, blockNumber: string) {
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
// verifier on chain: (proof) => (is_valid, value) prover: (block_number, account.balance/storage.slot/other...) => (proof)
async function verifyStorageProof(verifiedStorageHash: string, storageSlotProof: StorageSlotProof, expectedImplAddress: string) {

  const storageValueRLP = await BaseTrie.verifyProof(
    hexToBuffer(verifiedStorageHash),
    hexToBuffer(utils.keccak256(storageSlotProof.key)),
    storageSlotProof.trieNodes.map(hexToBuffer)
  );

  if (storageValueRLP) {
    const storageValue = utils.hexZeroPad(utils.RLP.decode(storageValueRLP), 32);
    console.log("Storage proof is valid => ", `storage_slot: ${storageSlotProof.key} value: ${storageValue}`);
    if (storageValue !== expectedImplAddress) {
      console.log("Implementation address has changed!");
    } else {
      console.log("Implementation address hasn't changed!");
    }
  } else {
    console.log("Storage proof is not valid");
  }
}

async function verifyAccountProof(verifiedStateRoot: string, accountProof: AccountProof) {
  const accountStateRLP = await BaseTrie.verifyProof(
    hexToBuffer(verifiedStateRoot),
    hexToBuffer(utils.keccak256(accountProof.address)),
    accountProof.trieNodes.map(hexToBuffer)
  );

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

