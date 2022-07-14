// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.9;


/// @title disCarbon Devcon 6 attendee contract
/// @author haurog, danceratopz
/// @notice This contract exchanges the coins/tokens of the users for carbon tokens (NCT) and moves them forward to the pooling address.
/// @dev All function calls are currently implemented without side effects

// Import this file to use console.log
import "hardhat/console.sol";

contract Attendee {
    mapping(address => uint256) public contributors;

    address pooling_address = 0x1c0AcCc24e1549125b5b3c14D999D3a496Afbdb1;  // haurogs public address (for testing purposes)






    // uint public unlockTime;
    // address payable public owner;

    // event Withdrawal(uint amount, uint when);

    // constructor(uint _unlockTime) payable {
    //     require(
    //         block.timestamp < _unlockTime,
    //         "Unlock time should be in the future"
    //     );

    //     unlockTime = _unlockTime;
    //     owner = payable(msg.sender);
    // }

    // function withdraw() public {
    //     // Uncomment this line to print a log in your terminal
    //     // console.log("Unlock time is %o and block timestamp is %o", unlockTime, block.timestamp);

    //     require(block.timestamp >= unlockTime, "You can't withdraw yet");
    //     require(msg.sender == owner, "You aren't the owner");

    //     emit Withdrawal(address(this).balance, block.timestamp);

    //     owner.transfer(address(this).balance);
    // }
}
