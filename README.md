# eth-merkle-proofs

## Rationale
This library enable you to generate and verify [ETH merkle proofs](https://eips.ethereum.org/EIPS/eip-1186), based on given *trusted* blockHash.

There exits three type of proofs:
* `HeaderProof` which enable you to proof that given `block header` consist of given values, this is trival but enable later proofs
* `AccounProof` which enable you to proof that given `address` and at `blockNumber` => has some value of `nonce,balance,storageHash,codeHash`
* `StorageSlotProof` which enable you to proof that given `address` and at `memorySlot` and at `blockNumber` => has some `value` or does not at all.

This enable you to verify on-chain and off-chain:
* ETH balance
* ERC20 balance
* arbitraty slot of storage in smart contract
* and others

Note: When veirifing proofs we also retrive state which is verifed. So we don't have to explicite pass state which is being verified.

## Packages

#### js-prover
* Generate proofs, which then can be verified on-chain or off-chain
* Depends on connection to rpc node

#### js-verifier
* Verify proofs off-chain (web or nodejs)
* Pure, but requires trusted `BlockHash`

####  smart-contract-upgrade-demo
* In this example it is used to proof that some implementation behind proxy has been modified.
* I strictly assume that proxy is openzeppelin https://docs.openzeppelin.com/upgrades-plugins/1.x/proxies
Run:
* Set up envs
      * `GOERLI_PRIVAT_KEY` - private key on goerli testnet, be sure to feed it with some ETH.
      * `ALCHEMY_GOERLI_API_KEY` - api key to alchemy node
* Run: `yarn install && yarn buld && yarn demo`
* Scenario
      1. Deploy contract behid upgradable proxy.
      2. Verify version using `StorageSlotProof` => detect no change
      3. Upgrade smart contract
      4. Verify version using `StorageSlotProof` => detect change
