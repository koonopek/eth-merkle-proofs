import { utils } from 'ethers';
import { BaseTrie } from 'merkle-patricia-tree';
import { AccountProof, HeaderProof, StorageSlotProof } from 'js-prover';

export type BlockHeader = any;

export type VerifiedHeader = HeaderProof;

export function verifyHeaderProof(header: HeaderProof, trustedChainBlockHash: string): VerifiedHeader {
  if (blockHash(header) !== trustedChainBlockHash) {
    throw Error("Failed to verify header proof: computed block hash is not equal")
  }
  return header;
}

export type VerifiedStorageSlotState = {
  value: string
}

export async function verifyStorageProof(verifiedStorageHash: string, storageSlotProof: StorageSlotProof): Promise<VerifiedStorageSlotState> {
  const storageValueRLP = await BaseTrie.verifyProof(
    hexToBuffer(verifiedStorageHash),
    hexToBuffer(utils.keccak256(storageSlotProof.key)),
    storageSlotProof.trieNodes.map(hexToBuffer)
  );

  if (storageValueRLP) {
    return { value: utils.hexZeroPad(utils.RLP.decode(storageValueRLP), 32) }
  } else {
    throw Error("Failed to verify storage slot proof: trie node value is empty")
  }
}

export type VerifedAccountState = {
  nonce: string,
  balance: string,
  storageHash: string,
  codeHash: string
}


export async function verifyAccountProof(verifiedStateRoot: string, accountProof: AccountProof): Promise<VerifedAccountState> {
  const accountStateRLP = await BaseTrie.verifyProof(
    hexToBuffer(verifiedStateRoot),
    hexToBuffer(utils.keccak256(accountProof.address)),
    accountProof.trieNodes.map(hexToBuffer)
  );

  if (accountStateRLP) {
    const accountStateRaw = utils.RLP.decode(accountStateRLP) as string[];
    return {
      nonce: accountStateRaw[0],
      balance: accountStateRaw[1],
      storageHash: accountStateRaw[2],
      codeHash: accountStateRaw[3]
    }
  } else {
    throw Error("Failed to verify account proof: trie node value is empty")
  }
}


function hexToBuffer(hex: string) {
  const buff = Buffer.from(hex.slice(2), "hex")
  return buff;
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
