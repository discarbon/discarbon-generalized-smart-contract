// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "contracts/interfaces/IToucanPoolToken.sol";
import "contracts/interfaces/IToucanCarbonOffsets.sol";
import "contracts/interfaces/IRetirementCertificates.sol";
import "contracts/interfaces/Interfaces.sol";

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

    address private sushiRouterAddress = 0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506;
    address private NCTAddress = 0xD838290e877E0188a4A44700463419ED96c16107;
    address private WMATICAddress = 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270;
    address private USDCAddress = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;
    address private ToucanRetirementCertificateAddress = 0x5e377f16E4ec6001652befD737341a28889Af002;

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

    /// @notice Receives Matic, swaps to carbon token, retires the swapped tokens via autoRedeem2.
    ///         Forwards donations in carbon tokens. Returns any excess Matic.
    /// @param carbonAmountToRetire The number of carbon tokens to be retired.
    /// @param donationPercentage Donation as a percentage 1 = 1% added for donation.
    /// @param tco2Address The TCO2 address to redeem and retire credits from. If address(0) is supplied it will redeem the default TCO2 in the pool.
    /// @return tco2Addresses An array of the TCO2 addresses that were retired.
    /// @return tco2Amounts An array of the amounts of each TCO2 that was retired.
    function retireWithMatic(
        uint256 carbonAmountToRetire,
        uint256 donationPercentage,
        address tco2Address
    ) public payable returns (address[] memory tco2Addresses, uint256[] memory tco2Amounts) {
        uint256 carbonAmountToSwap = addDonation(carbonAmountToRetire, donationPercentage);
        if (tco2Address != address(0)) {
            carbonAmountToSwap += redemptionFee(carbonAmountToRetire);
        }
        swapMaticToCarbonToken(carbonAmountToSwap);
        doAccounting(carbonAmountToRetire, tx.origin);
        (tco2Addresses, tco2Amounts) = redeemAndRetire(carbonAmountToRetire, tco2Address);
        forwardDonation();
        returnExcessMatic();
        emit CarbonRetired("Matic", carbonAmountToRetire);
    }

    /// @notice Receives Matic, swaps to carbon token, retires the swapped tokens via autoRedeem2
    ///         and mints the retirement certificate. Forwards donations in carbon tokens.
    ///         Returns any excess Matic.
    /// @param carbonAmountToRetire The number of carbon tokens to be retired.
    /// @param donationPercentage Donation as a percentage 1 = 1% added for donation.
    /// @param beneficiaryAddress The retirement beneficiary to specify in the retirement certificate.
    /// @param beneficiaryString The retirement beneficiary name to specify in the retirement certificate.
    /// @param retirementMessage The retirement message to specify in the retirement certificate.
    /// @return tco2Addresses An array of the TCO2 addresses that were retired.
    /// @return tco2Amounts An array of the amounts of each TCO2 that was retired.
    /// @return tco2CertificateTokenIds An array of the corresponding retirement certificate ids.
    function retireAndMintCertificateWithMatic(
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
        uint256 carbonAmountWithDonation = addDonation(carbonAmountToRetire, donationPercentage);
        swapMaticToCarbonToken(carbonAmountWithDonation);
        doAccounting(carbonAmountToRetire, beneficiaryAddress);
        (tco2Addresses, tco2Amounts, tco2CertificateTokenIds) = retireAndMintCertificate(
            carbonAmountToRetire,
            beneficiaryAddress,
            beneficiaryString,
            retirementMessage
        );
        forwardDonation();
        returnExcessMatic();
        emit CarbonRetired("Matic", carbonAmountToRetire);
    }

    /// @notice Takes a user approved token, swaps to carbon token, retires the swapped tokens
    ///         via autoRedeem2. Forwards donations in carbon tokens. Only takes as many tokens as
    ///         needed.
    /// @param fromToken Address of the erc20 token sent to buy carbon tokens with.
    /// @param carbonAmountToRetire The number of carbon tokens to be retired.
    /// @param donationPercentage Donation as a percentage 1 = 1% added for donation.
    /// @param tco2Address The TCO2 address to redeem and retire credits from. If address(0) is supplied it will redeem the default TCO2 in the pool.
    /// @return tco2Addresses An array of the TCO2 addresses that were retired.
    /// @return tco2Amounts An array of the amounts of each TCO2 that was retired.
    function retireWithToken(
        address fromToken,
        uint256 carbonAmountToRetire,
        uint256 donationPercentage,
        address tco2Address
    ) public returns (address[] memory tco2Addresses, uint256[] memory tco2Amounts) {
        uint256 carbonAmountToSwap = addDonation(carbonAmountToRetire, donationPercentage);
        if (tco2Address != address(0)) {
            carbonAmountToSwap += redemptionFee(carbonAmountToRetire);
        }

        if (fromToken == NCTAddress) {
            // Directly transfer NCT tokens.
            IERC20(fromToken).safeTransferFrom(msg.sender, address(this), carbonAmountToSwap);
        } else {
            // for all other tokens do a swap.
            swapTokenToCarbonToken(fromToken, carbonAmountToSwap);
        }

        doAccounting(carbonAmountToRetire, tx.origin);
        (tco2Addresses, tco2Amounts) = redeemAndRetire(carbonAmountToRetire, tco2Address);
        forwardDonation();
        emit CarbonRetired("Token", carbonAmountToRetire);
    }

    /// @notice Takes a user approved token, swaps to carbon token, retires the swapped tokens
    ///         via autoRedeem2 and mints the certificate. Forwards donations in carbon tokens.
    ///         Only takes as many tokens as needed.
    /// @param fromToken Address of the erc20 token sent to buy carbon tokens with.
    /// @param carbonAmountToRetire The number of carbon tokens to be retired.
    /// @param donationPercentage Donation as a percentage 1 = 1% added for donation.
    /// @param beneficiaryAddress The retirement beneficiary to specify in the retirement certificate.
    /// @param beneficiaryString The retirement beneficiary name to specify in the retirement certificate.
    /// @param retirementMessage The retirement message to specify in the retirement certificate.
    /// @return tco2Addresses An array of the TCO2 addresses that were retired.
    /// @return tco2Amounts An array of the amounts of each TCO2 that was retired.
    /// @return tco2CertificateTokenIds An array of the corresponding retirement certificate ids.
    function retireAndMintCertificateWithToken(
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
        uint256 carbonAmountWithDonation = addDonation(carbonAmountToRetire, donationPercentage);

        if (fromToken == NCTAddress) {
            // Directly transfer NCT tokens.
            IERC20(fromToken).safeTransferFrom(msg.sender, address(this), carbonAmountWithDonation);
        } else {
            // for all other tokens do a swap.
            swapTokenToCarbonToken(fromToken, carbonAmountWithDonation);
        }

        doAccounting(carbonAmountToRetire, beneficiaryAddress);
        (tco2Addresses, tco2Amounts, tco2CertificateTokenIds) = retireAndMintCertificate(
            carbonAmountToRetire,
            beneficiaryAddress,
            beneficiaryString,
            retirementMessage
        );
        forwardDonation();
        emit CarbonRetired("Token", carbonAmountToRetire);
    }

    ///@notice Calculates the needed amount of coins/tokens.
    ///         the swapped tokens.
    /// @param fromToken Address of the token that is used to swap from.
    ///        To estimate Matic tokens, use WMATIC address.
    /// @param carbonAmountToRetire Carbon Amount that needs to be purchased.
    /// @param fees a boolean to include fees for specific project redemption in cost estimation
    /// @param donationPercentage The given donation percentage 1 = 1%.
    /// @return tokenAmountNeeded How many tokens/coins needed for buying the needed
    ///         carbon tokens.
    function calculateNeededAmount(
        address fromToken,
        uint256 carbonAmountToRetire,
        uint256 donationPercentage,
        bool fees
    ) public view returns (uint256) {
        // Handle 0 amount
        if (carbonAmountToRetire == 0) {
            return carbonAmountToRetire;
        }

        uint256 carbonAmountToSwap = carbonAmountToRetire;

        if (donationPercentage != 0) {
            carbonAmountToSwap = addDonation(carbonAmountToRetire, donationPercentage);
        }

        if (fees) {
            carbonAmountToSwap += redemptionFee(carbonAmountToRetire);
        }

        // if NCT is supplied no swap necessary
        if (fromToken == NCTAddress) {
            return carbonAmountToSwap;
        }

        address[] memory path = makePath(fromToken);

        IUniswapV2Router02 sushiRouter = IUniswapV2Router02(sushiRouterAddress);

        uint256[] memory tokenAmountNeeded = sushiRouter.getAmountsIn(carbonAmountToSwap, path);

        return tokenAmountNeeded[0];
    }

    /// @notice Calculates the amount of carbon tokens that need to be swapped
    ///         including donations.
    /// @param carbonAmountToRetire Carbon amount that needs to be retired.
    /// @param donationPercentage The given donation percentage which needs
    ///         to be added.
    /// @return carbonAmountWithDonation How many carbon tokens need to be
    ///         received from swap to have enough for the donation.
    function addDonation(uint256 carbonAmountToRetire, uint256 donationPercentage)
        public
        pure
        returns (uint256)
    {
        uint256 carbonAmountWithDonation = (carbonAmountToRetire * (100 + donationPercentage)) /
            100;
        return carbonAmountWithDonation;
    }

    /// @notice Calculates the redemptionFees that needs to be added to exactly redeem carbonAmountToRetire.
    /// @param carbonAmountToRetire Carbon amount that needs to be retired.
    function redemptionFee(uint256 carbonAmountToRetire) public view returns (uint256) {
        uint256 feeRedeemDivider = NCTContract(NCTAddress).feeRedeemDivider(); // D in the formula below
        uint256 feeRedeemPercentageInBase = NCTContract(NCTAddress).feeRedeemPercentageInBase(); // B in the formula below

        // fee = Amount*B/(D-B)
        uint256 fee = (carbonAmountToRetire * feeRedeemPercentageInBase) /
            (feeRedeemDivider - feeRedeemPercentageInBase);

        return fee;
    }

    /// @notice A getter function for the array holding all addresses that have retired via this contract.
    /// @return retireeAddresses An array (can be empty) of all addresses that have retired.
    function getRetirementCallerAddresses() public view returns (address[] memory) {
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
    function makePath(address fromToken) private view returns (address[] memory) {
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

        uint256[] memory tokenToSwap = sushiRouter.getAmountsIn(carbonAmountToRetire, path);
        require(msg.value >= tokenToSwap[0], "Not enough Matic to swap to required carbon Token");

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
    function swapTokenToCarbonToken(address fromToken, uint256 carbonAmountToRetire) private {
        IUniswapV2Router02 routerSushi = IUniswapV2Router02(sushiRouterAddress);
        address[] memory path = makePath(fromToken);
        uint256[] memory tokensNeeded = routerSushi.getAmountsIn(carbonAmountToRetire, path);
        // transfer tokens to this contract
        IERC20(fromToken).safeTransferFrom(msg.sender, address(this), tokensNeeded[0]);
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
    function doAccounting(uint256 carbonAmountToRetire, address beneficiaryAddress) private {
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

    /// @notice Remove the entries equal to zero in amounts and the corresponding entries in addresses
    function removeEntriesWhereAmountsIsZero(address[] memory addresses, uint256[] memory amounts)
        private
        pure
        returns (address[] memory, uint256[] memory)
    {
        uint256 zeroCount;
        for (uint256 i; i < amounts.length; i++) {
            if (amounts[i] == 0) {
                zeroCount++;
            }
        }
        if (zeroCount == 0) {
            return (addresses, amounts);
        }

        address[] memory addressesNonZero = new address[](amounts.length - zeroCount);
        uint256[] memory amountsNonZero = new uint256[](amounts.length - zeroCount);
        uint256 pos;
        for (uint256 i; i < amounts.length; i++) {
            if (amounts[i] != 0) {
                addressesNonZero[pos] = addresses[i];
                amountsNonZero[pos] = amounts[i];
                pos++;
            }
        }
        return (addressesNonZero, amountsNonZero);
    }

    /// @notice Redeems the specified amount of NCT for lowest scored TCO2, retires it and mints the
    ///         retirement certificate.
    /// @param amount Amount of NCT to redeem and retire.
    /// @param beneficiaryAddress The retirement beneficiary to specify in the retirement certificate.
    /// @param beneficiaryString The retirement beneficiary name to specify in the retirement certificate.
    /// @param retirementMessage The retirement message to specify in the retirement certificate.
    /// @return tco2Addresses An array of the TCO2 addresses that were retired.
    /// @return tco2Amounts An array of the amounts of each TCO2 that was retired.
    /// @return tco2CertificateTokenIds An array of the corresponding retirement certificate ids.
    function retireAndMintCertificate(
        uint256 amount,
        address beneficiaryAddress,
        string memory beneficiaryString,
        string memory retirementMessage
    )
        private
        returns (
            address[] memory,
            uint256[] memory,
            uint256[] memory
        )
    {
        IToucanPoolToken NCTPoolToken = IToucanPoolToken(NCTAddress);
        (address[] memory tco2Addresses, uint256[] memory tco2Amounts) = NCTPoolToken.redeemAuto2(
            amount
        );

        IRetirementCertificates retirementCertificates = IRetirementCertificates(
            ToucanRetirementCertificateAddress
        );

        // Remove tco2s with zero amounts, cf https://github.com/ToucanProtocol/contracts/issues/5
        (tco2Addresses, tco2Amounts) = removeEntriesWhereAmountsIsZero(tco2Addresses, tco2Amounts);

        uint256[] memory tco2CertificateTokenIds = new uint256[](tco2Amounts.length);
        for (uint256 i; i < tco2Addresses.length; i++) {
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
            tco2CertificateTokenIds[i] = lastRetirementCertificateTokenId;
        }
        return (tco2Addresses, tco2Amounts, tco2CertificateTokenIds);
    }

    /// @notice Redeems the needed NCT, automatically adds fees if needed and retires it.
    /// @param carbonAmountToRetire Amount of NCT to to be retired.
    /// @param tco2Address Address for a specific TCO2 to redeem tokens from. If address(0) is supplied redeems the lowest scored TCO2 in the pool.
    /// @return tco2Addresses An array of the TCO2 addresses that were retired.
    /// @return tco2Amounts An array of the amounts of each TCO2 that was retired.
    function redeemAndRetire(uint256 carbonAmountToRetire, address tco2Address)
        private
        returns (address[] memory, uint256[] memory)
    {
        address[] memory tco2Addresses;
        uint256[] memory tco2Amounts;

        IToucanPoolToken NCTPoolToken = IToucanPoolToken(NCTAddress);

        if (tco2Address == address(0)) {
            // get the lowest scoring TCO2 from Pool
            (tco2Addresses, tco2Amounts) = NCTPoolToken.redeemAuto2(carbonAmountToRetire);

            // Remove tco2s with zero amounts, cf https://github.com/ToucanProtocol/contracts/issues/5
            (tco2Addresses, tco2Amounts) = removeEntriesWhereAmountsIsZero(
                tco2Addresses,
                tco2Amounts
            );

            for (uint256 i; i < tco2Addresses.length; i++) {
                IToucanCarbonOffsets(tco2Addresses[i]).retire(tco2Amounts[i]);
            }
        } else {
            // get the specified TCO2
            tco2Addresses = new address[](1);
            tco2Amounts = new uint256[](1);
            tco2Addresses[0] = tco2Address;
            tco2Amounts[0] = carbonAmountToRetire;

            require(
                tco2Amounts[0] <= IERC20(tco2Address).balanceOf(NCTAddress),
                "Insufficient tco2 available in pool"
            );

            // We will only receive carbon amount without the fee due to redemption fees.
            uint256[] memory carbonAmountsToRetireWithFee = new uint256[](1);
            carbonAmountsToRetireWithFee[0] =
                carbonAmountToRetire +
                redemptionFee(carbonAmountToRetire);
            NCTPoolToken.redeemMany(tco2Addresses, carbonAmountsToRetireWithFee);
            IToucanCarbonOffsets(tco2Address).retire(carbonAmountToRetire);
        }

        return (tco2Addresses, tco2Amounts);
    }

    /// @notice Forwards the donation to the disCarbon multisig.
    function forwardDonation() private {
        IERC20(NCTAddress).transfer(donationAddress, IERC20(NCTAddress).balanceOf(address(this)));
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
        // Hack/workaround: Save the id of received token so we can transfer it to the retirement
        // beneficiary
        lastRetirementCertificateTokenId = _tokenId;
        emit ERC721Received(msg.sender, _tokenId);
        return 0x150b7a02;
    }
}
