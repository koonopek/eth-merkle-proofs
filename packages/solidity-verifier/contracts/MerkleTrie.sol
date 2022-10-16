// SPDX-License-Identifier: MIT

/**
 * Copied from https://github.com/lidofinance/curve-merkle-oracle/blob/main/contracts/MerklePatriciaProofVerifier.sol 
 * https://github.com/lidofinance/curve-merkle-oracle/blob/main/contracts/StateProofVerifier.sol
 */
pragma solidity >= 0.6.12;

import {RLPReader} from "solidity-rlp/contracts/RLPReader.sol";

// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import {RLPReader} from "hamdiallam/Solidity-RLP@2.0.5/contracts/RLPReader.sol";
import {MerklePatriciaProofVerifier} from "./MerklePatriciaProofVerifier.sol";

// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import {RLPReader} from "hamdiallam/Solidity-RLP@2.0.5/contracts/RLPReader.sol";
import {MerklePatriciaProofVerifier} from "./MerklePatriciaProofVerifier.sol";

/**
 * @title A helper library for verification of Merkle Patricia account and state proofs.
 */
library StateProofVerifier {
    using RLPReader for RLPReader.RLPItem;
    using RLPReader for bytes;

    uint256 constant HEADER_STATE_ROOT_INDEX = 3;
    uint256 constant HEADER_NUMBER_INDEX = 8;
    uint256 constant HEADER_TIMESTAMP_INDEX = 11;

    struct BlockHeader {
        bytes32 hash;
        bytes32 stateRootHash;
        uint256 number;
        uint256 timestamp;
    }

    struct Account {
        bool exists;
        uint256 nonce;
        uint256 balance;
        bytes32 storageRoot;
        bytes32 codeHash;
    }

    struct SlotValue {
        bool exists;
        uint256 value;
    }

    /**
     * @notice Parses block header and verifies its presence onchain within the latest 256 blocks.
     * @param _headerRlpBytes RLP-encoded block header.
     */
    function verifyBlockHeader(bytes memory _headerRlpBytes)
        internal view returns (BlockHeader memory)
    {
        BlockHeader memory header = parseBlockHeader(_headerRlpBytes);
        // ensure that the block is actually in the blockchain
        require(header.hash == blockhash(header.number), "blockhash mismatch");
        return header;
    }


    /**
     * @notice Parses RLP-encoded block header.
     * @param _headerRlpBytes RLP-encoded block header.
     */
    function parseBlockHeader(bytes memory _headerRlpBytes)
        internal pure returns (BlockHeader memory)
    {
        BlockHeader memory result;
        RLPReader.RLPItem[] memory headerFields = _headerRlpBytes.toRlpItem().toList();

        require(headerFields.length > HEADER_TIMESTAMP_INDEX);

        result.stateRootHash = bytes32(headerFields[HEADER_STATE_ROOT_INDEX].toUint());
        result.number = headerFields[HEADER_NUMBER_INDEX].toUint();
        result.timestamp = headerFields[HEADER_TIMESTAMP_INDEX].toUint();
        result.hash = keccak256(_headerRlpBytes);

        return result;
    }


    /**
     * @notice Verifies Merkle Patricia proof of an account and extracts the account fields.
     *
     * @param _addressHash Keccak256 hash of the address corresponding to the account.
     * @param _stateRootHash MPT root hash of the Ethereum state trie.
     */
    function extractAccountFromProof(
        bytes32 _addressHash, // keccak256(abi.encodePacked(address))
        bytes32 _stateRootHash,
        RLPReader.RLPItem[] memory _proof
    )
        internal pure returns (Account memory)
    {
        bytes memory acctRlpBytes = MerklePatriciaProofVerifier.extractProofValue(
            _stateRootHash,
            abi.encodePacked(_addressHash),
            _proof
        );

        Account memory account;

        if (acctRlpBytes.length == 0) {
            return account;
        }

        RLPReader.RLPItem[] memory acctFields = acctRlpBytes.toRlpItem().toList();
        require(acctFields.length == 4);

        account.exists = true;
        account.nonce = acctFields[0].toUint();
        account.balance = acctFields[1].toUint();
        account.storageRoot = bytes32(acctFields[2].toUint());
        account.codeHash = bytes32(acctFields[3].toUint());

        return account;
    }


    /**
     * @notice Verifies Merkle Patricia proof of a slot and extracts the slot's value.
     *
     * @param _slotHash Keccak256 hash of the slot position.
     * @param _storageRootHash MPT root hash of the account's storage trie.
     */
    function extractSlotValueFromProof(
        bytes32 _slotHash,
        bytes32 _storageRootHash,
        RLPReader.RLPItem[] memory _proof
    )
        internal pure returns (SlotValue memory)
    {
        bytes memory valueRlpBytes = MerklePatriciaProofVerifier.extractProofValue(
            _storageRootHash,
            abi.encodePacked(_slotHash),
            _proof
        );

        SlotValue memory value;

        if (valueRlpBytes.length != 0) {
            value.exists = true;
            value.value = valueRlpBytes.toRlpItem().toUint();
        }

        return value;
    }

}

