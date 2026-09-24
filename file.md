# Drug Traceability NFT Marketplace

A blockchain-based NFT marketplace for tracking the authenticity and provenance of pharmaceutical products.

## Overview

The project models a simplified pharmaceutical supply chain in which each pharmaceutical product is represented by a unique NFT.

The system is composed of two smart contracts:

- `DrugNFT.sol`: creates and manages NFTs representing pharmaceutical products.
- `DrugMarketplace.sol`: manages listings and purchases of pharmaceutical NFTs.

The purpose of the project is to demonstrate how blockchain technology can be used to improve product traceability and authenticity.

Each NFT is associated with information such as:

- Product name
- Lot number
- Production date
- Expiration date
- Producer
- Current owner
- Sale status

Since the information is stored on-chain, the product history cannot be modified retroactively by a centralized entity. The uniqueness of each NFT also prevents the reuse of product identifiers within the system.

> This project is an educational prototype and does not represent a complete production-ready pharmaceutical traceability system.

## Architecture

### `DrugNFT.sol`

`DrugNFT` is an ERC-721 smart contract based on OpenZeppelin contracts.

It extends:

- `ERC721URIStorage`, for NFT metadata management
- `Ownable`, to restrict administrative operations to the producer

### Main functions

- `mintDrugNFT(...)`
- `setMarketplace(...)`
- `markAsForSale(...)`
- `markAsSold(...)`
- `getDrug(...)`
- `isExpired(...)`
- `isSold(...)`
- `isForSale(...)`

Minting is restricted to the contract owner through the `onlyOwner` modifier.

The marketplace-related status functions can only be called by the authorized marketplace through the `onlyMarketplace` modifier.

## `DrugMarketplace.sol`

`DrugMarketplace` manages the sale of pharmaceutical NFTs.

The contract uses OpenZeppelin's `ReentrancyGuard` to protect purchase operations against reentrancy attacks.

The marketplace must be associated with a `DrugNFT` contract before listings can be created.

### Main functions

- `setDrugNFT(...)`
- `unSetDrugNFT()`
- `listDrug(...)`
- `buyDrug(...)`
- `cancelListing(...)`
- `updatePrice(...)`
- `getListing(...)`
- `getPrice(...)`
- `getSeller(...)`

Only the owner of an NFT can create a listing for it.

## Contract Interaction

Before using the marketplace, the contracts must be configured as follows:

1. The producer deploys `DrugNFT`.
2. The marketplace contract is deployed.
3. The producer registers the marketplace in `DrugNFT` using `setMarketplace`.
4. The marketplace is configured with the address of `DrugNFT` using `setDrugNFT`.

This creates a two-way authorization relationship:

- `DrugNFT` authorizes `DrugMarketplace` to update sale-related NFT data and transfer tokens.
- `DrugMarketplace` authorizes `DrugNFT` as the NFT collection it manages.

The current implementation supports one producer and one NFT contract. A future version could support multiple pharmaceutical producers and multiple NFT collections.

## Project Structure

```text
.
├── contracts/
│   ├── DrugNFT.sol
│   ├── DrugMarketplace.sol
│   └── ... Solidity tests
├── test/
│   ├── DrugNFT.ts
│   ├── DrugMarketplace.ts
│   └── ...
├── ignition/
│   └── modules/
├── hardhat.config.ts
├── package.json
└── README.md

Clone the repository and install the dependencies:

git clone https://github.com/ArianaBaci/NFT-Marketplace.git
cd NFT-Marketplace.git
npm install
Compile the Contracts

npx hardhat compile

Run the complete test suite:

npx hardhat test

Run the TypeScript tests:

npx hardhat test nodejs

Run the Solidity tests:

npx hardhat test solidity
Testing

