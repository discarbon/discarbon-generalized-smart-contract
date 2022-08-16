const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { constants, expectRevert } = require('@openzeppelin/test-helpers');
const ERC20ABI = require("../ABI/ERC20.json");


const poolAddress = "0x967AF011954F71835167e88b61226B96CD558896"; // discarbon controlled address (for testing purposes)

const NCTAddress = "0xD838290e877E0188a4A44700463419ED96c16107";
const WMATICAddress = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
const USDCAddress = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const DAIAddress = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
const WETHAddress = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";

const NCTWhaleAddress = "0x4b3ebAe392E8B90A9b13068e90b27D9c41aBc3c8";
const WMATICWhaleAddress = "0x01aeFAC4A308FbAeD977648361fBAecFBCd380C7";
const USDCWhaleAddress = "0xF977814e90dA44bFA03b6295A0616a897441aceC";
const DAIWhaleAddress = "0x06959153B974D0D5fDfd87D561db6d8d4FA0bb0B";
const WETHWhaleAddress = "0x72A53cDBBcc1b9efa39c834A540550e23463AAcB";

describe("Pooling", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshopt in every test.
  async function deployPooling() {
    // Contracts are deployed using the first signer/account by default
    const [deployer, otherAccount] = await ethers.getSigners();

    const Pooling = await ethers.getContractFactory("Pooling");
    const pooling = await Pooling.deploy();

    // console.log("deployer: ", deployer.address)

    return { pooling, deployer, otherAccount };
  }

  describe("Deployment", function () {
    it("Should deploy", async function () {
      const { pooling, deployer, otherAccount } = await loadFixture(deployPooling);

      // console.log(JSON.stringify(pooling));

      expect(pooling.address != constants.zeroAddress);
    });
  });
  describe("Participation with MATIC", function () {
    it("Should record the address, pooled amount and forward the tokens", async function () {
      const { pooling, deployer, otherAccount } = await loadFixture(deployPooling);
      const NCT = new ethers.Contract(NCTAddress, ERC20ABI, ethers.provider);

      const maticToSend1 = ethers.utils.parseEther("0.0123");
      const maticToSend2 = ethers.utils.parseEther("0.0234");
      const carbonToReceive1 = ethers.utils.parseEther("0.001");
      const carbonToReceive2 = ethers.utils.parseEther("0.002");

      // Contribute from first address
      const NCTBalanceBefore = await NCT.balanceOf(poolAddress);

      await pooling.participateWithMatic(carbonToReceive1, { value: maticToSend1 });

      let recordedAddress = await pooling.contributorsAddresses(0);
      expect(recordedAddress).to.equal(deployer.address);
      let contribution1 = await pooling.contributions(deployer.address);
      expect(contribution1).to.equal(carbonToReceive1);
      let totalCarbonPooled = await pooling.totalCarbonPooled();
      expect(totalCarbonPooled).to.equal(contribution1);

      NCTBalanceAfter = await NCT.balanceOf(poolAddress);

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
      const { pooling, deployer, otherAccount } = await loadFixture(deployPooling);
      const NCT = new ethers.Contract(NCTAddress, ERC20ABI, ethers.provider);

      const carbonToReceive = ethers.utils.parseEther("0.001");

      // store state before transactions:
      const NCTBalanceBefore = await NCT.balanceOf(poolAddress);

      // Contribute from first address
      let maticEstimated = await pooling.calculateNeededAmount(WMATICAddress, carbonToReceive);
      await expect(pooling.participateWithMatic(carbonToReceive, { value: maticEstimated })).not.to.be.reverted;

      maticEstimated = await pooling.calculateNeededAmount(WMATICAddress, carbonToReceive);
      let reducedMaticAmount = maticEstimated.sub(ethers.utils.parseEther("0.0000000001"));

      await expect(pooling.participateWithMatic(carbonToReceive, { value: reducedMaticAmount })).to.be.revertedWith("Not enough Matic to swap to required carbon Token");

      NCTBalanceAfter = await NCT.balanceOf(poolAddress);
      NCTBalanceChange = NCTBalanceAfter.sub(NCTBalanceBefore);
      expect(NCTBalanceChange).to.equal(carbonToReceive);

    });
  });
  describe("Test participate with USDC", function () {
    it("Should record the address, pooled amount and forward the tokens", async function () {
      const { pooling, deployer, otherAccount } = await loadFixture(deployPooling);
      const NCT = new ethers.Contract(NCTAddress, ERC20ABI, ethers.provider);
      const USDC = new ethers.Contract(USDCAddress, ERC20ABI, ethers.provider);

      const fundingAmount = ethers.utils.parseEther("50");
      await fundWalletWithTokens(deployer.address, fundingAmount);
      const carbonToReceive = ethers.utils.parseEther("0.1");

      // normal contribution
      const NCTBalanceBefore = await NCT.balanceOf(poolAddress);
      let USDCEstimated = await pooling.calculateNeededAmount(USDCAddress, carbonToReceive);
      // console.log("USDC: ", USDCEstimated);
      await USDC.connect(deployer).approve(pooling.address, USDCEstimated);
      await expect(pooling.participateWithToken(USDCAddress, carbonToReceive)).not.to.be.reverted;

      NCTBalanceAfter = await NCT.balanceOf(poolAddress);
      NCTBalanceChange = NCTBalanceAfter.sub(NCTBalanceBefore);

      // Check accounting
      let recordedAddress = await pooling.contributorsAddresses(0);
      expect(recordedAddress).to.equal(deployer.address);
      let contribution = await pooling.contributions(deployer.address);
      expect(contribution).to.equal(carbonToReceive);
      // Check balances sent to pooling address
      expect(NCTBalanceChange).to.equal(carbonToReceive);

      // Approve less than estimated and see that it fails
      USDCEstimated = await pooling.calculateNeededAmount(USDCAddress, carbonToReceive);
      await USDC.connect(deployer).approve(pooling.address, USDCEstimated.sub(1));
      await expect(pooling.participateWithToken(USDCAddress, carbonToReceive)).to.be.reverted;
    });
  });
  describe("Test participate with WMATIC", function () {
    it("Should record the address, pooled amount and forward the tokens", async function () {
      const { pooling, deployer, otherAccount } = await loadFixture(deployPooling);
      const NCT = new ethers.Contract(NCTAddress, ERC20ABI, ethers.provider);
      const WMATIC = new ethers.Contract(WMATICAddress, ERC20ABI, ethers.provider);

      const carbonToReceive = ethers.utils.parseEther("0.1");
      const fundingAmount = ethers.utils.parseEther("50");
      await fundWalletWithTokens(deployer.address, fundingAmount);

      // normal contribution
      const NCTBalanceBefore = await NCT.balanceOf(poolAddress);
      let WMATICEstimated = await pooling.calculateNeededAmount(WMATICAddress, carbonToReceive);
      // console.log("WMATIC: ", WMATICEstimated);
      await WMATIC.connect(deployer).approve(pooling.address, WMATICEstimated);
      await expect(pooling.participateWithToken(WMATICAddress, carbonToReceive)).not.to.be.reverted;

      NCTBalanceAfter = await NCT.balanceOf(poolAddress);
      NCTBalanceChange = NCTBalanceAfter.sub(NCTBalanceBefore);

      // Check accounting
      let recordedAddress = await pooling.contributorsAddresses(0);
      expect(recordedAddress).to.equal(deployer.address);
      let contribution = await pooling.contributions(deployer.address);
      expect(contribution).to.equal(carbonToReceive);
      // Check balances sent to pooling address
      expect(NCTBalanceChange).to.equal(carbonToReceive);

      // Approve less than estimated and see that it fails
      WMATICEstimated = await pooling.calculateNeededAmount(WMATICAddress, carbonToReceive);
      await WMATIC.connect(deployer).approve(pooling.address, WMATICEstimated.sub(1));
      await expect(pooling.participateWithToken(WMATICAddress, carbonToReceive)).to.be.reverted;
    });
  });
  describe("Test participate with DAI", function () {
    it("Should record the address, pooled amount and forward the tokens", async function () {
      const { pooling, deployer, otherAccount } = await loadFixture(deployPooling);
      const NCT = new ethers.Contract(NCTAddress, ERC20ABI, ethers.provider);
      const DAI = new ethers.Contract(DAIAddress, ERC20ABI, ethers.provider);

      const carbonToReceive = ethers.utils.parseEther("0.1");
      const fundingAmount = ethers.utils.parseEther("50");
      await fundWalletWithTokens(deployer.address, fundingAmount);

      // normal contribution
      const NCTBalanceBefore = await NCT.balanceOf(poolAddress);
      let DAIEstimated = await pooling.calculateNeededAmount(DAIAddress, carbonToReceive);
      // console.log("DAI: ", DAIEstimated);
      await DAI.connect(deployer).approve(pooling.address, DAIEstimated);
      await expect(pooling.participateWithToken(DAIAddress, carbonToReceive)).not.to.be.reverted;

      NCTBalanceAfter = await NCT.balanceOf(poolAddress);
      NCTBalanceChange = NCTBalanceAfter.sub(NCTBalanceBefore);

      // Check accounting
      let recordedAddress = await pooling.contributorsAddresses(0);
      expect(recordedAddress).to.equal(deployer.address);
      let contribution = await pooling.contributions(deployer.address);
      expect(contribution).to.equal(carbonToReceive);
      // Check balances sent to pooling address
      expect(NCTBalanceChange).to.equal(carbonToReceive);

      // Approve less than estimated and see that it fails
      DAIEstimated = await pooling.calculateNeededAmount(DAIAddress, carbonToReceive);
      await DAI.connect(deployer).approve(pooling.address, DAIEstimated.sub(1));
      await expect(pooling.participateWithToken(DAIAddress, carbonToReceive)).to.be.reverted;
    });
  });
  describe("Test participate with WETH", function () {
    it("Should record the address, pooled amount and forward the tokens", async function () {
      const { pooling, deployer, otherAccount } = await loadFixture(deployPooling);
      const NCT = new ethers.Contract(NCTAddress, ERC20ABI, ethers.provider);
      const WETH = new ethers.Contract(WETHAddress, ERC20ABI, ethers.provider);

      const carbonToReceive = ethers.utils.parseEther("0.1");
      const fundingAmount = ethers.utils.parseEther("50");
      await fundWalletWithTokens(deployer.address, fundingAmount);

      // normal contribution
      const NCTBalanceBefore = await NCT.balanceOf(poolAddress);
      let WETHEstimated = await pooling.calculateNeededAmount(WETHAddress, carbonToReceive);
      // console.log("WETH: ", WETHEstimated);
      await WETH.connect(deployer).approve(pooling.address, WETHEstimated);
      await expect(pooling.participateWithToken(WETHAddress, carbonToReceive)).not.to.be.reverted;

      NCTBalanceAfter = await NCT.balanceOf(poolAddress);
      NCTBalanceChange = NCTBalanceAfter.sub(NCTBalanceBefore);

      // Check accounting
      let recordedAddress = await pooling.contributorsAddresses(0);
      expect(recordedAddress).to.equal(deployer.address);
      let contribution = await pooling.contributions(deployer.address);
      expect(contribution).to.equal(carbonToReceive);
      // Check balances sent to pooling address
      expect(NCTBalanceChange).to.equal(carbonToReceive);

      // Approve less than estimated and see that it fails
      WETHEstimated = await pooling.calculateNeededAmount(WETHAddress, carbonToReceive);
      await WETH.connect(deployer).approve(pooling.address, WETHEstimated.sub(1));
      await expect(pooling.participateWithToken(WETHAddress, carbonToReceive)).to.be.reverted;
    });
  });
  describe("Test participate with NCT", function () {
    it("Should record the address, pooled amount and forward the tokens", async function () {
      const { pooling, deployer, otherAccount } = await loadFixture(deployPooling);
      const NCT = new ethers.Contract(NCTAddress, ERC20ABI, ethers.provider);

      const carbonToReceive = ethers.utils.parseEther("0.1");
      const fundingAmount = ethers.utils.parseEther("50");
      await fundWalletWithTokens(deployer.address, fundingAmount);

      // normal contribution
      const NCTBalanceBefore = await NCT.balanceOf(poolAddress);
      let NCTEstimated = await pooling.calculateNeededAmount(NCTAddress, carbonToReceive);
      // console.log("NCT: ", NCTEstimated);
      await NCT.connect(deployer).approve(pooling.address, NCTEstimated);
      await expect(pooling.participateWithToken(NCTAddress, carbonToReceive)).not.to.be.reverted;

      NCTBalanceAfter = await NCT.balanceOf(poolAddress);
      NCTBalanceChange = NCTBalanceAfter.sub(NCTBalanceBefore);

      // Check accounting
      let recordedAddress = await pooling.contributorsAddresses(0);
      expect(recordedAddress).to.equal(deployer.address);
      let contribution = await pooling.contributions(deployer.address);
      expect(contribution).to.equal(carbonToReceive);
      // Check balances sent to pooling address
      expect(NCTBalanceChange).to.equal(carbonToReceive);

      // Approve less than estimated and see that it fails
      NCTEstimated = await pooling.calculateNeededAmount(NCTAddress, carbonToReceive);
      // console.log("NCT: ", NCTEstimated);

      await NCT.connect(deployer).approve(pooling.address, NCTEstimated.sub(1));
      await expect(pooling.participateWithToken(NCTAddress, carbonToReceive)).to.be.reverted;
    });
  });
})

