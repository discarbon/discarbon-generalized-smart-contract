// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

/// @title disCarbon Devcon 6 attendee pooling contract
/// @author haurog, danceratopz
/// @notice This contract exchanges the coins/tokens of the users for carbon tokens (NCT) and sends them to the pooling address.

// Import this file to use console.log
import "hardhat/console.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Pooling {
    using SafeERC20 for IERC20;

    mapping(address => uint256) public contributions;
    address[] public contributorsAddresses;

    uint256 public totalCarbonPooled = 0;

    address public poolingAddress = 0x1c0AcCc24e1549125b5b3c14D999D3a496Afbdb1; // haurogs public address (for testing purposes)

    address private sushiRouterAddress =
        0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506;
    address private NCTAddress = 0xD838290e877E0188a4A44700463419ED96c16107;
    address private WMATICAddress = 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270;
    address private USDCAddress = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;

    // needed, otherwise uniswap router for matic fails
    receive() external payable {}

    fallback() external payable {}

    function participateWithMatic(uint256 carbonAmount) public payable {
        address[] memory path = makePath(WMATICAddress);

        uint256[] memory amountUsed = swapToCarbonToken(carbonAmount, path);

        require(
            carbonAmount == amountUsed[2],
            "Not received enough carbon Tokens"
        );

        doAccounting(carbonAmount);
        forwardCarbonTokenToPool(carbonAmount);
        returnExcessMatic();
    }

    // handles every ERC-20 allowed
    function participateWithToken(address token, uint256 carbonAmount) public {
        // Skip swap if NCT is supplied
        if (token != NCTAddress) {
            IUniswapV2Router02 routerSushi = IUniswapV2Router02(
                sushiRouterAddress
            );
            address[] memory path = makePath(token);
            uint256[] memory tokensNeeded = routerSushi.getAmountsIn(
                carbonAmount,
                path
            );
            // transfer tokens to this contract
            IERC20(token).safeTransferFrom(
                msg.sender,
                address(this),
                tokensNeeded[0]
            );
            // approve tokens for sushiRouter
            IERC20(token).approve(sushiRouterAddress, tokensNeeded[0]);
            // swap
            routerSushi.swapTokensForExactTokens(
                carbonAmount,
                tokensNeeded[0],
                path,
                address(this),
                block.timestamp
            );
        } else {
            // fotransfer NCT tokens
            IERC20(token).safeTransferFrom(
                msg.sender,
                address(this),
                carbonAmount
            );
        }

        doAccounting(carbonAmount);
        forwardCarbonTokenToPool(carbonAmount);
    }

    // returns the needed amount of coins/tokens
    function calculateNeededAmount(address fromToken, uint256 amount)
        public
        view
        returns (uint256)
    {
        // if NCT is supplied no swap necessary
        if (fromToken == NCTAddress) {
            return amount;
        }

        address[] memory path = makePath(fromToken);

        IUniswapV2Router02 sushiRouter = IUniswapV2Router02(sushiRouterAddress);

        uint256[] memory amountNeeded = sushiRouter.getAmountsIn(amount, path);

        return amountNeeded[0];
    }

    /// @notice This function creates a path from the initial token to the final token.
    /// It always goes through USDC. So make sure there is actually liquidity on sushiswap for your token path.
    /// @return an array (can be empty) with all addresses which contributed.
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
            path[0] = WMATICAddress;
            path[1] = USDCAddress;
            path[2] = NCTAddress;
            return path;
        }
    }

    function swapToCarbonToken(uint256 carbonAmount, address[] memory path)
        private
        returns (uint256[] memory)
    {
        IUniswapV2Router02 sushiRouter = IUniswapV2Router02(sushiRouterAddress);

        uint256[] memory tokenToSwap = sushiRouter.getAmountsIn(
            carbonAmount,
            path
        );
        require(
            msg.value >= tokenToSwap[0],
            "Not enough Matic to swap to required carbon Token"
        );

        uint256[] memory amountUsed = sushiRouter.swapETHForExactTokens{
            value: msg.value
        }(carbonAmount, path, address(this), block.timestamp);

        return amountUsed;
    }

    function doAccounting(uint256 carbonAmount) private {
        totalCarbonPooled += carbonAmount;
        if (contributions[msg.sender] == 0) {
            contributorsAddresses.push(msg.sender);
        }
        contributions[msg.sender] += carbonAmount;
    }

    function returnExcessMatic() private {
        (bool success, ) = msg.sender.call{value: address(this).balance}("");
        require(success, "refund failed");
    }

    function forwardCarbonTokenToPool(uint256 carbonAmount) private {
        IERC20(NCTAddress).transfer(poolingAddress, carbonAmount);
    }

    /// @notice A getter function for the array with all the contributors addresses.
    /// @return an array (can be empty) with all addresses which contributed.
    function getContributorsAddresses() public view returns (address[] memory) {
        return contributorsAddresses;
    }

    /// @notice A function to get the number of contributors.
    /// @return a number which is the length of the contributorsAddresses array.
    function getContributorsCount() public view returns (uint256) {
        return contributorsAddresses.length;
    }
}
