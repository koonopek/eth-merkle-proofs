// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract CounterV2 is Initializable {
    uint256 public x;

    function initialize(uint256 _x) public initializer {
        x = _x;
    }

    function inc() external {
        x = x + 2; // <---- change 1 => 2
    }

    function getCounter() external view returns (uint256) {
        return x;
    }
}
