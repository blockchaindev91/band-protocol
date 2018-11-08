pragma solidity ^0.4.24;


/**
 * @title Proof
 *
 * @dev Proof library is a utility library for Merkle proof on sparse Merkle
 * tree. See https://ethresear.ch/t/optimizing-sparse-merkle-trees/3751.
 */
library Proof {

  /**
   * @dev Verify that the given key-value belongs to the merkle tree.
   * @param rootHash Merkle root hash
   * @param key The key (address) in Merkle tree
   * @param value The value that is claimed to be in the tree
   * @param proof Merkle tree proof
   */
  function verify(
    bytes32 rootHash,
    address key,
    bytes32 value,
    bytes32[] proof
  )
    internal
    pure
    returns (bool)
  {
    bytes32 currentLeaf = value;
    bytes32 anotherLeaf;

    uint256 proofIndex = 1;
    uint256 mask = uint256(proof[0]);

    for (uint256 i = 1; i < (1 << 160); i <<= 1) {
      if ((mask & i) > 0) {
        anotherLeaf = bytes32(0);
      } else {
        anotherLeaf = proof[proofIndex];
        proofIndex++;
      }

      if ((uint(key) & i) == 0) {
        currentLeaf = hash(currentLeaf, anotherLeaf);
      } else {
        currentLeaf = hash(anotherLeaf, currentLeaf);
      }
    }

    require(currentLeaf == rootHash, "Invalid proof");
    return true;
  }

  /**
   * @dev Update the tree by changing the value at 'key' from 'oldValue' to
   * 'newValue'. Note that this also requires the proof that 'oldValue' exists.
   * @return The new root hash after chaning 'key' to map to 'newValue'
   */
  function update(
    bytes32 rootHash,
    address key,
    bytes32 oldValue,
    bytes32 newValue,
    bytes32[] proof
  )
    internal
    pure
    returns (bytes32)
  {
    bytes32 currentLeaf = oldValue;
    bytes32 newRootHash = newValue;
    bytes32 anotherLeaf;

    uint256 proofIndex = 1;
    uint256 mask = uint256(proof[0]);

    for (uint256 i = 1; i < (1 << 160); i <<= 1) {
      if ((mask & i) > 0) {
        anotherLeaf = bytes32(0);
      } else {
        anotherLeaf = proof[proofIndex];
        proofIndex++;
      }

      if ((uint(key) & i) == 0) {
        currentLeaf = hash(currentLeaf, anotherLeaf);
        newRootHash = hash(newRootHash, anotherLeaf);
      } else {
        currentLeaf = hash(anotherLeaf, currentLeaf);
        newRootHash = hash(anotherLeaf, newRootHash);
      }
    }

    require(currentLeaf == rootHash, "Invalid proof");
    return newRootHash;
  }

  /**
   * @dev Similar to keccak256, but optimize to return 0 when hashing (0, 0)
   */
  function hash(bytes32 left, bytes32 right) private pure returns(bytes32){
    if (left == bytes32(0) && right == bytes32(0)) {
      return bytes32(0);
    }

    return keccak256(abi.encodePacked(left, right));
  }
}
