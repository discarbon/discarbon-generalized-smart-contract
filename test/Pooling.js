const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { constants, expectRevert } = require('@openzeppelin/test-helpers');
const ERC20ABI = require("../ABI/ERC20.json");



const NCTAddress = "0xD838290e877E0188a4A44700463419ED96c16107";
const poolingAddress = "0x1c0AcCc24e1549125b5b3c14D999D3a496Afbdb1"; // haurogs public address (for testing purposes)

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
    it("Should record the address, pooled amount and forward the tokens", async function () {
      const { pooling, owner, otherAccount } = await loadFixture(deployPooling);
      const NCT = new ethers.Contract(NCTAddress, ERC20ABI, ethers.provider);

      const ethToSend1 = ethers.utils.parseEther("0.0123");
      const ethToSend2 = ethers.utils.parseEther("0.0234");
      const carbonToReceive1 = ethers.utils.parseEther("0.001");
      const carbonToReceive2 = ethers.utils.parseEther("0.002");

      // Contribute from first address
      NCTBalanceBefore = await NCT.balanceOf(poolingAddress);

      await pooling.participateWithMatic(carbonToReceive1, { value: ethToSend1 });

      let recordedAddress = await pooling.contributorsAddresses(0);
      expect(recordedAddress).to.equal(owner.address);
      let contribution1 = await pooling.contributions(owner.address);
      expect(contribution1).to.equal(carbonToReceive1);
      let totalCarbonPooled = await pooling.totalCarbonPooled();
      expect(totalCarbonPooled).to.equal(contribution1);

      NCTBalanceAfter = await NCT.balanceOf(poolingAddress);

      NCTBalanceChange = NCTBalanceAfter.sub(NCTBalanceBefore);
      expect(NCTBalanceChange).to.equal(carbonToReceive1);

      // Contribute from second address
      await pooling.connect(otherAccount).participateWithMatic(carbonToReceive2, { value: ethToSend2 });
      expect(await pooling.contributorsAddresses(1)).to.equal(otherAccount.address);
      let contribution2 = await pooling.contributions(otherAccount.address);
      expect(contribution2).to.equal(carbonToReceive2);

      totalCarbonPooled = await pooling.totalCarbonPooled();
      expect(totalCarbonPooled).to.equal(carbonToReceive1.add(carbonToReceive2));

    });
  });
});
