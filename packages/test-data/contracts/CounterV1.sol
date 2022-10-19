// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;


contract CounterV1 {
    uint256 public x;
    
    constructor() {
        x = 1;
    }

    function inc() external {
        x = x + 1;
    }

    function getCounter() external view returns (uint256) {
        return x;
    }
}
