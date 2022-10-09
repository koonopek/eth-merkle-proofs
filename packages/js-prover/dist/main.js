"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStorageSlotProof = exports.createAccountProof = exports.createHeaderProof = void 0;
async function createHeaderProof(connection, blockNumber) {
    return await getBlockHeader(connection, blockNumber);
}
exports.createHeaderProof = createHeaderProof;
async function createAccountProof(connection, blockNumber, accountAddress) {
    const headerProof = await createHeaderProof(connection, blockNumber);
    const ethProof = await getAccountProof(connection, accountAddress, blockNumber);
    const accountProof = {
        address: ethProof.address,
        trieNodes: ethProof.accountProof
    };
    return [headerProof, accountProof];
}
exports.createAccountProof = createAccountProof;
async function createStorageSlotProof(connection, blockNumber, accountAddress, memorySlotAddress) {
    const [headerProof, accountProof] = await createAccountProof(connection, blockNumber, accountAddress);
    const ethProof = await getStorageProof(connection, accountAddress, memorySlotAddress, blockNumber);
    const storageSlotProof = {
        key: ethProof.storageProof[0].key,
        trieNodes: ethProof.storageProof[0].proof
    };
    return [headerProof, accountProof, storageSlotProof];
}
exports.createStorageSlotProof = createStorageSlotProof;
async function getBlockHeader(connection, blockNumber) {
    const response = await connection.send("eth_getBlockByNumber", [blockNumber, false]);
    return response;
}
async function getStorageProof(connection, contractAddress, storageSlot, blockNumber) {
    const response = await connection.send("eth_getProof", [contractAddress, [storageSlot], blockNumber]);
    return response;
}
async function getAccountProof(connection, address, blockNumber) {
    const response = await connection.send("eth_getProof", [address, [], blockNumber]);
    return response;
}
