const Trie = artifacts.require("MerkleTrie")

module.exports = function(deployer) {
  deployer.deploy(Trie);
};
