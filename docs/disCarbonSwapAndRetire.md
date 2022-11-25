# disCarbonSwapAndRetire

*haurog, danceratopz*

> disCarbon generalized swap and retire contract

This contract exchanges the coins/tokens of the user for carbon         tokens (NCT) and redeems them for an underlying project token and         retires them. It also keeps track on the cumulative retirements of         each address.



## Methods

### addDonation

```solidity
function addDonation(uint256 carbonAmountToRetire, uint256 donatioPercentage) external pure returns (uint256)
```

Calculates the amount of carbon tokens that need to be swapped         including donations.



#### Parameters

| Name | Type | Description |
|---|---|---|
| carbonAmountToRetire | uint256 | Carbon amount that needs to be retired. |
| donatioPercentage | uint256 | The given donation percentage which needs         to be added. |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | carbonAmountWithDonation How many carbon tokens need to be         received from swap to have enough for the donation. |

### autoRetireAndMintCertificateWithMatic

```solidity
function autoRetireAndMintCertificateWithMatic(uint256 carbonAmountToRetire, uint256 donationPercentage, address beneficiaryAddress, string beneficiaryString, string retirementMessage) external payable returns (address[] tco2Addresses, uint256[] tco2Amounts, uint256[] tco2CertificateTokenIds)
```

Receives Matic, swaps to carbon token, retires the swapped tokens via autoRedeem2         and mints the retirement certificate. Forwards donations in carbon tokens.         Returns any excess Matic.



#### Parameters

| Name | Type | Description |
|---|---|---|
| carbonAmountToRetire | uint256 | The number of carbon tokens to be retired. |
| donationPercentage | uint256 | Donation as a percentage 1 = 1% added for donation. |
| beneficiaryAddress | address | The retirement beneficiary to specify in the retirement certificate. |
| beneficiaryString | string | The retirement beneficiary name to specify in the retirement certificate. |
| retirementMessage | string | The retirement message to specify in the retirement certificate. |

#### Returns

| Name | Type | Description |
|---|---|---|
| tco2Addresses | address[] | An array of the TCO2 addresses that were retired. |
| tco2Amounts | uint256[] | An array of the amounts of each TCO2 that was retired. |
| tco2CertificateTokenIds | uint256[] | An array of the corresponding retirement certificate ids. |

### autoRetireAndMintCertificateWithToken

```solidity
function autoRetireAndMintCertificateWithToken(address fromToken, uint256 carbonAmountToRetire, uint256 donationPercentage, address beneficiaryAddress, string beneficiaryString, string retirementMessage) external nonpayable returns (address[] tco2Addresses, uint256[] tco2Amounts, uint256[] tco2CertificateTokenIds)
```

Takes a user approved token, swaps to carbon token, retires the swapped tokens         via autoRedeem2 and mints the certificate. Forwards donations in carbon tokens.         Only takes as many tokens as needed.



#### Parameters

| Name | Type | Description |
|---|---|---|
| fromToken | address | Address of the erc20 token sent to buy carbon tokens with. |
| carbonAmountToRetire | uint256 | The number of carbon tokens to be retired. |
| donationPercentage | uint256 | Donation as a percentage 1 = 1% added for donation. |
| beneficiaryAddress | address | The retirement beneficiary to specify in the retirement certificate. |
| beneficiaryString | string | The retirement beneficiary name to specify in the retirement certificate. |
| retirementMessage | string | The retirement message to specify in the retirement certificate. |

#### Returns

| Name | Type | Description |
|---|---|---|
| tco2Addresses | address[] | An array of the TCO2 addresses that were retired. |
| tco2Amounts | uint256[] | An array of the amounts of each TCO2 that was retired. |
| tco2CertificateTokenIds | uint256[] | An array of the corresponding retirement certificate ids. |

### beneficiaryRetirements

```solidity
function beneficiaryRetirements(address) external view returns (uint256)
```

The total amount of carbon retired by each beneficiary



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### calculateNeededAmount

```solidity
function calculateNeededAmount(address fromToken, uint256 carbonAmountToRetire) external view returns (uint256)
```

Calculates the needed amount of coins/tokens.         the swapped tokens.



#### Parameters

| Name | Type | Description |
|---|---|---|
| fromToken | address | Address of the token that is used to swap from.        To estimate Matic tokens, use WMATIC address. |
| carbonAmountToRetire | uint256 | Carbon Amount that needs to be purchased. |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | tokenAmountNeeded How many tokens/coins needed for buying the needed         carbon tokens. |

### callerRetirements

```solidity
function callerRetirements(address) external view returns (uint256)
```

The total amount of carbon retired by each address that has called this contract



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### donationAddress

```solidity
function donationAddress() external view returns (address)
```

Address to where the donations are sent to




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### getRetirementCallerAddresses

```solidity
function getRetirementCallerAddresses() external view returns (address[])
```

A getter function for the array holding all addresses that have retired via this contract.




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address[] | retireeAddresses An array (can be empty) of all addresses that have retired. |

### getRetirementCallerCount

```solidity
function getRetirementCallerCount() external view returns (uint256)
```

A function to get the number of addresses that have retired via this contract.




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | uint256 The length of the retireeAddresses array. |

### onERC721Received

```solidity
function onERC721Received(address _operator, address _from, uint256 _tokenId, bytes _data) external nonpayable returns (bytes4)
```



*Required for use with safeTransferFrom() (from OpenZeppelin&#39;s ERC721 contract) used      by Toucan&#39;s RetirementCertificates in order to transfer the ERC721 retirement      certificates to this contract).*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _operator | address | undefined |
| _from | address | undefined |
| _tokenId | uint256 | undefined |
| _data | bytes | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes4 | undefined |

### retirementBeneficiaryAddresses

```solidity
function retirementBeneficiaryAddresses(uint256) external view returns (address)
```

An array of addresses that have been specified as retirement beneficiaries



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### retirementCallerAddresses

```solidity
function retirementCallerAddresses(uint256) external view returns (address)
```

An array of addresses which have retired carbon by calling this contract



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### totalCarbonRetired

```solidity
function totalCarbonRetired() external view returns (uint256)
```

The total amount of carbon retired via this contract




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |



## Events

### CarbonRetired

```solidity
event CarbonRetired(string tokenOrCoin, uint256 carbonAmountRetired)
```

Emitted after carbon tokens have been retired.



#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenOrCoin  | string | undefined |
| carbonAmountRetired  | uint256 | undefined |

### ERC721Received

```solidity
event ERC721Received(address indexed sender, uint256 tokenId)
```

Emitted when an ERC721 is transferred to this retirement contract.



#### Parameters

| Name | Type | Description |
|---|---|---|
| sender `indexed` | address | The address that sent the ERC721. |
| tokenId  | uint256 | The ERC721 token ID sent. |



