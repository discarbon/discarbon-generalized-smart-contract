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
    address private NCTAdress = 0xD838290e877E0188a4A44700463419ED96c16107;
    address private WMATICAdress = 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270;
    address private USDCAdress = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;

    // needed, otherwise uniswap router for matic fails
    receive() external payable {}

    fallback() external payable {}

    function exchangeCoinToCarbonToken(uint256 carbonAmount) public payable {
        // Matic
        // dummy code to call final function

        address[] memory path = new address[](3);
        path[0] = WMATICAdress;
        path[1] = USDCAdress;
        path[2] = NCTAdress;

        uint256[] memory amountUsed = swapToCarbonToken(carbonAmount, path);

        require(
            carbonAmount == amountUsed[2],
            "Not received enough carbon Tokens"
        );

        doAccounting(carbonAmount);
        forwardCarbonTokenToPool(carbonAmount);
        returnExcessMatic();
    }

    function exchangeTokenToCarbonToken() public {} // handles every ERC-20 allowed

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
        IERC20(NCTAdress).transfer(poolingAddress, carbonAmount);
    }
}
