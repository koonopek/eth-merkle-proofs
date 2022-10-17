import { task } from "hardhat/config";
import { JsonRpcProvider } from '@ethersproject/providers';
import { createStorageSlotProof, FullStorageSlotProof } from 'js-prover';
import { verifyHeaderProof, verifyAccountProof, verifyStorageProof } from 'js-verifer';
import { utils } from 'ethers';

task("verify-version", "Verify if contract implementation behin proxy has not changed")
  .addPositionalParam("proxyAddress", "address of contract upgradable proxy [example on goerli: 0x78B3FFd482c3D7eD63E993bAc56Ed7B1FB2428A7]")
  .addPositionalParam("implAddress", "address to wchich proxy points for implementation [example on goerli: 0x78B3FFd482c3D7eD63E993bAc56Ed7B1FB2428A7]")
  .addOptionalPositionalParam("blockNumber", "block number to proof on => default to latest", "latest")
  .addOptionalPositionalParam("storageSlot", "storage slot defaults to openzeppeli implementation of upgradable proxy: https://docs.openzeppelin.com/upgrades-plugins/1.x/proxies ", "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc")
  .setAction(verifyVersion);

export type BlockHeader = any;

export type Args = {
  "proxyAddress": string,
  "implAddress": string,
  "storageSlot": string,
  "blockNumber": string
}

export async function verifyVersion({ proxyAddress, implAddress: expectedImplAddress, storageSlot, blockNumber }: Args, { ethers }: any) {
  const connection = ethers.provider;

  const proof = await createStorageSlotProof(connection, blockNumber, proxyAddress, storageSlot);
  const trustedBlockHash = await solidity_blockhash(connection, blockNumber);

  await verifyImplAddress(trustedBlockHash, expectedImplAddress, proof);
}


async function verifyImplAddress(trustedBlockHash: string, expectedImplAddress: string, [headerProof, accountProof, storageSlotProof]: FullStorageSlotProof) {

  const header = verifyHeaderProof(headerProof, trustedBlockHash);

  const accountState = await verifyAccountProof(header.stateRootHash, accountProof);

  const storageSlotState = await verifyStorageProof(accountState.storageHash, storageSlotProof);
  const currentImpl = utils.hexZeroPad(storageSlotState.value, 32);

  console.log({
    old_implementation: expectedImplAddress,
    new_implementation: currentImpl
  })
  if (currentImpl !== expectedImplAddress) {
    console.log("Implementation address has changed");
  } else {
    console.log("Implementation address hasn't changed")
  }
}

async function solidity_blockhash(connection: JsonRpcProvider, blockNumber: string) {
  const block = await getBlockHeader(connection, blockNumber);

  return block.hash;
}

async function getBlockHeader(
  connection: JsonRpcProvider,
  blockNumber: string
): Promise<BlockHeader> {
  const response = await connection.send("eth_getBlockByNumber", [blockNumber, false]);

  return response;
}
