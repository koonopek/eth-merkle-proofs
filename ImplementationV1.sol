pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract ImplementationV1 is Initializable {
    uint256 counter;
    
    function initialize() public onlyInitializing {
        
    }
}
