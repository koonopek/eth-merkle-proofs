const Trie = artifacts.require("MerkleTrie");

contract("Trie", () => {

  it("should assert true", async () => {
    const trie = await Trie.deployed();

    try {
      const result = await trie.extractProofValue(
        "0x" + "1".repeat(32),
        "0x12",
        [],
      );
      console.log(result)
    } catch (e) {
      console.log(e)
    }
  });

});