async function fundWalletWithTokens(AddressToFund, amount) {
  const NCT = new ethers.Contract(NCTAddress, ERC20ABI, ethers.provider);
  const WMATIC = new ethers.Contract(WMATICAddress, ERC20ABI, ethers.provider);
  const USDC = new ethers.Contract(USDCAddress, ERC20ABI, ethers.provider);
  const DAI = new ethers.Contract(DAIAddress, ERC20ABI, ethers.provider);
  const WETH = new ethers.Contract(WETHAddress, ERC20ABI, ethers.provider);

  await fundWalletWithSingleToken(NCTAddress, NCTWhaleAddress, AddressToFund, amount);
  await fundWalletWithSingleToken(WMATICAddress, WMATICWhaleAddress, AddressToFund, amount);
  // Special treatment for USDC. USDC only has 6 decimals instead of 12
  const humanReadableAmount = ethers.utils.formatEther(amount);
  const USDCamount = ethers.utils.parseUnits(humanReadableAmount, 6);
  await fundWalletWithSingleToken(USDCAddress, USDCWhaleAddress, AddressToFund, USDCamount);
  await fundWalletWithSingleToken(DAIAddress, DAIWhaleAddress, AddressToFund, amount);
  await fundWalletWithSingleToken(WETHAddress, WETHWhaleAddress, AddressToFund, amount);

  // console.log("NCT Balance", ethers.utils.formatEther(await NCT.balanceOf(AddressToFund)));
  // console.log("WMATIC Balance", ethers.utils.formatEther(await WMATIC.balanceOf(AddressToFund)));
  // console.log("USDC Balance", ethers.utils.formatUnits(await USDC.balanceOf(AddressToFund), 6));
  // console.log("DAI Balance", ethers.utils.formatEther(await DAI.balanceOf(AddressToFund)));
  // console.log("WETH Balance", ethers.utils.formatEther(await WETH.balanceOf(AddressToFund)));
}

async function fundWalletWithSingleToken(tokenAddress, tokenWhaleAddress, addressToFund, amount) {
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [tokenWhaleAddress],
  });

  const tokenWhaleSigner = await ethers.getSigner(tokenWhaleAddress)
  const provider = ethers.provider;
  const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, provider);

  await tokenContract.connect(tokenWhaleSigner).transfer(addressToFund, amount);
}
