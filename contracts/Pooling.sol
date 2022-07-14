// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

/// @title disCarbon Devcon 6 attendee pooling contract
/// @author haurog, danceratopz
/// @notice This contract exchanges the coins/tokens of the users for carbon tokens (NCT) and moves them forward to the pooling address.
/// @dev All function calls are currently implemented without side effects

// Import this file to use console.log
import "hardhat/console.sol";

contract Pooling {
    mapping(address => uint256) public contributors;

    address poolingAddress = 0x1c0AcCc24e1549125b5b3c14D999D3a496Afbdb1; // haurogs public address (for testing purposes)

    function exchangeCoinToCarbonToken() public payable {}  // Matic
    function exchangeTokenToCarbonToken() public {} // handles every ERC-20 allowed
    function swapToCarbonToken() private {} // does the swap
    function forwardCarbonToken() private {} // forwards the tokens to the poolingAddress
}