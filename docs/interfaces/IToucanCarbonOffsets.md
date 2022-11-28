# IToucanCarbonOffsets









## Methods

### allowance

```solidity
function allowance(address owner, address spender) external view returns (uint256)
```



*Returns the remaining number of tokens that `spender` will be allowed to spend on behalf of `owner` through {transferFrom}. This is zero by default. This value changes when {approve} or {transferFrom} are called.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| owner | address | undefined |
| spender | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### approve

```solidity
function approve(address spender, uint256 amount) external nonpayable returns (bool)
```



*Sets `amount` as the allowance of `spender` over the caller&#39;s tokens. Returns a boolean value indicating whether the operation succeeded. IMPORTANT: Beware that changing an allowance with this method brings the risk that someone may use both the old and the new allowance by unfortunate transaction ordering. One possible solution to mitigate this race condition is to first reduce the spender&#39;s allowance to 0 and set the desired value afterwards: https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729 Emits an {Approval} event.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| spender | address | undefined |
| amount | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### balanceOf

```solidity
function balanceOf(address account) external view returns (uint256)
```



*Returns the amount of tokens owned by `account`.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### getAttributes

```solidity
function getAttributes() external view returns (struct ProjectData, struct VintageData)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | ProjectData | undefined |
| _1 | VintageData | undefined |

### getDepositCap

```solidity
function getDepositCap() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### getGlobalProjectVintageIdentifiers

```solidity
function getGlobalProjectVintageIdentifiers() external view returns (string, string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined |
| _1 | string | undefined |

### getRemaining

```solidity
function getRemaining() external view returns (uint256 remaining)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| remaining | uint256 | undefined |

### mintCertificateLegacy

```solidity
function mintCertificateLegacy(string retiringEntityString, address beneficiary, string beneficiaryString, string retirementMessage, uint256 amount) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| retiringEntityString | string | undefined |
| beneficiary | address | undefined |
| beneficiaryString | string | undefined |
| retirementMessage | string | undefined |
| amount | uint256 | undefined |

### onERC721Received

```solidity
function onERC721Received(address operator, address from, uint256 tokenId, bytes data) external nonpayable returns (bytes4)
```



*Whenever an {IERC721} `tokenId` token is transferred to this contract via {IERC721-safeTransferFrom} by `operator` from `from`, this function is called. It must return its Solidity selector to confirm the token transfer. If any other value is returned or the interface is not implemented by the recipient, the transfer will be reverted. The selector can be obtained in Solidity with `IERC721Receiver.onERC721Received.selector`.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| operator | address | undefined |
| from | address | undefined |
| tokenId | uint256 | undefined |
| data | bytes | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes4 | undefined |

### retire

```solidity
function retire(uint256 amount) external nonpayable returns (uint256 retirementId)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| amount | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| retirementId | uint256 | undefined |

### retireAndMintCertificate

```solidity
function retireAndMintCertificate(string retiringEntityString, address beneficiary, string beneficiaryString, string retirementMessage, uint256 amount) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| retiringEntityString | string | undefined |
| beneficiary | address | undefined |
| beneficiaryString | string | undefined |
| retirementMessage | string | undefined |
| amount | uint256 | undefined |

### retireFrom

```solidity
function retireFrom(address account, uint256 amount) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | undefined |
| amount | uint256 | undefined |

### totalSupply

```solidity
function totalSupply() external view returns (uint256)
```



*Returns the amount of tokens in existence.*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### transfer

```solidity
function transfer(address to, uint256 amount) external nonpayable returns (bool)
```



*Moves `amount` tokens from the caller&#39;s account to `to`. Returns a boolean value indicating whether the operation succeeded. Emits a {Transfer} event.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| to | address | undefined |
| amount | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### transferFrom

```solidity
function transferFrom(address from, address to, uint256 amount) external nonpayable returns (bool)
```



*Moves `amount` tokens from `from` to `to` using the allowance mechanism. `amount` is then deducted from the caller&#39;s allowance. Returns a boolean value indicating whether the operation succeeded. Emits a {Transfer} event.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| from | address | undefined |
| to | address | undefined |
| amount | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |



## Events

### Approval

```solidity
event Approval(address indexed owner, address indexed spender, uint256 value)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| owner `indexed` | address | undefined |
| spender `indexed` | address | undefined |
| value  | uint256 | undefined |

### Transfer

```solidity
event Transfer(address indexed from, address indexed to, uint256 value)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| from `indexed` | address | undefined |
| to `indexed` | address | undefined |
| value  | uint256 | undefined |



