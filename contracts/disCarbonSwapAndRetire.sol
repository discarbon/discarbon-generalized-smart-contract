// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "contracts/interfaces/IToucanPoolToken.sol";
import "contracts/interfaces/IToucanCarbonOffsets.sol";
import "contracts/interfaces/IRetirementCertificates.sol";

/// @title disCarbon generalized swap and retire contract
/// @author haurog, danceratopz
/// @notice This contract exchanges the coins/tokens of the user for carbon
///         tokens (NCT) and redeems them for an underlying project token and
///         retires them. It also keeps track on the cumulative retirements of
///         each address.
contract disCarbonSwapAndRetire is IERC721Receiver {
    using SafeERC20 for IERC20;

    /// @notice An array of addresses which have retired carbon by calling this contract
    address[] public retirementCallerAddresses;
    /// @notice An array of addresses that have been specified as retirement beneficiaries
    address[] public retirementBeneficiaryAddresses;
    /// @notice The total amount of carbon retired by each address that has called this contract
    mapping(address => uint256) public callerRetirements;
    /// @notice The total amount of carbon retired by each beneficiary
    mapping(address => uint256) public beneficiaryRetirements;
    /// @notice The total amount of carbon retired via this contract
    uint256 public totalCarbonRetired = 0;
    /// @notice Address to where the donations are sent to
    address public donationAddress = 0xCFA521D5514dDf8334f3907dcFe99752D51580E9; // disCarbon Polygon Safe Multisig


    address private sushiRouterAddress =
        0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506;
    address private NCTAddress = 0xD838290e877E0188a4A44700463419ED96c16107;
    address private WMATICAddress = 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270;
    address private USDCAddress = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;
    address private ToucanRetirementCertificateAddress =
        0x5e377f16E4ec6001652befD737341a28889Af002;

    /// @notice The tokenID of the last ERC721 sent to this contract: A workaround in order to
    ///         send the retirement certificate to the retirement beneficiary address, see
    ///         onERC721Received
    uint256 lastRetirementCertificateTokenId = 0;

    ///@notice Emitted after carbon tokens have been retired.
    event CarbonRetired(string tokenOrCoin, uint256 carbonAmountRetired);

    /// @notice Emitted when an ERC721 is transferred to this retirement contract.
    /// @param sender The address that sent the ERC721.
    /// @param tokenId The ERC721 token ID sent.
    event ERC721Received(address indexed sender, uint256 tokenId);

    ///@dev Needed, otherwise uniswap router for matic fails
    receive() external payable {}

    ///@dev Needed, otherwise uniswap router for matic fails
    fallback() external payable {}

    /// @notice Receives Matic, swaps to carbon token and retires the swapped
    ///         tokens via autoRedeem. Forwards donations in carbon tokens.
    ///         Returns any excess Matic.
    /// @param carbonAmountToRetire The number of carbon tokens to be retired.
    /// @param donationPercentage Donation as a percentage 1 = 1% added for donation.
    /// @param beneficiaryAddress The retirement beneficiary to specify in the retirement certificate.
    /// @param beneficiaryString The retirement beneficiary name to specify in the retirement certificate.
    /// @param retirementMessage The retirement message to specify in the retirement certficiate.
    /// @return tco2Addresses An array of the TCO2 addresses that were retired.
    /// @return tco2Amounts An array of the amounts of each TCO2 that was retired.
    /// @return tco2CertificateTokenIds An array of the corresponding retirement certicate ids.
    function autoRetireWithMatic(
        uint256 carbonAmountToRetire,
        uint256 donationPercentage,
        address beneficiaryAddress,
        string memory beneficiaryString,
        string memory retirementMessage
    )
        public
        payable
        returns (
            address[] memory tco2Addresses,
            uint256[] memory tco2Amounts,
            uint256[] memory tco2CertificateTokenIds
        )
    {
        uint256 carbonAmountWithDonation = addDonation(
            carbonAmountToRetire,
            donationPercentage
        );
        swapMaticToCarbonToken(carbonAmountWithDonation);
        doAccounting(carbonAmountToRetire, beneficiaryAddress);
        (tco2Addresses, tco2Amounts, tco2CertificateTokenIds) = autoRetire(
            carbonAmountToRetire,
            beneficiaryAddress,
            beneficiaryString,
            retirementMessage
        );
        forwardDonation(carbonAmountToRetire);
        returnExcessMatic();
        emit CarbonRetired("Matic", carbonAmountToRetire);
    }

    /// @notice Receives Matic, swaps to carbon token and retires the swapped
    ///         tokens via autoRedeem. Returns any excess Matic.
    /// @param carbonAmountToRetire The number of carbon tokens to be retired.
    /// @param donationPercentage Donation as a percentage 1 = 1% added for donation.
    /// @return tco2Addresses An array of the TCO2 addresses that were retired.
    /// @return tco2Amounts An array of the amounts of each TCO2 that was retired.
    /// @return tco2CertificateTokenIds An array of the corresponding retirement certicate ids.
    function autoRetireWithMatic(
        uint256 carbonAmountToRetire,
        uint256 donationPercentage
    )
        public
        payable
        returns (
            address[] memory tco2Addresses,
            uint256[] memory tco2Amounts,
            uint256[] memory tco2CertificateTokenIds
        )
    {
        address beneficiaryAddress = msg.sender;
        string memory beneficiaryString = "";
        string
            memory retirementMessage = "Retired via disCarbon's retirement contracts";
        (
            tco2Addresses,
            tco2Amounts,
            tco2CertificateTokenIds
        ) = autoRetireWithMatic(
            carbonAmountToRetire,
            donationPercentage,
            beneficiaryAddress,
            beneficiaryString,
            retirementMessage
        );
    }

    /// @notice Takes a user approved token, swaps to carbon token and retires the
    ///         swapped tokens via autoRedeem. Only takes as many tokens as needed.
    /// @param fromToken Address of the erc20 token sent to buy carbon tokens with.
    /// @param carbonAmountToRetire The number of carbon tokens to be retired.
    /// @param donationPercentage Donation as a percentage 1 = 1% added for donation.
    /// @param beneficiaryAddress The retirement beneficiary to specify in the retirement certificate.
    /// @param beneficiaryString The retirement beneficiary name to specify in the retirement certificate.
    /// @param retirementMessage The retirement message to specify in the retirement certficiate.
    /// @return tco2Addresses An array of the TCO2 addresses that were retired.
    /// @return tco2Amounts An array of the amounts of each TCO2 that was retired.
    /// @return tco2CertificateTokenIds An array of the corresponding retirement certicate ids.
    function autoRetireWithToken(
        address fromToken,
        uint256 carbonAmountToRetire,
        uint256 donationPercentage,
        address beneficiaryAddress,
        string memory beneficiaryString,
        string memory retirementMessage
    )
        public
        returns (
            address[] memory tco2Addresses,
            uint256[] memory tco2Amounts,
            uint256[] memory tco2CertificateTokenIds
        )
    {
        uint256 carbonAmountWithDonation = addDonation(
            carbonAmountToRetire,
            donationPercentage
        );

        if (fromToken == NCTAddress) {
            // Directly transfer NCT tokens.
            IERC20(fromToken).safeTransferFrom(
                msg.sender,
                address(this),
                carbonAmountWithDonation
            );
        } else {
            // for all other tokens do a swap.
            swapTokenToCarbonToken(fromToken, carbonAmountWithDonation);
        }

        doAccounting(carbonAmountToRetire, beneficiaryAddress);
        (tco2Addresses, tco2Amounts, tco2CertificateTokenIds) = autoRetire(
            carbonAmountToRetire,
            beneficiaryAddress,
            beneficiaryString,
            retirementMessage
        );
        forwardDonation(carbonAmountToRetire);
        emit CarbonRetired("Token", carbonAmountToRetire);
    }

    /// @notice Takes a user approved token, swaps to carbon token and retires the
    ///         swapped tokens via autoRedeem. Only takes as many tokens as needed.
    /// @param fromToken Address of the erc20 token sent to buy carbon tokens with.
    /// @param carbonAmountToRetire The number of carbon tokens to be retired.
    /// @param donationPercentage Donation as a percentage 1 = 1% added for donation.
    /// @return tco2Addresses An array of the TCO2 addresses that were retired.
    /// @return tco2Amounts An array of the amounts of each TCO2 that was retired.
    /// @return tco2CertificateTokenIds An array of the corresponding retirement certicate ids.
    function autoRetireWithToken(
        address fromToken,
        uint256 carbonAmountToRetire,
        uint256 donationPercentage
    )
        public
        returns (
            address[] memory tco2Addresses,
            uint256[] memory tco2Amounts,
            uint256[] memory tco2CertificateTokenIds
        )
    {
        address beneficiaryAddress = msg.sender;
        string memory beneficiaryString = "";
        string
            memory retirementMessage = "Retired via disCarbon's retirement contracts";
        (
            tco2Addresses,
            tco2Amounts,
            tco2CertificateTokenIds
        ) = autoRetireWithToken(
            fromToken,
            carbonAmountToRetire,
            donationPercentage,
            beneficiaryAddress,
            beneficiaryString,
            retirementMessage
        );
    }

    ///@notice Calculates the needed amount of coins/tokens.
    ///         the swapped tokens.
    /// @param fromToken Address of the token that is used to swap from.
    ///        To estimate Matic tokens, use WMATIC address.
    /// @param carbonAmountToRetire Carbon Amount that needs to be purchased.
    /// @return tokenAmountNeeded How many tokens/coins needed for buying the needed
    ///         carbon tokens.
    function calculateNeededAmount(
        address fromToken,
        uint256 carbonAmountToRetire
    ) public view returns (uint256) {
        // if NCT is supplied no swap necessary
        if (fromToken == NCTAddress) {
            return carbonAmountToRetire;
        }

        address[] memory path = makePath(fromToken);

        IUniswapV2Router02 sushiRouter = IUniswapV2Router02(sushiRouterAddress);

        uint256[] memory tokenAmountNeeded = sushiRouter.getAmountsIn(
            carbonAmountToRetire,
            path
        );

        return tokenAmountNeeded[0];
    }

    /// @notice Calculates the amount of carbon tokens that need to be swapped
    ///         including donations.
    /// @param carbonAmountToRetire Carbon amount that needs to be retired.
    /// @param donatioPercentage The given donation percentage which needs
    ///         to be added.
    /// @return carbonAmountWithDonation How many carbon tokens need to be
    ///         received from swap to have enough for the donation.
    function addDonation(
        uint256 carbonAmountToRetire,
        uint256 donatioPercentage
    ) public pure returns (uint256) {
        uint256 carbonAmountWithDonation = (carbonAmountToRetire *
            (100 + donatioPercentage)) / 100;
        return carbonAmountWithDonation;
    }

    /// @notice A getter function for the array holding all addresses that have retired via this contract.
    /// @return retireeAddresses An array (can be empty) of all addresses that have retired.
    function getRetirementCallerAddresses()
       
        public
       
        view
       
        returns (address[] memory)
   
    {
        return retirementCallerAddresses;
    }

    /// @notice A function to get the number of addresses that have retired via this contract.
    /// @return uint256 The length of the retireeAddresses array.
    function getRetirementCallerCount() public view returns (uint256) {
        return retirementCallerAddresses.length;
    }

    /// @notice This function creates a path from the initial token to the final
    ///         token. It always routes the swaps through USDC (Token > USDC > NCT).
    ///         So make sure there is actually liquidity on sushiswap for your token
    ///         for this path.
    /// @param fromToken Address of the token that is used to swap from.
    ///        To estimate Matic tokens, use WMATIC address.
    /// @return path An array with the path for the sushiswap router to do the swap.
    function makePath(address fromToken)
        private
        view
        returns (address[] memory)
    {
        if (fromToken == USDCAddress) {
            address[] memory path = new address[](2);
            path[0] = USDCAddress;
            path[1] = NCTAddress;
            return path;
        } else {
            address[] memory path = new address[](3);
            path[0] = fromToken;
            path[1] = USDCAddress;
            path[2] = NCTAddress;
            return path;
        }
    }

    /// @notice Does the swap for Matic coins.
    function swapMaticToCarbonToken(uint256 carbonAmountToRetire) private {
        IUniswapV2Router02 sushiRouter = IUniswapV2Router02(sushiRouterAddress);
        address[] memory path = makePath(WMATICAddress);

        uint256[] memory tokenToSwap = sushiRouter.getAmountsIn(
            carbonAmountToRetire,
            path
        );
        require(
            msg.value >= tokenToSwap[0],
            "Not enough Matic to swap to required carbon Token"
        );

        sushiRouter.swapETHForExactTokens{value: msg.value}(
            carbonAmountToRetire,
            path,
            address(this),
            block.timestamp
        );
    }

    /// @notice Does the swap for all ERC-20 tokens.
    /// @param fromToken Address of the token that is used to swap from
    /// @param carbonAmountToRetire Amount of carbon tokens one needs.
    function swapTokenToCarbonToken(
        address fromToken,
        uint256 carbonAmountToRetire
    ) private {
        IUniswapV2Router02 routerSushi = IUniswapV2Router02(sushiRouterAddress);
        address[] memory path = makePath(fromToken);
        uint256[] memory tokensNeeded = routerSushi.getAmountsIn(
            carbonAmountToRetire,
            path
        );
        // transfer tokens to this contract
        IERC20(fromToken).safeTransferFrom(
            msg.sender,
            address(this),
            tokensNeeded[0]
        );
        // approve tokens for sushiRouter
        IERC20(fromToken).approve(sushiRouterAddress, tokensNeeded[0]);
        // swap
        routerSushi.swapTokensForExactTokens(
            carbonAmountToRetire,
            tokensNeeded[0],
            path,
            address(this),
            block.timestamp
        );
    }

    /// @notice Perform bookkeeping of how much each address (caller and beneficiary) has retired
    /// @param carbonAmountToRetire Amount of carbon tokens retired.
    /// @param beneficiaryAddress The retirement beneficiary's address as specified in the retirement certificate
    function doAccounting(
        uint256 carbonAmountToRetire,
        address beneficiaryAddress
    ) private {
        totalCarbonRetired += carbonAmountToRetire;
        if (callerRetirements[msg.sender] == 0) {
            retirementCallerAddresses.push(msg.sender);
        }
        callerRetirements[msg.sender] += carbonAmountToRetire;
        if (beneficiaryRetirements[beneficiaryAddress] == 0) {
            retirementBeneficiaryAddresses.push(beneficiaryAddress);
        }
        beneficiaryRetirements[beneficiaryAddress] += carbonAmountToRetire;
    }

    /// @notice Returns excess matic not used in the swap.
    function returnExcessMatic() private {
        (bool success, ) = msg.sender.call{value: address(this).balance}("");
        require(success, "refund failed");
    }

    /// @notice Redeems the specified amount of NCT for lowest scored TCO2, retires it and mints the
    ///         retirement certificate.
    /// @param amount Amount of NCT to redeem and retire.
    /// @param beneficiaryAddress The retirement beneficiary to specify in the retirement certificate.
    /// @param beneficiaryString The retirement beneficiary name to specify in the retirement certificate.
    /// @param retirementMessage The retirement message to specify in the retirement certficiate.
    /// @return tco2Addresses An array of the TCO2 addresses that were retired.
    /// @return tco2Amounts An array of the amounts of each TCO2 that was retired.
    /// @return tco2CertificateTokenIds An array of the corresponding retirement certicate ids.
    function autoRetire(
        uint256 amount,
        address beneficiaryAddress,
        string memory beneficiaryString,
        string memory retirementMessage
    )
        private
        returns (
            address[] memory tco2Addresses,
            uint256[] memory tco2Amounts,
            uint256[] memory tco2CertificateTokenIds
        )
    {
        IToucanPoolToken NCTPoolToken = IToucanPoolToken(NCTAddress);
        (tco2Addresses, tco2Amounts) = NCTPoolToken.redeemAuto2(amount);

        IRetirementCertificates retirementCertificates = IRetirementCertificates(
                ToucanRetirementCertificateAddress
            );

        uint256 tco2Counter;
        for (uint256 i; i < tco2Addresses.length; i++) {
            if (tco2Amounts[i] > 0) {
                IToucanCarbonOffsets(tco2Addresses[i]).retireAndMintCertificate(
                        "disCarbon Generalized Retirement Contract",
                        beneficiaryAddress,
                        beneficiaryString,
                        retirementMessage,
                        tco2Amounts[i]
                    );
                retirementCertificates.safeTransferFrom(
                    address(this),
                    beneficiaryAddress,
                    lastRetirementCertificateTokenId
                );
                tco2Counter++;
                tco2CertificateTokenIds = new uint256[](tco2Counter);
                tco2CertificateTokenIds[
                    tco2Counter - 1
                ] = lastRetirementCertificateTokenId;
            }
        }
    }

    /// @notice Forwards the donation to the disCarbon multisig.
    function forwardDonation(uint256 carbonAmountToDonate) private {
        IERC20(NCTAddress).transfer(donationAddress, carbonAmountToDonate);
    }

    /// @dev Required for use with safeTransferFrom() (from OpenZeppelin's ERC721 contract) used
    ///      by Toucan's RetirementCertificates in order to transfer the ERC721 retirement
    ///      certificates to this contract).
    function onERC721Received(
        address _operator,
        address _from,
        uint256 _tokenId,
        bytes calldata _data
    ) external override returns (bytes4) {
        _operator;
        _from;
        _tokenId;
        _data;
        // Hack/wordkaround: Save the id of received token so we can transfer it to the retirement
        // beneficiary
        lastRetirementCertificateTokenId = _tokenId;
        emit ERC721Received(msg.sender, _tokenId);
        return 0x150b7a02;
    }
}
