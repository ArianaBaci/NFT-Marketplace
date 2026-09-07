//Marketplace: gestisce solo farmaci registrati in DrugNFT.sol, permettendo a un proprietario di mettere in vendita farmaci, a un acquirente di comprarli e a un venditore di ritirare l'annuncio o modificare il prezzo.

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./DrugNFT.sol";

//eredita reentrancyGuard di openZeppelin per gli attacchi reentrancy
contract DrugMarketplace is ReentrancyGuard {

    struct Listing {
        address seller;
        string drugName;
        uint256 price;
        bool isActive;
    }

    mapping(uint256 => Listing) private listings;

    DrugNFT public immutable drugNFT;

    event DrugListed(
        uint256 indexed tokenId,
        string drugName,
        address indexed seller,
        uint256 price
    );

    event DrugSold(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 price
    );

    event ListingCancelled(
        uint256 indexed tokenId
    );

    event PriceUpdated(
        uint256 indexed tokenId,
        uint256 newPrice
    );

    //passo al costruttore l'indirizzo del contratto NFT
    constructor(address nftAddress) {
    //qui faccio il cast dell'indirizzo del contratto NFT
        drugNFT = DrugNFT(nftAddress);
    }

    // Il proprietario (il laboratorio) mette in vendita il farmaco: il marketplace registra venditore (produttore), prezzo e disponibilità
    function listDrug(uint256 tokenId, uint256 price) public {
        require(drugNFT.ownerOf(tokenId) == msg.sender, "Not the owner");
        require(price > 0, "Price must be greater than zero");
        require(
            drugNFT.getApproved(tokenId) == address(this) ||
                drugNFT.isApprovedForAll(msg.sender, address(this)),
            "Marketplace not approved"
        );

        listings[tokenId] = Listing({
            seller: msg.sender,
            drugName: drugNFT.getDrug(tokenId).name,
            price: price,
            isActive: true
        });
        drugNFT.markAsForSale(tokenId, true);
        emit DrugListed(tokenId, drugNFT.getDrug(tokenId).name, msg.sender, price);
    }

    // L'acquirente compra il farmaco: il marketplace verifica i fondi, trasferisce la proprietà e i fondi
    function buyDrug(uint256 tokenId)
        public
        payable
        nonReentrant
    {
        Listing storage listing = listings[tokenId];

        require(listing.isActive, "Listing not active");
        require(msg.sender != listing.seller, "Seller cannot buy");
        require(msg.value >= listing.price, "Insufficient funds");
        
        //verifico faemaco non scaduto
        require(
            !drugNFT.isExpired(tokenId),
            "Drug is expired"  
        );
        require(
            !drugNFT.isSold(tokenId),
            "Drug is already sold"
        );

        uint256 price = listing.price;
        address seller = listing.seller;

        listing.isActive = false;


        drugNFT.safeTransferFrom(seller, msg.sender, tokenId);

        (bool sentToSeller, ) = payable(seller).call{value: price}("");
        require(sentToSeller, "Payment to seller failed");

        if (msg.value > price) {
            (bool sentToBuyer, ) = payable(msg.sender).call{value: msg.value - price}("");
            require(sentToBuyer, "Refund to buyer failed");
        }
        drugNFT.markAsSold(tokenId, msg.sender);
        drugNFT.markAsForSale(tokenId, false);
        emit DrugSold(tokenId, seller, msg.sender, price);
    }

    // Il venditore ritira l'annuncio: viene rimosso e il farmaco non è più disponibile
    function cancelListing(uint256 tokenId) public {
        Listing storage listing = listings[tokenId];

        require(listing.isActive, "Listing is not active");
        require(listing.seller == msg.sender, "Only the seller can cancel the listing");

        listing.isActive = false;
        drugNFT.markAsForSale(tokenId, false);

        emit ListingCancelled(tokenId);
    }

    // Il venditore modifica il prezzo
    function updatePrice(uint256 tokenId, uint256 newPrice) public {
        Listing storage listing = listings[tokenId];

        require(listing.isActive, "Listing is not active");
        require(listing.seller == msg.sender, "Only the seller can update the price");
        require(newPrice > 0, "Price must be greater than zero");

        listing.price = newPrice;

        emit PriceUpdated(tokenId, newPrice);
    }

    // Ritorna venditore, prezzo e disponibilità del farmaco
    function getListing(uint256 tokenId) public view returns (address, uint256, bool) {
        Listing memory listing = listings[tokenId];
        return (listing.seller, listing.price, listing.isActive);
    }
    function isListed(uint256 tokenId) public view returns (bool) {
        Listing memory listing = listings[tokenId];
        return listing.isActive;
    }
    function getPrice(uint256 tokenId) public view returns (uint256) {
        Listing memory listing = listings[tokenId];
        require(listing.isActive, "Listing is not active");
        return listing.price;
    }
    function getSeller(uint256 tokenId) public view returns (address) {
        Listing memory listing = listings[tokenId];
        return listing.seller;
    }
    function getDrugName(uint256 tokenId) public view returns (string memory) {
        Listing memory listing = listings[tokenId];
        require(listing.isActive, "Listing is not active");
        return listing.drugName;
    }   
}