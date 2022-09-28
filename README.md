# Smart Contract Upgrade Detector

# Rationale
This is PoC of using state proof based on merkle patrice trie to proof that some storage slot has changed.
This idea can be generalized to things like:
* ETH balance
* ERC20 balance
* arbitraty slots of storage in smar contract
* and others

In this example it is used to proof that some implementation behind proxy has been modified.
I strictly assume that proxy is openzeppelin https://docs.openzeppelin.com/upgrades-plugins/1.x/proxies

# Demo
Setup envs
* `GOERLI_PRIVAT_KEY` - private key on goerli testnet, be sure to feed it with some ETH.
* `ALCHEMY_GOERLI_API_KEY` - api key to alchemy node

1. Deploy contract behid upgradable proxy.
`npm run deploy`
2. Verify version has not changed, this download proof from node and verify it locally
`npm run verify-version <<PROXY ADDRESS>> <<EXPECTED IMPLEMENTATION ADDRESS>>`

expected implementation has **not** changed
3. Upgrade smart contract
`npm run upgrade <<PROXY ADDRESS>>`

4. Verify version has not changed, this download proof from node and verify it locally
`npm run verify-version <<PROXY ADDRESS>> <<EXPECTED IMPLEMENTATION ADDRESS>>`
expected implementation has changed

### Example run
```bash
(base) ~/code/github.com/sc-upgrade-detector main $ npm run deploy                                                    

> sc-upgrade-detector@1.0.0 deploy /Users/michalkonopka/code/github.com/sc-upgrade-detector
> npx hardhat --network goerli deploy

Deployed counterV1:
      proxy address: 0xffDBAABA2490F0Ae8273280FDbbc11a7b54691aD
      impl address 0x00000000000000000000000007079b2d39c435e871a7280fdfe3a1633698e2fc
      at slot 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc
      (base) ~/code/github.com/sc-upgrade-detector main $ npm run verify-version 0xffDBAABA2490F0Ae8273280FDbbc11a7b54691aD 0x00000000000000000000000007079b2d39c435e871a7280fdfe3a1633698e2fc 
                      
> sc-upgrade-detector@1.0.0 verify-version /Users/michalkonopka/code/github.com/sc-upgrade-detector
> npx hardhat --network goerli verify-version "0xffDBAABA2490F0Ae8273280FDbbc11a7b54691aD" "0x00000000000000000000000007079b2d39c435e871a7280fdfe3a1633698e2fc"

Block hash is valid => state root is valid
Account state is valid =>  0xffdbaaba2490f0ae8273280fdbbc11a7b54691ad => 0x01,0x,0x5a1cde68b40c3c476793cba48b14b2f1c1aabbefb0927937a36af785eca23a9d,0xfc1ea81db44e2de921b958dc92da921a18968ff3f3465bd475fb86dd1af03986
Account state is eq to given one:  [
 '0x01',
'0x',
'0x5a1cde68b40c3c476793cba48b14b2f1c1aabbefb0927937a36af785eca23a9d',
'0xfc1ea81db44e2de921b958dc92da921a18968ff3f3465bd475fb86dd1af03986'
]  ===  [
'0x01',
'0x',
'0x5a1cde68b40c3c476793cba48b14b2f1c1aabbefb0927937a36af785eca23a9d',
'0xfc1ea81db44e2de921b958dc92da921a18968ff3f3465bd475fb86dd1af03986'
]
Storage proof is valid =>  storage_slot: 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc value: 0x00000000000000000000000007079b2d39c435e871a7280fdfe3a1633698e2fc
Implementation address hasn't changed!
(base) ~/code/github.com/sc-upgrade-detector main $ npm run upgrade 0xffDBAABA2490F0Ae8273280FDbbc11a7b54691aD                                                                          

> sc-upgrade-detector@1.0.0 upgrade /Users/michalkonopka/code/github.com/sc-upgrade-detector
> npx hardhat --network goerli upgrade "0xffDBAABA2490F0Ae8273280FDbbc11a7b54691aD"

Upgraded proxy for counterV2:
proxy address: 0xffDBAABA2490F0Ae8273280FDbbc11a7b54691aD
impl address 0x00000000000000000000000027101be8c5db28e9e71bd6b600257081597e9298
at slot 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc
(base) ~/code/github.com/sc-upgrade-detector main $ npm run verify-version 0xffDBAABA2490F0Ae8273280FDbbc11a7b54691aD 0x00000000000000000000000007079b2d39c435e871a7280fdfe3a1633698e2fc

> sc-upgrade-detector@1.0.0 verify-version /Users/michalkonopka/code/github.com/sc-upgrade-detector
> npx hardhat --network goerli verify-version "0xffDBAABA2490F0Ae8273280FDbbc11a7b54691aD" "0x00000000000000000000000007079b2d39c435e871a7280fdfe3a1633698e2fc"

Block hash is valid => state root is valid
Account state is valid =>  0xffdbaaba2490f0ae8273280fdbbc11a7b54691ad => 0x01,0x,0x28c883b8c6f924d30ee22b23821a34bb479f18acf8405ffda659367573ff49e0,0xfc1ea81db44e2de921b958dc92da921a18968ff3f3465bd475fb86dd1af03986
Account state is eq to given one:  [
'0x01',
'0x',
'0x28c883b8c6f924d30ee22b23821a34bb479f18acf8405ffda659367573ff49e0',
'0xfc1ea81db44e2de921b958dc92da921a18968ff3f3465bd475fb86dd1af03986'
]  ===  [
'0x01',
'0x',
'0x28c883b8c6f924d30ee22b23821a34bb479f18acf8405ffda659367573ff49e0',
'0xfc1ea81db44e2de921b958dc92da921a18968ff3f3465bd475fb86dd1af03986'
]
Storage proof is valid =>  storage_slot: 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc value: 0x00000000000000000000000027101be8c5db28e9e71bd6b600257081597e9298
Implementation address has changed!
```

# TODO
- [ ] Demo for now works totally off-chain, but verifier should execute on-chain. 