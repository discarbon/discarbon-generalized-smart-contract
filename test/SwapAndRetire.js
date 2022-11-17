const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { constants, expectRevert } = require('@openzeppelin/test-helpers');
const ERC20ABI = require("../ABI/ERC20.json");

const donationAddress = "0xCFA521D5514dDf8334f3907dcFe99752D51580E9"; // disCarbon multisig address

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

describe("disCarbonSwapAndRetire", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshopt in every test.
  async function deployRetireContract() {
    // Contracts are deployed using the first signer/account by default
    const [deployer, otherAccount] = await ethers.getSigners();

    const disCarbonSwapAndRetire = await ethers.getContractFactory("disCarbonSwapAndRetire");
    const retireContract = await disCarbonSwapAndRetire.deploy();

    // console.log("deployer: ", deployer.address)

    return { retireContract, deployer, otherAccount };
  }

  describe("Deployment", function () {
    it("Should deploy", async function () {
      const { retireContract, deployer, otherAccount } = await loadFixture(deployRetireContract);
      expect(retireContract.address != constants.zeroAddress);
    });
  });
  describe("Retire with MATIC", function () {
    it("Should record the address, pooled amount and forward the tokens", async function () {
      const { retireContract, deployer, otherAccount } = await loadFixture(deployRetireContract);
      const NCT = new ethers.Contract(NCTAddress, ERC20ABI, ethers.provider);

      const maticToSend1 = ethers.utils.parseEther("0.0123");
      const maticToSend2 = ethers.utils.parseEther("0.0234");
      const carbonToRetire1 = ethers.utils.parseEther("0.001");
      const carbonToRetire2 = ethers.utils.parseEther("0.002");

      // Contribute from first address
      const NCTBalanceBefore = await NCT.balanceOf(donationAddress);

      await expect(retireContract.retireWithMatic(carbonToRetire1, { value: maticToSend1 }))
        .to.emit(retireContract, "ContributionSent")
        .withArgs("Matic", carbonToRetire1);

      let recordedAddress = await retireContract.contributorsAddresses(0);
      expect(recordedAddress).to.equal(deployer.address);
      let contribution1 = await retireContract.contributions(deployer.address);
      expect(contribution1).to.equal(carbonToRetire1);
      let totalCarbonPooled = await retireContract.totalCarbonPooled();
      expect(totalCarbonPooled).to.equal(contribution1);

      NCTBalanceAfter = await NCT.balanceOf(donationAddress);

      NCTBalanceChange = NCTBalanceAfter.sub(NCTBalanceBefore);
      expect(NCTBalanceChange).to.equal(carbonToRetire1);

      // Contribute from second address
      await retireContract.connect(otherAccount).retireWithMatic(carbonToRetire2, { value: maticToSend2 });
      expect(await retireContract.contributorsAddresses(1)).to.equal(otherAccount.address);
      let contribution2 = await retireContract.contributions(otherAccount.address);
      expect(contribution2).to.equal(carbonToRetire2);

      totalCarbonPooled = await retireContract.totalCarbonPooled();
      expect(totalCarbonPooled).to.equal(carbonToRetire1.add(carbonToRetire2));

    });
  });
  describe("Test estimate function", function () {
    it("Should record the address, pooled amount and forward the tokens", async function () {
      const { retireContract, deployer, otherAccount } = await loadFixture(deployRetireContract);
      const NCT = new ethers.Contract(NCTAddress, ERC20ABI, ethers.provider);

      const carbonToRetire = ethers.utils.parseEther("0.001");

      // store state before transactions:
      const NCTBalanceBefore = await NCT.balanceOf(donationAddress);

      // Contribute from first address
      let maticEstimated = await retireContract.calculateNeededAmount(WMATICAddress, carbonToRetire);
      await expect(retireContract.retireWithMatic(carbonToRetire, { value: maticEstimated })).not.to.be.reverted;

      maticEstimated = await retireContract.calculateNeededAmount(WMATICAddress, carbonToRetire);
      let reducedMaticAmount = maticEstimated.sub(ethers.utils.parseEther("0.0000000001"));

      await expect(retireContract.retireWithMatic(carbonToRetire, { value: reducedMaticAmount })).to.be.revertedWith("Not enough Matic to swap to required carbon Token");

      NCTBalanceAfter = await NCT.balanceOf(donationAddress);
      NCTBalanceChange = NCTBalanceAfter.sub(NCTBalanceBefore);
      expect(NCTBalanceChange).to.equal(carbonToRetire);

    });
  });
  describe("Test retire with USDC", function () {
    it("Should record the address, pooled amount and forward the tokens", async function () {
      const { retireContract, deployer, otherAccount } = await loadFixture(deployRetireContract);
      const NCT = new ethers.Contract(NCTAddress, ERC20ABI, ethers.provider);
      const USDC = new ethers.Contract(USDCAddress, ERC20ABI, ethers.provider);

      const fundingAmount = ethers.utils.parseEther("50");
      await fundWalletWithTokens(deployer.address, fundingAmount);
      const carbonToRetire = ethers.utils.parseEther("0.1");

      // normal contribution
      const NCTBalanceBefore = await NCT.balanceOf(donationAddress);
      let USDCEstimated = await retireContract.calculateNeededAmount(USDCAddress, carbonToRetire);
      // console.log("USDC: ", USDCEstimated);
      await USDC.connect(deployer).approve(retireContract.address, USDCEstimated);
      await expect(retireContract.retireWithToken(USDCAddress, carbonToRetire))
      .to.emit(retireContract, "ContributionSent")
      .withArgs("Token", carbonToRetire);

      NCTBalanceAfter = await NCT.balanceOf(donationAddress);
      NCTBalanceChange = NCTBalanceAfter.sub(NCTBalanceBefore);

      // Check accounting
      let recordedAddress = await retireContract.contributorsAddresses(0);
      expect(recordedAddress).to.equal(deployer.address);
      let contribution = await retireContract.contributions(deployer.address);
      expect(contribution).to.equal(carbonToRetire);
      // Check balances sent to retireContract address
      expect(NCTBalanceChange).to.equal(carbonToRetire);

      // Approve less than estimated and see that it fails
      USDCEstimated = await retireContract.calculateNeededAmount(USDCAddress, carbonToRetire);
      await USDC.connect(deployer).approve(retireContract.address, USDCEstimated.sub(1));
      await expect(retireContract.retireWithToken(USDCAddress, carbonToRetire)).to.be.reverted;
    });
  });
  describe("Test retire with WMATIC", function () {
    it("Should record the address, pooled amount and forward the tokens", async function () {
      const { retireContract, deployer, otherAccount } = await loadFixture(deployRetireContract);
      const NCT = new ethers.Contract(NCTAddress, ERC20ABI, ethers.provider);
      const WMATIC = new ethers.Contract(WMATICAddress, ERC20ABI, ethers.provider);

      const carbonToRetire = ethers.utils.parseEther("0.1");
      const fundingAmount = ethers.utils.parseEther("50");
      await fundWalletWithTokens(deployer.address, fundingAmount);

      // normal contribution
      const NCTBalanceBefore = await NCT.balanceOf(donationAddress);
      let WMATICEstimated = await retireContract.calculateNeededAmount(WMATICAddress, carbonToRetire);
      // console.log("WMATIC: ", WMATICEstimated);
      await WMATIC.connect(deployer).approve(retireContract.address, WMATICEstimated);
      await expect(retireContract.retireWithToken(WMATICAddress, carbonToRetire))
      .to.emit(retireContract, "ContributionSent")
      .withArgs("Token", carbonToRetire);

      NCTBalanceAfter = await NCT.balanceOf(donationAddress);
      NCTBalanceChange = NCTBalanceAfter.sub(NCTBalanceBefore);

      // Check accounting
      let recordedAddress = await retireContract.contributorsAddresses(0);
      expect(recordedAddress).to.equal(deployer.address);
      let contribution = await retireContract.contributions(deployer.address);
      expect(contribution).to.equal(carbonToRetire);
      // Check balances sent to pooling address
      expect(NCTBalanceChange).to.equal(carbonToRetire);

      // Approve less than estimated and see that it fails
      WMATICEstimated = await retireContract.calculateNeededAmount(WMATICAddress, carbonToRetire);
      await WMATIC.connect(deployer).approve(retireContract.address, WMATICEstimated.sub(1));
      await expect(retireContract.retireWithToken(WMATICAddress, carbonToRetire)).to.be.reverted;
    });
  });
  describe("Test retire with DAI", function () {
    it("Should record the address, pooled amount and forward the tokens", async function () {
      const { retireContract, deployer, otherAccount } = await loadFixture(deployRetireContract);
      const NCT = new ethers.Contract(NCTAddress, ERC20ABI, ethers.provider);
      const DAI = new ethers.Contract(DAIAddress, ERC20ABI, ethers.provider);

      const carbonToRetire = ethers.utils.parseEther("0.1");
      const fundingAmount = ethers.utils.parseEther("50");
      await fundWalletWithTokens(deployer.address, fundingAmount);

      // normal contribution
      const NCTBalanceBefore = await NCT.balanceOf(donationAddress);
      let DAIEstimated = await retireContract.calculateNeededAmount(DAIAddress, carbonToRetire);
      // console.log("DAI: ", DAIEstimated);
      await DAI.connect(deployer).approve(retireContract.address, DAIEstimated);
      await expect(retireContract.retireWithToken(DAIAddress, carbonToRetire))
      .to.emit(retireContract, "ContributionSent")
      .withArgs("Token", carbonToRetire);

      NCTBalanceAfter = await NCT.balanceOf(donationAddress);
      NCTBalanceChange = NCTBalanceAfter.sub(NCTBalanceBefore);

      // Check accounting
      let recordedAddress = await retireContract.contributorsAddresses(0);
      expect(recordedAddress).to.equal(deployer.address);
      let contribution = await retireContract.contributions(deployer.address);
      expect(contribution).to.equal(carbonToRetire);
      // Check balances sent to pooling address
      expect(NCTBalanceChange).to.equal(carbonToRetire);

      // Approve less than estimated and see that it fails
      DAIEstimated = await retireContract.calculateNeededAmount(DAIAddress, carbonToRetire);
      await DAI.connect(deployer).approve(retireContract.address, DAIEstimated.sub(1));
      await expect(retireContract.retireWithToken(DAIAddress, carbonToRetire)).to.be.reverted;
    });
  });
  describe("Test retire with WETH", function () {
    it("Should record the address, pooled amount and forward the tokens", async function () {
      const { retireContract, deployer, otherAccount } = await loadFixture(deployRetireContract);
      const NCT = new ethers.Contract(NCTAddress, ERC20ABI, ethers.provider);
      const WETH = new ethers.Contract(WETHAddress, ERC20ABI, ethers.provider);

      const carbonToRetire = ethers.utils.parseEther("0.1");
      const fundingAmount = ethers.utils.parseEther("50");
      await fundWalletWithTokens(deployer.address, fundingAmount);

      // normal contribution
      const NCTBalanceBefore = await NCT.balanceOf(donationAddress);
      let WETHEstimated = await retireContract.calculateNeededAmount(WETHAddress, carbonToRetire);
      // console.log("WETH: ", WETHEstimated);
      await WETH.connect(deployer).approve(retireContract.address, WETHEstimated);
      await expect(retireContract.retireWithToken(WETHAddress, carbonToRetire))
      .to.emit(retireContract, "ContributionSent")
      .withArgs("Token", carbonToRetire);

      NCTBalanceAfter = await NCT.balanceOf(donationAddress);
      NCTBalanceChange = NCTBalanceAfter.sub(NCTBalanceBefore);

      // Check accounting
      let recordedAddress = await retireContract.contributorsAddresses(0);
      expect(recordedAddress).to.equal(deployer.address);
      let contribution = await retireContract.contributions(deployer.address);
      expect(contribution).to.equal(carbonToRetire);
      // Check balances sent to pooling address
      expect(NCTBalanceChange).to.equal(carbonToRetire);

      // Approve less than estimated and see that it fails
      WETHEstimated = await retireContract.calculateNeededAmount(WETHAddress, carbonToRetire);
      await WETH.connect(deployer).approve(retireContract.address, WETHEstimated.sub(1));
      await expect(retireContract.retireWithToken(WETHAddress, carbonToRetire)).to.be.reverted;
    });
  });
  describe("Test retire with NCT", function () {
    it("Should record the address, pooled amount and forward the tokens", async function () {
      const { retireContract, deployer, otherAccount } = await loadFixture(deployRetireContract);
      const NCT = new ethers.Contract(NCTAddress, ERC20ABI, ethers.provider);

      const carbonToRetire = ethers.utils.parseEther("0.1");
      const fundingAmount = ethers.utils.parseEther("50");
      await fundWalletWithTokens(deployer.address, fundingAmount);

      // normal contribution
      const NCTBalanceBefore = await NCT.balanceOf(donationAddress);
      let NCTEstimated = await retireContract.calculateNeededAmount(NCTAddress, carbonToRetire);
      // console.log("NCT: ", NCTEstimated);
      await NCT.connect(deployer).approve(retireContract.address, NCTEstimated);
      await expect(retireContract.retireWithToken(NCTAddress, carbonToRetire))
      .to.emit(retireContract, "ContributionSent")
      .withArgs("Token", carbonToRetire);

      NCTBalanceAfter = await NCT.balanceOf(donationAddress);
      NCTBalanceChange = NCTBalanceAfter.sub(NCTBalanceBefore);

      // Check accounting
      let recordedAddress = await retireContract.contributorsAddresses(0);
      expect(recordedAddress).to.equal(deployer.address);
      let contribution = await retireContract.contributions(deployer.address);
      expect(contribution).to.equal(carbonToRetire);
      // Check balances sent to pooling address
      expect(NCTBalanceChange).to.equal(carbonToRetire);

      // Approve less than estimated and see that it fails
      NCTEstimated = await retireContract.calculateNeededAmount(NCTAddress, carbonToRetire);
      // console.log("NCT: ", NCTEstimated);

      await NCT.connect(deployer).approve(retireContract.address, NCTEstimated.sub(1));
      await expect(retireContract.retireWithToken(NCTAddress, carbonToRetire)).to.be.reverted;
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
