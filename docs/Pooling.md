# Pooling

*haurog, danceratopz*

> disCarbon Devcon 6 attendee pooling contract

This contract exchanges the coins/tokens of the users for carbon tokens (NCT) and sends them to the pooling address.



## Methods

### calculateNeededAmount

```solidity
function calculateNeededAmount(address fromToken, uint256 amount) external view returns (uint256)
```

returns the needed amount of coins/tokens



#### Parameters

| Name | Type | Description |
|---|---|---|
| fromToken | address | undefined |
| amount | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### contributions

```solidity
function contributions(address) external view returns (uint256)
```





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





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

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

### participateWithMatic

```solidity
function participateWithMatic(uint256 carbonAmount) external payable
```

Receives Matic, swaps to carbon token and forwards the swapped tokens. Returns any excess Matic.



#### Parameters

| Name | Type | Description |
|---|---|---|
| carbonAmount | uint256 | The number of carbon tokens that need to be forwarded. |

### participateWithToken

```solidity
function participateWithToken(address token, uint256 carbonAmount) external nonpayable
```

Takes user approved token, swaps to carbon token and forwards the swapped tokens. Only takes as much tokens as needed.



#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | Address of the token that should be used to participate. |
| carbonAmount | uint256 | The number of carbon tokens that need to be forwarded. |

### poolingAddress

```solidity
function poolingAddress() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### totalCarbonPooled

```solidity
function totalCarbonPooled() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |



## Events

### ContributionSent

```solidity
event ContributionSent(string tokenOrCoin, uint256 carbonTokenContributed)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenOrCoin  | string | undefined |
| carbonTokenContributed  | uint256 | undefined |



