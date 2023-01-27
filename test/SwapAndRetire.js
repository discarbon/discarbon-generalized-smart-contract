const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { constants, expectRevert } = require('@openzeppelin/test-helpers');
const ERC20ABI = require("../ABI/ERC20.json");
const NCTABI = require("../ABI/NCT.json");
const RetirementCertificatesABI = require("../ABI/RetirementCertificates.json");

// Toucan RetirementCertificates ERC721 contract
const retirementCertificatesAddress = "0x5e377f16E4ec6001652befD737341a28889Af002";

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
  // and reset Hardhat Network to that snapshot in every test.
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
      const { retireContract } = await loadFixture(deployRetireContract);
      expect(retireContract.address != constants.ZERO_ADDRESS);
    });
  });

  describe("Test retire using MATIC, zero donation", function () {
    it("Should record the address, retired amount, retire the tokens", async function () {
      const { retireContract, deployer, otherAccount } = await loadFixture(deployRetireContract);
      const NCT = new ethers.Contract(NCTAddress, ERC20ABI, ethers.provider);

      const maticToSend1 = ethers.utils.parseEther("0.0123");
      const maticToSend2 = ethers.utils.parseEther("0.0234");
      const carbonToRetire1 = ethers.utils.parseEther("0.001");
      const carbonToRetire2 = ethers.utils.parseEther("0.002");
      const donationPercentage = 0;
      const carbonToDonate = ethers.utils.parseEther("0");

      // Retire from first address
      const DonationBalanceBefore = await NCT.balanceOf(donationAddress);

      await expect(retireContract.retireWithMatic(carbonToRetire1, donationPercentage, { value: maticToSend1 }))
        .to.emit(retireContract, "CarbonRetired")
        .withArgs("Matic", carbonToRetire1);
      let recordedAddress = await retireContract.retirementBeneficiaryAddresses(0);
      expect(recordedAddress).to.equal(deployer.address);
      let retirement1 = await retireContract.beneficiaryRetirements(deployer.address);
      expect(retirement1).to.equal(carbonToRetire1);
      let totalCarbonRetired = await retireContract.totalCarbonRetired();
      expect(totalCarbonRetired).to.equal(retirement1);

      DonationBalanceAfter = await NCT.balanceOf(donationAddress);
      DonationBalanceChange = DonationBalanceAfter.sub(DonationBalanceBefore);
      expect(DonationBalanceChange).to.equal(carbonToDonate);

      // Retire from second address
      await retireContract.connect(otherAccount).retireWithMatic(carbonToRetire2, donationPercentage, { value: maticToSend2 });
      expect(await retireContract.retirementBeneficiaryAddresses(1)).to.equal(otherAccount.address);
      let retirement2 = await retireContract.beneficiaryRetirements(otherAccount.address);
      expect(retirement2).to.equal(carbonToRetire2);

      totalCarbonRetired = await retireContract.totalCarbonRetired();
      expect(totalCarbonRetired).to.equal(carbonToRetire1.add(carbonToRetire2));
    });
  });
  describe("Test estimate function", function () {
    it("Should record the address, pooled amount and retire the tokens", async function () {
      const { retireContract, deployer, otherAccount } = await loadFixture(deployRetireContract);
      const NCT = new ethers.Contract(NCTAddress, ERC20ABI, ethers.provider);

      const carbonToRetire = ethers.utils.parseEther("0.001");
      const donationPercentage = 0;
      const carbonToDonate = ethers.utils.parseEther("0");

      // store state before transactions:
      const DonationBalanceBefore = await NCT.balanceOf(donationAddress);

      // Test 0 amount to retire:
      let maticEstimated = await retireContract.calculateNeededAmount(WMATICAddress, "0", 0, false);
      expect(maticEstimated).to.equal(0);

      // Retire
      maticEstimated = await retireContract.calculateNeededAmount(WMATICAddress, carbonToRetire, 0, false);
      await expect(retireContract.retireWithMatic(carbonToRetire, donationPercentage, { value: maticEstimated })).not.to.be.reverted;

      maticEstimated = await retireContract.calculateNeededAmount(WMATICAddress, carbonToRetire, 0, false);
      let reducedMaticAmount = maticEstimated.sub(ethers.utils.parseEther("0.0000000001"));

      await expect(retireContract.retireWithMatic(carbonToRetire, donationPercentage, { value: reducedMaticAmount })).to.be.revertedWith("Not enough Matic to swap to required carbon Token");

      DonationBalanceAfter = await NCT.balanceOf(donationAddress);
      DonationBalanceChange = DonationBalanceAfter.sub(DonationBalanceBefore);
      expect(DonationBalanceChange).to.equal(carbonToDonate);

    });
  });
  describe("Test retire with USDC", function () {
    it("Should record the address & amount and retire the tokens", async function () {
      const { retireContract, deployer } = await loadFixture(deployRetireContract);
      const NCT = new ethers.Contract(NCTAddress, ERC20ABI, ethers.provider);
      const USDC = new ethers.Contract(USDCAddress, ERC20ABI, ethers.provider);

      const fundingAmount = ethers.utils.parseEther("50");
      await fundWalletWithTokens(deployer.address, fundingAmount);
      const carbonToRetire = ethers.utils.parseEther("0.1");
      const donationPercentage = 0;
      const carbonToDonate = ethers.utils.parseEther("0");

      // normal retirement
      const DonationBalanceBefore = await NCT.balanceOf(donationAddress);
      let USDCEstimated = await retireContract.calculateNeededAmount(USDCAddress, carbonToRetire, 0, false);
      // console.log("USDC: ", USDCEstimated);
      await USDC.connect(deployer).approve(retireContract.address, USDCEstimated);
      await expect(retireContract.retireWithToken(USDCAddress, carbonToRetire, donationPercentage))
        .to.emit(retireContract, "CarbonRetired")
        .withArgs("Token", carbonToRetire);

      DonationBalanceAfter = await NCT.balanceOf(donationAddress);
      DonationBalanceChange = DonationBalanceAfter.sub(DonationBalanceBefore);

      // Check accounting
      let recordedAddress = await retireContract.retirementBeneficiaryAddresses(0);
      expect(recordedAddress).to.equal(deployer.address);
      let carbonAmountRetired = await retireContract.beneficiaryRetirements(deployer.address);
      expect(carbonAmountRetired).to.equal(carbonToRetire);

      // Check balances sent to donation address
      expect(DonationBalanceChange).to.equal(carbonToDonate);

      // Approve less than estimated and see that it fails
      USDCEstimated = await retireContract.calculateNeededAmount(USDCAddress, carbonToRetire, 0, false);
      await USDC.connect(deployer).approve(retireContract.address, USDCEstimated.sub(1));
      await expect(retireContract.retireWithToken(USDCAddress, carbonToRetire, donationPercentage)).to.be.reverted;
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
      const donationPercentage = 0;
      const carbonToDonate = ethers.utils.parseEther("0");

      // normal retirement
      const DonationBalanceBefore = await NCT.balanceOf(donationAddress);
      let WMATICEstimated = await retireContract.calculateNeededAmount(WMATICAddress, carbonToRetire, 0, false);
      // console.log("WMATIC: ", WMATICEstimated);
      await WMATIC.connect(deployer).approve(retireContract.address, WMATICEstimated);
      await expect(retireContract.retireWithToken(WMATICAddress, carbonToRetire, donationPercentage))
        .to.emit(retireContract, "CarbonRetired")
        .withArgs("Token", carbonToRetire);

      DonationBalanceAfter = await NCT.balanceOf(donationAddress);
      DonationBalanceChange = DonationBalanceAfter.sub(DonationBalanceBefore);

      // Check accounting
      let recordedAddress = await retireContract.retirementBeneficiaryAddresses(0);
      expect(recordedAddress).to.equal(deployer.address);
      let carbonAmountRetired = await retireContract.beneficiaryRetirements(deployer.address);
      expect(carbonAmountRetired).to.equal(carbonToRetire);

      // Check balances sent to pooling address
      expect(DonationBalanceChange).to.equal(carbonToDonate);

      // Approve less than estimated and see that it fails
      WMATICEstimated = await retireContract.calculateNeededAmount(WMATICAddress, carbonToRetire, 0, false);
      await WMATIC.connect(deployer).approve(retireContract.address, WMATICEstimated.sub(1));
      await expect(retireContract.retireWithToken(WMATICAddress, carbonToRetire, donationPercentage)).to.be.reverted;
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
      const donationPercentage = 0;
      const carbonToDonate = ethers.utils.parseEther("0");

      // normal contribution
      const DonationBalanceBefore = await NCT.balanceOf(donationAddress);
      let DAIEstimated = await retireContract.calculateNeededAmount(DAIAddress, carbonToRetire, 0, false);
      // console.log("DAI: ", DAIEstimated);
      await DAI.connect(deployer).approve(retireContract.address, DAIEstimated);
      await expect(retireContract.retireWithToken(DAIAddress, carbonToRetire, donationPercentage))
        .to.emit(retireContract, "CarbonRetired")
        .withArgs("Token", carbonToRetire);

      DonationBalanceAfter = await NCT.balanceOf(donationAddress);
      DonationBalanceChange = DonationBalanceAfter.sub(DonationBalanceBefore);

      // Check accounting
      let recordedAddress = await retireContract.retirementBeneficiaryAddresses(0);
      expect(recordedAddress).to.equal(deployer.address);
      let carbonAmountRetired = await retireContract.beneficiaryRetirements(deployer.address);
      expect(carbonAmountRetired).to.equal(carbonToRetire);

      // Check balances sent to pooling address
      expect(DonationBalanceChange).to.equal(carbonToDonate);

      // Approve less than estimated and see that it fails
      DAIEstimated = await retireContract.calculateNeededAmount(DAIAddress, carbonToRetire, 0, false);
      await DAI.connect(deployer).approve(retireContract.address, DAIEstimated.sub(1));
      await expect(retireContract.retireWithToken(DAIAddress, carbonToRetire, donationPercentage)).to.be.reverted;
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
      const donationPercentage = 0;
      const carbonToDonate = ethers.utils.parseEther("0");

      // normal contribution
      const DonationBalanceBefore = await NCT.balanceOf(donationAddress);
      let WETHEstimated = await retireContract.calculateNeededAmount(WETHAddress, carbonToRetire, 0, false);
      // console.log("WETH: ", WETHEstimated);
      await WETH.connect(deployer).approve(retireContract.address, WETHEstimated);
      await expect(retireContract.retireWithToken(WETHAddress, carbonToRetire, donationPercentage))
        .to.emit(retireContract, "CarbonRetired")
        .withArgs("Token", carbonToRetire);

      DonationBalanceAfter = await NCT.balanceOf(donationAddress);
      DonationBalanceChange = DonationBalanceAfter.sub(DonationBalanceBefore);

      // Check accounting
      let recordedAddress = await retireContract.retirementBeneficiaryAddresses(0);
      expect(recordedAddress).to.equal(deployer.address);
      let carbonAmountRetired = await retireContract.beneficiaryRetirements(deployer.address);
      expect(carbonAmountRetired).to.equal(carbonToRetire);

      // Check balances sent to pooling address
      expect(DonationBalanceChange).to.equal(carbonToDonate);

      // Approve less than estimated and see that it fails
      WETHEstimated = await retireContract.calculateNeededAmount(WETHAddress, carbonToRetire, 0, false);
      await WETH.connect(deployer).approve(retireContract.address, WETHEstimated.sub(1));
      await expect(retireContract.retireWithToken(WETHAddress, carbonToRetire, donationPercentage)).to.be.reverted;
    });
  });
  describe("Test retire with NCT", function () {
    it("Should record the address, pooled amount and forward the tokens", async function () {
      const { retireContract, deployer, otherAccount } = await loadFixture(deployRetireContract);
      const NCT = new ethers.Contract(NCTAddress, ERC20ABI, ethers.provider);

      const carbonToRetire = ethers.utils.parseEther("0.1");
      const fundingAmount = ethers.utils.parseEther("50");
      await fundWalletWithTokens(deployer.address, fundingAmount);
      const donationPercentage = 0;
      const carbonToDonate = ethers.utils.parseEther("0");

      // normal contribution
      const DonationBalanceBefore = await NCT.balanceOf(donationAddress);
      let NCTEstimated = await retireContract.calculateNeededAmount(NCTAddress, carbonToRetire, 0, false);
      // console.log("NCT: ", NCTEstimated);
      await NCT.connect(deployer).approve(retireContract.address, NCTEstimated);
      await expect(retireContract.retireWithToken(NCTAddress, carbonToRetire, donationPercentage))
        .to.emit(retireContract, "CarbonRetired")
        .withArgs("Token", carbonToRetire);

      DonationBalanceAfter = await NCT.balanceOf(donationAddress);
      DonationBalanceChange = DonationBalanceAfter.sub(DonationBalanceBefore);

      // Check accounting
      let recordedAddress = await retireContract.retirementBeneficiaryAddresses(0);
      expect(recordedAddress).to.equal(deployer.address);
      let carbonAmountRetired = await retireContract.beneficiaryRetirements(deployer.address);
      expect(carbonAmountRetired).to.equal(carbonToRetire);

      // Check balances sent to pooling address
      expect(DonationBalanceChange).to.equal(carbonToDonate);

      // Approve less than estimated and see that it fails
      NCTEstimated = await retireContract.calculateNeededAmount(NCTAddress, carbonToRetire, 0, false);
      // console.log("NCT: ", NCTEstimated);

      await NCT.connect(deployer).approve(retireContract.address, NCTEstimated.sub(1));
      await expect(retireContract.retireWithToken(NCTAddress, carbonToRetire, donationPercentage)).to.be.reverted;
    });
  });
  describe("Test retire using MATIC with donation", function () {
    it("Should record the address, retired amount, retire the tokens", async function () {
      const { retireContract, deployer, otherAccount } = await loadFixture(deployRetireContract);
      const NCT = new ethers.Contract(NCTAddress, ERC20ABI, ethers.provider);

      const maticToSend1 = ethers.utils.parseEther("0.0123");
      const carbonToRetire1 = ethers.utils.parseEther("0.001");
      const donationPercentage = 3;
      const carbonToDonate = (carbonToRetire1.mul(donationPercentage)).div(100);

      // Retire from first address
      const DonationBalanceBefore = await NCT.balanceOf(donationAddress);

      await expect(retireContract.retireWithMatic(carbonToRetire1, donationPercentage, { value: maticToSend1 }))
        .to.emit(retireContract, "CarbonRetired")
        .withArgs("Matic", carbonToRetire1);

      DonationBalanceAfter = await NCT.balanceOf(donationAddress);
      DonationBalanceChange = DonationBalanceAfter.sub(DonationBalanceBefore);
      expect(DonationBalanceChange).to.equal(carbonToDonate);
    });
  });
  describe("Test retire with specific TCO2 using MATIC with donation", function () {
    it("Should record the address, retired amount, retire the tokens", async function () {
      const { retireContract, deployer, otherAccount } = await loadFixture(deployRetireContract);
      const NCT = new ethers.Contract(NCTAddress, NCTABI, ethers.provider);

      const carbonToRetire = ethers.utils.parseEther("10.001");
      // Address of TCO2 to retire
      // https://registry.verra.org/app/projectDetail/VCS/985
      // https://polygonscan.com/address/0xb00110cc12cdc8f666f33f4e52e4957ff594282f
      const tco2Address = "0xB00110CC12cDC8F666f33F4e52e4957Ff594282f";
      // const tco2Address = "0xa96c8e571b23A6cFc8ca6955c5D3ff03a13fA699";
      const tco2Contract = new ethers.Contract(tco2Address, ERC20ABI, ethers.provider);

      // Check there's enough liquidity to ensure the test is valid.
      const poolBalance = await tco2Contract.balanceOf(NCT.address);
      expect(poolBalance).greaterThanOrEqual(carbonToRetire);

      // const maticToSend = ethers.utils.parseEther("50.0123");

      const feeRedeemPercentageInBase = await NCT.feeRedeemPercentageInBase();
      const feeRedeemDivider = await NCT.feeRedeemDivider();
      console.log("feeRedeemPercentageInBase: ", feeRedeemPercentageInBase);
      console.log("feeredeemdivider: ", feeRedeemDivider);
      const carbonToRetireWithFees = carbonToRetire.mul(feeRedeemDivider).div(feeRedeemDivider.sub(feeRedeemPercentageInBase));
      const redemptionFees = carbonToRetireWithFees.sub(carbonToRetire);

      const donationPercentage = 3;
      const carbonToDonate = (carbonToRetire.mul(donationPercentage)).div(100);
      maticEstimated = await retireContract.calculateNeededAmount(WMATICAddress, carbonToRetire, donationPercentage, true);
      NCTEstimated = await retireContract.calculateNeededAmount(NCTAddress, carbonToRetire, donationPercentage, true);

      const tco2SupplyBefore = await tco2Contract.totalSupply()
      const DonationBalanceBefore = await NCT.balanceOf(donationAddress);

      // console.log("carbonToRetire: ",carbonToRetire, "redemptionFees: ", redemptionFees, "donationPercentage: ", donationPercentage, "maticEstimated: ", maticEstimated, "NCTEstimated: ", NCTEstimated)

      await expect(retireContract.retireSpecificTco2WithMatic(tco2Address, carbonToRetire, redemptionFees, donationPercentage, { value: maticEstimated }))
        .to.emit(retireContract, "CarbonRetired")
        .withArgs("Matic", carbonToRetire);

      const tco2SupplyAfter = await tco2Contract.totalSupply()
      tco2SupplyChange = tco2SupplyBefore.sub(tco2SupplyAfter);
      expect(tco2SupplyChange).to.equal(carbonToRetire);

      DonationBalanceAfter = await NCT.balanceOf(donationAddress);
      DonationBalanceChange = DonationBalanceAfter.sub(DonationBalanceBefore);
      expect(DonationBalanceChange).to.equal(carbonToDonate);
    });
  });
  describe("Test retire with USDC with donation", function () {
    it("Should record the address & amount and retire the tokens", async function () {
      const { retireContract, deployer } = await loadFixture(deployRetireContract);
      const NCT = new ethers.Contract(NCTAddress, ERC20ABI, ethers.provider);
      const USDC = new ethers.Contract(USDCAddress, ERC20ABI, ethers.provider);

      const fundingAmount = ethers.utils.parseEther("50");
      await fundWalletWithTokens(deployer.address, fundingAmount);
      const carbonToRetire = ethers.utils.parseEther("0.1");
      const donationPercentage = 4;
      const carbonToDonate = (carbonToRetire.mul(donationPercentage)).div(100);


      // normal retirement
      const DonationBalanceBefore = await NCT.balanceOf(donationAddress);
      let USDCEstimated = await retireContract.calculateNeededAmount(USDCAddress, carbonToRetire.add(carbonToDonate), 0, false);
      // console.log("USDC: ", USDCEstimated);
      await USDC.connect(deployer).approve(retireContract.address, USDCEstimated);
      await expect(retireContract.retireWithToken(USDCAddress, carbonToRetire, donationPercentage))
        .to.emit(retireContract, "CarbonRetired")
        .withArgs("Token", carbonToRetire);

      DonationBalanceAfter = await NCT.balanceOf(donationAddress);
      DonationBalanceChange = DonationBalanceAfter.sub(DonationBalanceBefore);

      // Check accounting
      let recordedAddress = await retireContract.retirementBeneficiaryAddresses(0);
      expect(recordedAddress).to.equal(deployer.address);
      let carbonAmountRetired = await retireContract.beneficiaryRetirements(deployer.address);
      expect(carbonAmountRetired).to.equal(carbonToRetire);

      // Check balances sent to donation address
      expect(DonationBalanceChange).to.equal(carbonToDonate);
    });
  });
  describe("Test retireAndMintCertificate with MATIC, zero donation", function () {
    it("Should record the address, retired amount, retire the tokens and mint the certificate", async function () {
      const { retireContract, deployer, otherAccount } = await loadFixture(deployRetireContract);
      const NCT = new ethers.Contract(NCTAddress, ERC20ABI, ethers.provider);

      const maticToSend1 = ethers.utils.parseEther("0.0123");
      const maticToSend2 = ethers.utils.parseEther("0.0234");
      const carbonToRetire1 = ethers.utils.parseEther("0.001");
      const carbonToRetire2 = ethers.utils.parseEther("0.002");
      const donationPercentage = 0; // TODO
      const carbonToDonate = ethers.utils.parseEther("0");
      const beneficiaryAddress1 = deployer.address;
      const beneficiaryString1 = "Deployer"
      const beneficiaryAddress2 = otherAccount.address;
      const beneficiaryString2 = "otherAccount"
      const retirementMessage = "Testing specification of beneficiary address, beneficiary string and retirement message."

      const DonationBalanceBefore = await NCT.balanceOf(donationAddress);

      // Retire from first address
      let txResponse = await retireContract.retireAndMintCertificateWithMatic(carbonToRetire1, donationPercentage, beneficiaryAddress1, beneficiaryString1, retirementMessage, { value: maticToSend1 });
      let recordedAddress = await retireContract.retirementBeneficiaryAddresses(0);
      expect(recordedAddress).to.equal(deployer.address);
      let retirement1 = await retireContract.beneficiaryRetirements(deployer.address);
      expect(retirement1).to.equal(carbonToRetire1);
      let totalCarbonRetired = await retireContract.totalCarbonRetired();
      expect(totalCarbonRetired).to.equal(retirement1);

      let txReceipt = await txResponse.wait();
      await testRetirementCertificatesOwnership(txReceipt, beneficiaryAddress1);
      await testCarbonRetirementEvent(txReceipt, carbonToRetire1, "Matic");

      DonationBalanceAfter = await NCT.balanceOf(donationAddress);
      DonationBalanceChange = DonationBalanceAfter.sub(DonationBalanceBefore);
      expect(DonationBalanceChange).to.equal(carbonToDonate);

      // Retire from second address
      txResponse = await retireContract.connect(otherAccount).retireAndMintCertificateWithMatic(carbonToRetire2, donationPercentage, beneficiaryAddress2, beneficiaryString2, retirementMessage, { value: maticToSend2 });
      expect(await retireContract.retirementBeneficiaryAddresses(1)).to.equal(otherAccount.address);
      let retirement2 = await retireContract.beneficiaryRetirements(otherAccount.address);
      expect(retirement2).to.equal(carbonToRetire2);

      txReceipt = await txResponse.wait();
      await testRetirementCertificatesOwnership(txReceipt, beneficiaryAddress2);
      await testCarbonRetirementEvent(txReceipt, carbonToRetire2, "Matic");

      totalCarbonRetired = await retireContract.totalCarbonRetired();
      expect(totalCarbonRetired).to.equal(carbonToRetire1.add(carbonToRetire2));

    });
  });
  describe("Test retireAndMintCertificate with Token (WMATIC), zero donation", function () {
    it("Should record the address, retired amount, retire the tokens and mint the certificate", async function () {
      const { retireContract, deployer, otherAccount } = await loadFixture(deployRetireContract);
      const NCT = new ethers.Contract(NCTAddress, ERC20ABI, ethers.provider);
      const WMATIC = new ethers.Contract(WMATICAddress, ERC20ABI, ethers.provider);

      const fundingAmount = ethers.utils.parseEther("50");
      await fundWalletWithTokens(deployer.address, fundingAmount);
      await fundWalletWithTokens(otherAccount.address, fundingAmount);

      const carbonToRetire1 = ethers.utils.parseEther("0.1");
      const carbonToRetire2 = ethers.utils.parseEther("0.2");
      const donationPercentage = 0; // TODO
      const carbonToDonate = ethers.utils.parseEther("0");
      const beneficiaryAddress1 = deployer.address;
      const beneficiaryString1 = "Deployer"
      const beneficiaryAddress2 = otherAccount.address;
      const beneficiaryString2 = "otherAccount"
      const retirementMessage = "Testing specification of beneficiary address, beneficiary string and retirement message."

      const DonationBalanceBefore = await NCT.balanceOf(donationAddress);

      // Retire from first address
      let WMATICEstimated = await retireContract.calculateNeededAmount(WMATICAddress, carbonToRetire1, 0, false);
      await WMATIC.connect(deployer).approve(retireContract.address, WMATICEstimated);

      let txResponse = await retireContract.connect(deployer).retireAndMintCertificateWithToken(WMATICAddress, carbonToRetire1, donationPercentage, beneficiaryAddress1, beneficiaryString1, retirementMessage);
      let recordedAddress = await retireContract.retirementBeneficiaryAddresses(0);
      expect(recordedAddress).to.equal(deployer.address);
      let retirement1 = await retireContract.beneficiaryRetirements(deployer.address);
      expect(retirement1).to.equal(carbonToRetire1);
      let totalCarbonRetired = await retireContract.totalCarbonRetired();
      expect(totalCarbonRetired).to.equal(retirement1);

      let txReceipt = await txResponse.wait();
      await testRetirementCertificatesOwnership(txReceipt, beneficiaryAddress1);
      await testCarbonRetirementEvent(txReceipt, carbonToRetire1, "Token");

      DonationBalanceAfter = await NCT.balanceOf(donationAddress);
      DonationBalanceChange = DonationBalanceAfter.sub(DonationBalanceBefore);
      expect(DonationBalanceChange).to.equal(carbonToDonate);

      // Retire from second address
      WMATICEstimated = await retireContract.calculateNeededAmount(WMATICAddress, carbonToRetire2, 0, false);
      await WMATIC.connect(otherAccount).approve(retireContract.address, WMATICEstimated);

      txResponse = await retireContract.connect(otherAccount).retireAndMintCertificateWithToken(WMATICAddress, carbonToRetire2, donationPercentage, beneficiaryAddress2, beneficiaryString2, retirementMessage);
      expect(await retireContract.retirementBeneficiaryAddresses(1)).to.equal(otherAccount.address);
      let retirement2 = await retireContract.beneficiaryRetirements(otherAccount.address);
      expect(retirement2).to.equal(carbonToRetire2);

      txReceipt = await txResponse.wait();
      await testRetirementCertificatesOwnership(txReceipt, beneficiaryAddress2);
      await testCarbonRetirementEvent(txReceipt, carbonToRetire2, "Token");

      totalCarbonRetired = await retireContract.totalCarbonRetired();
      expect(totalCarbonRetired).to.equal(carbonToRetire1.add(carbonToRetire2));

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

async function testCarbonRetirementEvent(txReceipt, carbonAmountRetired, tokenOrCoin) {
  const CarbonRetiredEvents = txReceipt.events.filter(function (event) { return event.event == "CarbonRetired" });
  if (CarbonRetiredEvents.length !== 1) {
    throw `Only expected one CarbonRetired event, but ${CarbonRetiredEvents.length} events were emitted.`;
  }
  expect(carbonAmountRetired).to.equal(CarbonRetiredEvents[0].args.carbonAmountRetired);
  expect(tokenOrCoin).to.equal(CarbonRetiredEvents[0].args.tokenOrCoin);
}

async function testRetirementCertificatesOwnership(txReceipt, beneficiaryAddress) {
  const retirementCertificates = new ethers.Contract(retirementCertificatesAddress, RetirementCertificatesABI, ethers.provider);
  const retirementCertificatesContract = retirementCertificates.connect(beneficiaryAddress);
  const certificateBalance = await retirementCertificatesContract.balanceOf(beneficiaryAddress);

  if (certificateBalance == 0) {
    throw "The beneficiary does not own any ERC721s from the RetirementCertificate contract.";
  }

  const ERC721ReceivedEvents = txReceipt.events.filter(function (event) { return event.event == "ERC721Received" });
  for (const event of ERC721ReceivedEvents) {
    const tokenId = event.args.tokenId;
    const owner = await retirementCertificatesContract.ownerOf(tokenId);
    expect(owner).to.equal(beneficiaryAddress)
  }
}

