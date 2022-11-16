# disCarbonSwapAndRetire

*haurog, danceratopz*

> disCarbon generalized swap and retire contract

This contract exchanges the coins/tokens of the user for carbon         tokens (NCT) and redeems them for an underlying project token and         retires them. It also keeps track on the cumulative retirements of         each address.



## Methods

### calculateNeededAmount

```solidity
function calculateNeededAmount(address fromToken, uint256 carbonAmount) external view returns (uint256)
```

returns the needed amount of coins/tokens.         the swapped tokens. Only takes as many tokens as needed.



#### Parameters

| Name | Type | Description |
|---|---|---|
| fromToken | address | Address of the token that is used to swap from.        To estimate Matic tokens, use WMATIC address. |
| carbonAmount | uint256 | Carbon Amount that needs to be purchased. |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | tokenAmountNeeded How many tokens/coins needed for buying the needed         carbon tokens. |

### contributions

```solidity
function contributions(address) external view returns (uint256)
```

Stores all contributions (summed up) for each address



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### contributorsAddresses

```solidity
function contributorsAddresses(uint256) external view returns (address)
```

An array of addresses which have contributed



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### donationAddress

```solidity
function donationAddress() external view returns (address)
```

Address to where the donations are sent to




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### getContributorsAddresses

```solidity
function getContributorsAddresses() external view returns (address[])
```

A getter function for the array with all the contributors addresses.




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address[] | contributorsAddresses An array (can be empty) with all addresses which contributed. |

### getContributorsCount

```solidity
function getContributorsCount() external view returns (uint256)
```

A function to get the number of contributors.




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | uint256 A number which is the length of the contributorsAddresses array. |

### retireWithMatic

```solidity
function retireWithMatic(uint256 carbonAmount) external payable
```

Receives Matic, swaps to carbon token and retires the carbon         tokens. Forwards donations in carbon tokens. Returns any excess Matic.



#### Parameters

| Name | Type | Description |
|---|---|---|
| carbonAmount | uint256 | The number of carbon tokens that need to be retired. |

### retireWithToken

```solidity
function retireWithToken(address fromToken, uint256 carbonAmount) external nonpayable
```

Takes user approved token, swaps to carbon token and retires         the swapped tokens. Forwards donations in carbon tokens Only         takes as many tokens as needed.



#### Parameters

| Name | Type | Description |
|---|---|---|
| fromToken | address | Address of the token that is used to swap from. |
| carbonAmount | uint256 | The number of carbon tokens that need to be forwarded. |

### totalCarbonPooled

```solidity
function totalCarbonPooled() external view returns (uint256)
```

Sum of all contributions




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |



## Events

### ContributionSent

```solidity
event ContributionSent(string tokenOrCoin, uint256 carbonTokenContributed)
```

Emitted after carbon tokens have been sent to pooling address.



#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenOrCoin  | string | undefined |
| carbonTokenContributed  | uint256 | undefined |



