# Smart contract Upgrade detector

## Assumptions

1. Support only [https://docs.openzeppelin.com/upgrades-plugins/1.x/proxies](https://docs.openzeppelin.com/upgrades-plugins/1.x/proxies) 
    1. Assumes [https://eips.ethereum.org/EIPS/eip-1967](https://eips.ethereum.org/EIPS/eip-1967) where
        
        ```jsx
        implementationPosition = bytes32(uint256(
          keccak256('eip1967.proxy.implementation')) - 1
        )); // 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc
        ```
        

## How to?

1. To read current implementation(address we can use rpc to call to node, read the storage at this deterministic address, and check it is value
    1. Example with arbitrum rollup on main-net
        
        [https://l2beat.com/projects/arbitrum/#contracts](https://l2beat.com/projects/arbitrum/#contracts) → Rollup proxy: [https://etherscan.io/address/0xC12BA48c781F6e392B49Db2E25Cd0c28cD77531A](https://etherscan.io/address/0xC12BA48c781F6e392B49Db2E25Cd0c28cD77531A)
        
        To check current implementation:
        
        ```json
        Request:
        {
            "jsonrpc": "2.0",
            "method": "eth_getStorageAt",
            "params": [
                "0xC12BA48c781F6e392B49Db2E25Cd0c28cD77531A",
                "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc",
                "latest"
            ],
            "id": 0
        }
        Response:
        {
            "jsonrpc": "2.0",
            "result": "0x000000000000000000000000637e1cd58ad3f0071cecb281395e1823a96a553f",
            "id": 0
        }
        ```
        
    
    `result` it current address of implementation, if it will change it means that contract was updated. This is also specified here: [https://etherscan.io/address/0xC12BA48c781F6e392B49Db2E25Cd0c28cD77531A#code#F2#L75](https://etherscan.io/address/0xC12BA48c781F6e392B49Db2E25Cd0c28cD77531A#code#F2#L75)
    
2. To run this check from chain we we will leverage `chainlink` based http requests.
3. We have to keep history of this storage variable, to accomplish that, we need off-chain scheduler which will run checks periodically.

### BIG PROBLEMO chainlink supports only GET requests, but rpc json requires all requests to be GET requests

# To do: 28th August

- [ ]  To send
- Link to online demo
- Codebase
- Presentation
- Technical Paper
- Video about your project (**max length: 3 minutes!**)# smart-contrac-upgrade-detector
