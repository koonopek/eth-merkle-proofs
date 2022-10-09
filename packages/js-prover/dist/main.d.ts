import { JsonRpcProvider } from '@ethersproject/providers';
export interface Proof {
    header: HeaderProof;
    accountProof: AccountProof;
    storageSlotProof: StorageSlotProof;
}
export interface HeaderProof {
    parentHash: string;
    sha3Uncles: string;
    miner: string;
    stateRoot: string;
    transactionsRoot: string;
    receiptsRoot: string;
    logsBloom: string;
    difficulty: string;
    number: string;
    gasLimit: string;
    gasUsed: string;
    timestamp: string;
    extraData: string;
    mixHash: string;
    nonce: string;
    baseFeePerGas: string;
}
export interface AccountProof {
    address: string;
    trieNodes: string[];
}
export interface StorageSlotProof {
    key: string;
    trieNodes: string[];
}
export declare type BlockHeader = any;
export declare function createHeaderProof(connection: JsonRpcProvider, blockNumber: string): Promise<HeaderProof>;
export declare type FullAccountProof = [HeaderProof, AccountProof];
export declare function createAccountProof(connection: JsonRpcProvider, blockNumber: string, accountAddress: string): Promise<FullAccountProof>;
export declare type FullStorageSlotProof = [HeaderProof, AccountProof, StorageSlotProof];
export declare function createStorageSlotProof(connection: JsonRpcProvider, blockNumber: string, accountAddress: string, memorySlotAddress: string): Promise<FullStorageSlotProof>;
//# sourceMappingURL=main.d.ts.map