library MerkleTrie {
      using RLPReader for RLPReader.RLPItem;
      using RLPReader for bytes;
  
    /// @dev Validates a Merkle-Patricia-Trie proof.
      ///      If the proof proves the inclusion of some key-value pair in the
      ///      trie, the value is returned. Otherwise, i.e. if the proof proves
      ///      the exclusion of a key from the trie, an empty byte array is
      ///      returned.
      /// @param rootHash is the Keccak-256 hash of the root node of the MPT.
      /// @param path is the key of the node whose inclusion/exclusion we are
      ///        proving.
      /// @param stack is the stack of MPT nodes (starting with the root) that
      ///        need to be traversed during verification.
      /// @return value whose inclusion is proved or an empty byte array for
      ///         a proof of exclusion
      function extractProofValue(
              bytes32 rootHash,
              bytes memory path,
              RLPReader.RLPItem[] memory stack
          ) internal pure returns (bytes memory value) {
              bytes memory mptKey = _decodeNibbles(path, 0);
              uint256 mptKeyOffset = 0;
      
          bytes32 nodeHashHash;
            RLPReader.RLPItem[] memory node;
      
          RLPReader.RLPItem memory rlpValue;
    
          if (stack.length == 0) {
                  // Root hash of empty Merkle-Patricia-Trie
                    require(rootHash == 0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421);
                      return new bytes(0);
                  }
        
            // Traverse stack of nodes starting at root.
              for (uint256 i = 0; i < stack.length; i++) {
        
                // We use the fact that an rlp encoded list consists of some
                    // encoding of its length plus the concatenation of its
                      // *rlp-encoded* items.
          
                // The root node is hashed with Keccak-256 ...
                    if (i == 0 && rootHash != stack[i].rlpBytesKeccak256()) {
                            revert();
                          }
                        // ... whereas all other nodes are hashed with the MPT
                        // hash function.
                        if (i != 0 && nodeHashHash != _mptHashHash(stack[i])) {
                              revert();
                          }
                        // We verified that stack[i] has the correct hash, so we
                        // may safely decode it.
                        node = stack[i].toList();
            
                  if (node.length == 2) {
                          // Extension or Leaf node
            
                      bool isLeaf;
                          bytes memory nodeKey;
                            (isLeaf, nodeKey) = _merklePatriciaCompactDecode(node[0].toBytes());
              
                      uint256 prefixLength = _sharedPrefixLength(mptKeyOffset, mptKey, nodeKey);
                          mptKeyOffset += prefixLength;
            
                      if (prefixLength < nodeKey.length) {
                                // Proof claims divergent extension or leaf. (Only
                                    // relevant for proofs of exclusion.)
                                      // An Extension/Leaf node is divergent iff it "skips" over
                                      // the point at which a Branch node should have been had the
                                      // excluded key been included in the trie.
                                      // Example: Imagine a proof of exclusion for path [1, 4],
                                      // where the current node is a Leaf node with
                                      // path [1, 3, 3, 7]. For [1, 4] to be included, there
                                      // should have been a Branch node at [1] with a child
                                      // at 3 and a child at 4.
                  
                            // Sanity check
                                  if (i < stack.length - 1) {
                                          // divergent node must come last in proof
                                            revert();
                                          }
                    
                              return new bytes(0);
                              }
              
                      if (isLeaf) {
                                // Sanity check
                                    if (i < stack.length - 1) {
                                            // leaf node must come last in proof
                                              revert();
                                          }
                    
                              if (mptKeyOffset < mptKey.length) {
                                        return new bytes(0);
                                        }
                    
                              rlpValue = node[1];
                                  return rlpValue.toBytes();
                                } else { // extension
                                    // Sanity check
                                      if (i == stack.length - 1) {
                                            // shouldn't be at last level
                                              revert();
                                          }
                    
                              if (!node[1].isList()) {
                                        // rlp(child) was at least 32 bytes. node[1] contains
                                            // Keccak256(rlp(child)).
                                              nodeHashHash = node[1].payloadKeccak256();
                                          } else {
                                              // rlp(child) was less than 32 bytes. node[1] contains
                                              // rlp(child).
                                              nodeHashHash = node[1].rlpBytesKeccak256();
                                          }
                                    }
                              } else if (node.length == 17) {
                                // Branch node
                
                        if (mptKeyOffset != mptKey.length) {
                                  // we haven't consumed the entire path, so we need to look at a child
                                    uint8 nibble = uint8(mptKey[mptKeyOffset]);
                                      mptKeyOffset += 1;
                                      if (nibble >= 16) {
                                            // each element of the path has to be a nibble
                                              revert();
                                          }
                    
                              if (_isEmptyBytesequence(node[nibble])) {
                                        // Sanity
                                            if (i != stack.length - 1) {
                                                    // leaf node should be at last level
                                                      revert();
                                                  }
                        
                                    return new bytes(0);
                                      } else if (!node[nibble].isList()) {
                                            nodeHashHash = node[nibble].payloadKeccak256();
                                          } else {
                                              nodeHashHash = node[nibble].rlpBytesKeccak256();
                                          }
                                    } else {
                                        // we have consumed the entire mptKey, so we need to look at what's contained in this node.
                    
                              // Sanity
                                  if (i != stack.length - 1) {
                                          // should be at last level
                                            revert();
                                          }
                    
                              return node[16].toBytes();
                              }
                          }
                    }
              }
      
  
    /// @dev Computes the hash of the Merkle-Patricia-Trie hash of the RLP item.
      ///      Merkle-Patricia-Tries use a weird "hash function" that outputs
      ///      *variable-length* hashes: If the item is shorter than 32 bytes,
      ///      the MPT hash is the item. Otherwise, the MPT hash is the
      ///      Keccak-256 hash of the item.
      ///      The easiest way to compare variable-length byte sequences is
      ///      to compare their Keccak-256 hashes.
      /// @param item The RLP item to be hashed.
      /// @return Keccak-256(MPT-hash(item))
      function _mptHashHash(RLPReader.RLPItem memory item) private pure returns (bytes32) {
            if (item.len < 32) {
                    return item.rlpBytesKeccak256();
                  } else {
                      return keccak256(abi.encodePacked(item.rlpBytesKeccak256()));
                  }
            }
      
      function _isEmptyBytesequence(RLPReader.RLPItem memory item) private pure returns (bool) {
            if (item.len != 1) {
                    return false;
                  }
                uint8 b;
                uint256 memPtr = item.memPtr;
                assembly {
                      b := byte(0, mload(memPtr))
                  }
                return b == 0x80 /* empty byte string */;
            }
      
  
    function _merklePatriciaCompactDecode(bytes memory compact) private pure returns (bool isLeaf, bytes memory nibbles) {
            require(compact.length > 0);
              uint256 first_nibble = uint8(compact[0]) >> 4 & 0xF;
              uint256 skipNibbles;
              if (first_nibble == 0) {
                    skipNibbles = 2;
                      isLeaf = false;
                  } else if (first_nibble == 1) {
                      skipNibbles = 1;
                      isLeaf = false;
                  } else if (first_nibble == 2) {
                      skipNibbles = 2;
                      isLeaf = true;
                  } else if (first_nibble == 3) {
                      skipNibbles = 1;
                      isLeaf = true;
                  } else {
                      // Not supposed to happen!
                      revert();
                  }
                return (isLeaf, _decodeNibbles(compact, skipNibbles));
            }
      
  
    function _decodeNibbles(bytes memory compact, uint256 skipNibbles) private pure returns (bytes memory nibbles) {
            require(compact.length > 0);
      
          uint256 length = compact.length * 2;
            require(skipNibbles <= length);
              length -= skipNibbles;
      
          nibbles = new bytes(length);
            uint256 nibblesLength = 0;
      
          for (uint256 i = skipNibbles; i < skipNibbles + length; i += 1) {
                  if (i % 2 == 0) {
                          nibbles[nibblesLength] = bytes1((uint8(compact[i/2]) >> 4) & 0xF);
                        } else {
                              nibbles[nibblesLength] = bytes1((uint8(compact[i/2]) >> 0) & 0xF);
                          }
                        nibblesLength += 1;
                    }
          
            assert(nibblesLength == nibbles.length);
          }
    
  
    function _sharedPrefixLength(uint256 xsOffset, bytes memory xs, bytes memory ys) private pure returns (uint256) {
            uint256 i;
              for (i = 0; i + xsOffset < xs.length && i < ys.length; i++) {
                    if (xs[i + xsOffset] != ys[i]) {
                            return i;
                          }
                    }
                  return i;
            }
      }
