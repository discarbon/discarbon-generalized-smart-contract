const {time, loadFixture} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

const {constants, expectRevert} = require('@openzeppelin/test-helpers');

describe("Pooling", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshopt in every test.
  async function deployPooling() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const Pooling = await ethers.getContractFactory("Pooling");
    const pooling = await Pooling.deploy();

    return { pooling, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should deploy", async function () {
      const {pooling, owner, otherAccount } = await loadFixture(deployPooling);

      // console.log(JSON.stringify(pooling));

      expect(pooling.address != constants.zeroAddress);
    });
  });
});
