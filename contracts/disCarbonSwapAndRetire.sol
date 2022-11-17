// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title disCarbon generalized swap and retire contract
/// @author haurog, danceratopz
/// @notice This contract exchanges the coins/tokens of the user for carbon
///         tokens (NCT) and redeems them for an underlying project token and
///         retires them. It also keeps track on the cumulative retirements of
///         each address.

contract disCarbonSwapAndRetire {
    using SafeERC20 for IERC20;

    /// @notice Stores all contributions (summed up) for each address
    mapping(address => uint256) public contributions;
    /// @notice An array of addresses which have contributed
    address[] public contributorsAddresses;
    /// @notice Sum of all contributions
    uint256 public totalCarbonPooled = 0;
    /// @notice Address to where the donations are sent to
    address public donationAddress = 0xCFA521D5514dDf8334f3907dcFe99752D51580E9; // disCarbon Polygon Safe Multisig

    address private sushiRouterAddress =
        0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506;
    address private NCTAddress = 0xD838290e877E0188a4A44700463419ED96c16107;
    address private WMATICAddress = 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270;
    address private USDCAddress = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;

    ///@notice Emitted after carbon tokens have been sent to pooling address.
    event ContributionSent(string tokenOrCoin, uint256 carbonTokenContributed);

    ///@dev Needed, otherwise uniswap router for matic fails
    receive() external payable {}

    ///@dev Needed, otherwise uniswap router for matic fails
    fallback() external payable {}

    /// @notice Receives Matic, swaps to carbon token and retires the carbon
    ///         tokens. Forwards donations in carbon tokens. Returns any excess Matic.
    /// @param carbonAmountToRetire The number of carbon tokens that need to be retired.
    /// @param donationPercentage Donation as a percentage 1 = 1% added for donation.
    function retireWithMatic(uint256 carbonAmountToRetire, uint256 donationPercentage) public payable {
        uint256 carbonAmountWithDonation = addDonation(carbonAmountToRetire, donationPercentage);
        swapMaticToCarbonToken(carbonAmountWithDonation);
        doAccounting(carbonAmountToRetire);
        forwardDonation(carbonAmountToRetire);
        returnExcessMatic();
        emit ContributionSent("Matic", carbonAmountToRetire);
    }

    /// @notice Takes user approved token, swaps to carbon token and retires
    ///         the swapped tokens. Forwards donations in carbon tokens Only
    ///         takes as many tokens as needed.
    /// @param fromToken Address of the token that is used to swap from.
    /// @param carbonAmountToRetire The number of carbon tokens that need to be forwarded.
    /// @param donationPercentage Donation as a percentage 1 = 1% added for donation.
    function retireWithToken(address fromToken, uint256 carbonAmountToRetire, uint256 donationPercentage)
        public
    {
        uint256 carbonAmountWithDonation = addDonation(carbonAmountToRetire, donationPercentage);

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

        doAccounting(carbonAmountToRetire);
        forwardDonation(carbonAmountToRetire);
        emit ContributionSent("Token", carbonAmountToRetire);
    }

    ///@notice Calculates the needed amount of coins/tokens.
    ///         the swapped tokens.
    /// @param fromToken Address of the token that is used to swap from.
    ///        To estimate Matic tokens, use WMATIC address.
    /// @param carbonAmountToRetire Carbon Amount that needs to be purchased.
    /// @return tokenAmountNeeded How many tokens/coins needed for buying the needed
    ///         carbon tokens.
    function calculateNeededAmount(address fromToken, uint256 carbonAmountToRetire)
        public
        view
        returns (uint256)
    {
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
    function addDonation(uint256 carbonAmountToRetire, uint256 donatioPercentage)
        public
        pure
        returns (uint256)
    {
        uint256 carbonAmountWithDonation = carbonAmountToRetire*(100 + donatioPercentage)/100;
        return carbonAmountWithDonation;
    }

    /// @notice A getter function for the array with all the contributors addresses.
    /// @return contributorsAddresses An array (can be empty) with all addresses which contributed.
    function getContributorsAddresses() public view returns (address[] memory) {
        return contributorsAddresses;
    }

    /// @notice A function to get the number of contributors.
    /// @return uint256 A number which is the length of the contributorsAddresses array.
    function getContributorsCount() public view returns (uint256) {
        return contributorsAddresses.length;
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
    function swapTokenToCarbonToken(address fromToken, uint256 carbonAmountToRetire)
        private
    {
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

    /// @notice Does the accounting (storing addresses and values contributed).
    /// @param carbonAmountToRetire Amount of carbon tokens retired.
    function doAccounting(uint256 carbonAmountToRetire) private {
        totalCarbonPooled += carbonAmountToRetire;
        if (contributions[msg.sender] == 0) {
            contributorsAddresses.push(msg.sender);
        }
        contributions[msg.sender] += carbonAmountToRetire;
    }

    /// @notice Returns excess matic not used in the swap.
    function returnExcessMatic() private {
        (bool success, ) = msg.sender.call{value: address(this).balance}("");
        require(success, "refund failed");
    }

    /// @notice Forwards the donation to the disCarbon multisig.
    function forwardDonation(uint256 carbonAmountToRetire) private {
        IERC20(NCTAddress).transfer(donationAddress, carbonAmountToRetire);
    }
}
