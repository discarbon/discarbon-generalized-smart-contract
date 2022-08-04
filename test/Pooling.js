const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

const { constants, expectRevert } = require('@openzeppelin/test-helpers');

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
      const { pooling, owner, otherAccount } = await loadFixture(deployPooling);

      // console.log(JSON.stringify(pooling));

      expect(pooling.address != constants.zeroAddress);
    });
  });
  describe("Initial transfer", function () {
    it("Should record the address and pooled amount", async function () {
      const { pooling, owner, otherAccount } = await loadFixture(deployPooling);

      const ethToSend1 = ethers.utils.parseEther("0.01");
      const ethToSend2 = ethers.utils.parseEther("0.02");
      const carbonToReceive1 = ethers.utils.parseEther("0.001");
      const carbonToReceive2 = ethers.utils.parseEther("0.002");

      // Contribute from first address
      await pooling.exchangeCoinToCarbonToken(carbonToReceive1, { value: ethToSend1 });
      let recordedAddress = await pooling.contributorsAddresses(0);
      expect(recordedAddress).to.equal(owner.address);
      let contribution1 = await pooling.contributions(owner.address);
      expect(contribution1).to.equal(ethToSend1);
      let totalCarbonPooled = await pooling.totalCarbonPooled();
      expect(totalCarbonPooled).to.equal(contribution1);

      // Contribute from second address
      await pooling.connect(otherAccount).exchangeCoinToCarbonToken(carbonToReceive2, { value: ethToSend2 });
      expect(await pooling.contributorsAddresses(1)).to.equal(otherAccount.address);
      let contribution2 = await pooling.contributions(otherAccount.address);
      expect(contribution2).to.equal(ethToSend2);

      totalCarbonPooled = await pooling.totalCarbonPooled();
      expect(totalCarbonPooled).to.equal(ethToSend1.add(ethToSend2));
    });
  });
});
