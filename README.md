# eth-merkle-proofs
[![Node.js CI](https://github.com/koonopek/eth-merkle-proofs/actions/workflows/node.js.yml/badge.svg?branch=main)](https://github.com/koonopek/eth-merkle-proofs/actions/workflows/node.js.yml)

## Rationale
This library enable you to generate and verify [ETH merkle proofs](https://eips.ethereum.org/EIPS/eip-1186), based on given *trusted* blockHash.

There exits three type of proofs:
* `HeaderProof` which enable you to proof that given `block header` consist of given values, this is trival but enable later proofs
* `AccounProof` which enable you to proof that given `address` and at `blockNumber` => has some value of `nonce,balance,storageHash,codeHash`
* `StorageSlotProof` which enable you to proof that given `address` and at `memorySlot` and at `blockNumber` => has some `value`

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
* Set up
  - install truffle `npm install -g truffle`
  - run truffle network `truffle develop`
* Run: `yarn install && yarn buld && yarn demo --network truffle`
* What is happenning?
  1. Deploy contract behid upgradable proxy.
  2. Verify version using `StorageSlotProof` => detect no change
  3. Upgrade smart contract
  4. Verify version using `StorageSlotProof` => detect change
* Note: you can also run demo on goerli network
  - just set up envs:
    - `GOERLI_PRIVAT_KEY` - private key on goerli testnet, be sure to feed it with some ETH.
    - `ALCHEMY_GOERLI_API_KEY` - api key to alchemy node
  - And run `yarn install && yarn buld && yarn demo --network goerli`  

## Resources:
- talk about use cases: https://www.youtube.com/watch?v=ysW-Bq05pJQ&ab_channel=LinkTime
- another talk: https://www.youtube.com/watch?app=desktop&v=ZHNrAXf3RDE&ab_channel=EthereumFoundation
- set of great articles which deep dive in state proofs (thread on the end of article): https://medium.com/@chiqing/verify-usdc-balance-and-nft-meta-data-with-proof-3b4d065ae923

 ## TODO 
 - [ ] write `verifyFullAccountProof` and `verifyFullStorageSlotProof`
 - [ ] test-data
 - [ ] solidity-verifier
 - [ ] js doc
 - [ ] cairo-verifier?
