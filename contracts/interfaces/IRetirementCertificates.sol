// SPDX-FileCopyrightText: 2021 Toucan Labs
//
// SPDX-License-Identifier: UNLICENSED

// If you encounter a vulnerability or an issue, please contact <security@toucan.earth> or visit security.toucan.earth
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "./IToucanContractRegistry.sol";

interface IRetirementCertificates is IERC721Upgradeable {
  
    /// @dev Returns the Uniform Resource Identifier (URI) for `tokenId` token.
    function tokenURI(uint256 tokenId) external returns (string memory);
 
    /// @notice Get all events for a user.
    /// @param user The user for whom to fetch all events.
    function getUserEvents(address user)
        external
        view
        returns (uint256[] memory);

    /// @notice Update retirementMessage, beneficiary, and beneficiaryString of a NFT
    /// within 24h of creation. Empty values are ignored, ie., will not overwrite the
    /// existing stored values in the NFT.
    /// @param tokenId The id of the NFT to update
    /// @param beneficiary The new beneficiary to set in the NFT
    /// @param beneficiaryString The new beneficiaryString to set in the NFT
    /// @param retirementMessage The new retirementMessage to set in the NFT
    /// @dev The function can only be called by a the NFT owner
    function updateCertificate(
        uint256 tokenId,
        address beneficiary,
        string calldata beneficiaryString,
        string calldata retirementMessage
    ) external;

    /// @notice Mint new Retirement Certificate NFT that shows how many TCO2s have been retired.
    /// @param retiringEntity The entity that has retired TCO2 and is eligible to mint an NFT.
    /// @param retiringEntityString An identifiable string for the retiring entity, eg. their name.
    /// @param beneficiary The beneficiary address for whom the TCO2 amount was retired.
    /// @param beneficiaryString An identifiable string for the beneficiary, eg. their name.
    /// @param retirementMessage A message to accompany the retirement.
    /// @param retirementEventIds An array of event ids to associate with the NFT. Currently
    /// only 1 event is allowed to be provided here.
    /// @dev    The function can either be called by a valid TCO2 contract or by someone who
    ///         owns retirement events.
    function mintCertificate(
        address retiringEntity,
        string calldata retiringEntityString,
        address beneficiary,
        string calldata beneficiaryString,
        string calldata retirementMessage,
        uint256[] calldata retirementEventIds
    ) external;

}
