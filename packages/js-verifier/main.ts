import { utils } from 'ethers';
import { BaseTrie } from 'merkle-patricia-tree';
import { AccountProof, HeaderProof, StorageSlotProof } from 'js-prover';

export type BlockHeader = any;

export type VerifiedHeader = {
  hash: string,
  stateRootHash: string,
  number: number,
  timestamp: number
};

export type VerifiedStorageSlotState = {
  exists: boolean,
  // RLP bytes
  value: string
}

export type VerifedAccountState = {
  exists: boolean,
  nonce: string,
  balance: string,
  storageHash: string,
  codeHash: string
}

export enum VerificationErrorType {
  InvalidProof = "Some hash doesn't match",
}

export class MerkleProofVerificationError extends Error { }

export const HEADER_STATE_ROOT_INDEX = 3;
export const HEADER_NUMBER_INDEX = 8;
export const HEADER_TIMESTAMP_INDEX = 11;

export function verifyHeaderProof(header: HeaderProof, trustedChainBlockHash: string): VerifiedHeader {
  const computedHash = blockHash(header);
  if (computedHash !== trustedChainBlockHash) {
    throw new MerkleProofVerificationError(VerificationErrorType.InvalidProof)
  }
  const decodedHeader = utils.RLP.decode(header);
  return {
    hash: trustedChainBlockHash,
    number: decodedHeader[HEADER_NUMBER_INDEX],
    timestamp: decodedHeader[HEADER_STATE_ROOT_INDEX],
    stateRootHash: decodedHeader[HEADER_STATE_ROOT_INDEX]
  };
}


export async function verifyStorageProof(verifiedStorageHash: string, storageSlotProof: StorageSlotProof): Promise<VerifiedStorageSlotState> {
  const storageValueRLP = await verifyTrie(verifiedStorageHash, storageSlotProof.trieNodes, storageSlotProof.key);
  if (storageValueRLP) {
    return { exists: true, value: utils.RLP.decode(storageValueRLP) }
  } else {
    return { exists: false, value: "" };
  }
}


export async function verifyAccountProof(verifiedStateRoot: string, accountProof: AccountProof): Promise<VerifedAccountState> {
  const accountStateRLP = await verifyTrie(verifiedStateRoot, accountProof.trieNodes, accountProof.address);

  if (accountStateRLP) {
    const accountStateRaw = utils.RLP.decode(accountStateRLP) as string[];
    return {
      exists: true,
      nonce: accountStateRaw[0],
      balance: accountStateRaw[1],
      storageHash: accountStateRaw[2],
      codeHash: accountStateRaw[3]
    }
  } else {
    return {
      exists: false,
      nonce: "",
      balance: "",
      storageHash: "",
      codeHash: ""
    }
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
    throw new MerkleProofVerificationError(VerificationErrorType.InvalidProof)
  }
}

function hexToBuffer(hex: string) {
  const buff = Buffer.from(hex.slice(2), "hex")
  return buff;
}

function blockHash(headerProof: HeaderProof) {
  return utils.keccak256(headerProof)
}




