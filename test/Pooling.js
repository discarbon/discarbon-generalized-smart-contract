const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { constants, expectRevert } = require('@openzeppelin/test-helpers');
const ERC20ABI = require("../ABI/ERC20.json");



const NCTAddress = "0xD838290e877E0188a4A44700463419ED96c16107";
const WMATICAddress = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
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
  describe("Participation with MATIC", function () {
    it("Should record the address, pooled amount and forward the tokens", async function () {
      const { pooling, owner, otherAccount } = await loadFixture(deployPooling);
      const NCT = new ethers.Contract(NCTAddress, ERC20ABI, ethers.provider);

      const maticToSend1 = ethers.utils.parseEther("0.0123");
      const maticToSend2 = ethers.utils.parseEther("0.0234");
      const carbonToReceive1 = ethers.utils.parseEther("0.001");
      const carbonToReceive2 = ethers.utils.parseEther("0.002");

      // Contribute from first address
      const NCTBalanceBefore = await NCT.balanceOf(poolingAddress);

      await pooling.participateWithMatic(carbonToReceive1, { value: maticToSend1 });

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
      await pooling.connect(otherAccount).participateWithMatic(carbonToReceive2, { value: maticToSend2 });
      expect(await pooling.contributorsAddresses(1)).to.equal(otherAccount.address);
      let contribution2 = await pooling.contributions(otherAccount.address);
      expect(contribution2).to.equal(carbonToReceive2);

      totalCarbonPooled = await pooling.totalCarbonPooled();
      expect(totalCarbonPooled).to.equal(carbonToReceive1.add(carbonToReceive2));

    });
  });
  describe("Test estimate function", function () {
    it("Should record the address, pooled amount and forward the tokens", async function () {
      const { pooling, owner, otherAccount } = await loadFixture(deployPooling);
      const NCT = new ethers.Contract(NCTAddress, ERC20ABI, ethers.provider);

      const carbonToReceive = ethers.utils.parseEther("0.001");

      // store state before transactions:
      const NCTBalanceBefore = await NCT.balanceOf(poolingAddress);

      // Contribute from first address
      let maticEstimated = await pooling.calculateNeededAmount(WMATICAddress, carbonToReceive);
      await expect(pooling.participateWithMatic(carbonToReceive, { value: maticEstimated })).not.to.be.reverted;

      maticEstimated = await pooling.calculateNeededAmount(WMATICAddress, carbonToReceive);
      let reducedMaticAmount = maticEstimated.sub(ethers.utils.parseEther("0.0000000001"));

      await expect(pooling.participateWithMatic(carbonToReceive, { value: reducedMaticAmount })).to.be.revertedWith("Not enough Matic to swap to required carbon Token");

      NCTBalanceAfter = await NCT.balanceOf(poolingAddress);
      NCTBalanceChange = NCTBalanceAfter.sub(NCTBalanceBefore);
      expect(NCTBalanceChange).to.equal(carbonToReceive);

    });
  });
  describe("Test participation with token", function () {
    it("Should record the address, pooled amount and forward the tokens", async function () {
      const { pooling, owner, otherAccount } = await loadFixture(deployPooling);
      const NCT = new ethers.Contract(NCTAddress, ERC20ABI, ethers.provider);

      NCTWhaleAddress = "0x4b3ebAe392E8B90A9b13068e90b27D9c41aBc3c8";

      console.log("Balance before: ", await NCT.balanceOf(owner.address))
      await fundWalletWithToken(NCTAddress, NCTWhaleAddress, owner.address, 111);
      console.log("Balance after: ", await NCT.balanceOf(owner.address))




      // const maticToSend1 = ethers.utils.parseEther("0.0123");
      // const maticToSend2 = ethers.utils.parseEther("0.0234");
      // const carbonToReceive1 = ethers.utils.parseEther("0.001");
      // const carbonToReceive2 = ethers.utils.parseEther("0.002");

      // // Contribute from first address
      // const NCTBalanceBefore = await NCT.balanceOf(poolingAddress);

      // await pooling.participateWithMatic(carbonToReceive1, { value: maticToSend1 });

      // let recordedAddress = await pooling.contributorsAddresses(0);
      // expect(recordedAddress).to.equal(owner.address);
      // let contribution1 = await pooling.contributions(owner.address);
      // expect(contribution1).to.equal(carbonToReceive1);
      // let totalCarbonPooled = await pooling.totalCarbonPooled();
      // expect(totalCarbonPooled).to.equal(contribution1);

      // NCTBalanceAfter = await NCT.balanceOf(poolingAddress);

      // NCTBalanceChange = NCTBalanceAfter.sub(NCTBalanceBefore);
      // expect(NCTBalanceChange).to.equal(carbonToReceive1);

      // // Contribute from second address
      // await pooling.connect(otherAccount).participateWithMatic(carbonToReceive2, { value: maticToSend2 });
      // expect(await pooling.contributorsAddresses(1)).to.equal(otherAccount.address);
      // let contribution2 = await pooling.contributions(otherAccount.address);
      // expect(contribution2).to.equal(carbonToReceive2);

      // totalCarbonPooled = await pooling.totalCarbonPooled();
      // expect(totalCarbonPooled).to.equal(carbonToReceive1.add(carbonToReceive2));

    });
  });
})

async function fundWalletWithToken(tokenAddress, tokenWhaleAddress, addressToFund, amount) {

  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [tokenWhaleAddress],
  });

  const tokenWhaleSigner = await ethers.getSigner(tokenWhaleAddress)

  const provider = ethers.provider;
  const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, provider);

  await tokenContract.connect(tokenWhaleSigner).transfer(addressToFund, amount);
}
