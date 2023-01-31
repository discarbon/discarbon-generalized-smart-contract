// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;


/// Definition of some external contracts which we call in our swap contract

contract NCTContract {
    uint256 public feeRedeemDivider;
    uint256 public feeRedeemPercentageInBase;
}