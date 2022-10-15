import { utils } from 'ethers';
import { BaseTrie } from 'merkle-patricia-tree';
import { AccountProof, HeaderProof, StorageSlotProof } from 'js-prover';

export type BlockHeader = any;

export type VerifiedHeader = HeaderProof;

export type VerifiedStorageSlotState = {
  value: string
}

export type VerifedAccountState = {
  nonce: string,
  balance: string,
  storageHash: string,
  codeHash: string
}

export enum VerificationErrorType {
  EmptyNode = "Value is empty",
  InvalidProof = "Some hash doesn't match",
}

export class VerificationError extends Error {
  constructor(type: VerificationErrorType) {
    super(type);
  }
}


export function verifyHeaderProof(header: HeaderProof, trustedChainBlockHash: string): VerifiedHeader {
  if (blockHash(header) !== trustedChainBlockHash) {
    throw new VerificationError(VerificationErrorType.InvalidProof)
  }
  return header;
}


export async function verifyStorageProof(verifiedStorageHash: string, storageSlotProof: StorageSlotProof): Promise<VerifiedStorageSlotState> {
  const storageValueRLP = await verifyTrie(verifiedStorageHash,storageSlotProof.trieNodes , storageSlotProof.key);
  if (storageValueRLP) {
    return { value: utils.RLP.decode(storageValueRLP) }
  } else {
    throw new VerificationError(VerificationErrorType.EmptyNode)
  }
}


export async function verifyAccountProof(verifiedStateRoot: string, accountProof: AccountProof): Promise<VerifedAccountState> {
  console.log(accountProof.address)
  const accountStateRLP = await verifyTrie(verifiedStateRoot, accountProof.trieNodes, accountProof.address);

  if (accountStateRLP) {
    const accountStateRaw = utils.RLP.decode(accountStateRLP) as string[];
    return {
      nonce: accountStateRaw[0],
      balance: accountStateRaw[1],
      storageHash: accountStateRaw[2],
      codeHash: accountStateRaw[3]
    }
  } else {
    throw new VerificationError(VerificationErrorType.EmptyNode)
  }
}


async function verifyTrie(root: string, trieNodes: string[], key: string) {
  try {
    return await BaseTrie.verifyProof(
      hexToBuffer(root),
      hexToBuffer(utils.keccak256(key)),
      trieNodes.map(hexToBuffer)
    );
  } catch (_) {
    throw new VerificationError(VerificationErrorType.InvalidProof)
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


