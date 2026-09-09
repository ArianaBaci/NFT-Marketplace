// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./DrugNFT.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
//Eredita reentrancyGuard di openZeppelin per gli attacchi reentrancy
contract DrugMarketplace is ReentrancyGuard, Ownable {
    struct Listing {
        address seller;
        string drugName;
        uint256 price;
        bool isActive;
    }

    mapping(uint256 => Listing) private listings;

    DrugNFT public drugNFT;
    
    constructor() Ownable(msg.sender) {}

    //al momento per semplicità il marketplace è specifico per un contratto drugNFT ma può essere esteso per supportane diversi

    function setDrugNFT(address nftAddress) external onlyOwner {
        drugNFT = DrugNFT(nftAddress);
    }
    //reimposta a address(0) il contratto affiliato
    function unSetDrugNFT() external onlyOwner {
        drugNFT = DrugNFT(address(0));
    }

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

    //funzione utilizzabile solo dal proprietario del farmaco per caricare l'annuncio    
    function listDrug(uint256 tokenId, uint256 price) public {
        //controlli: sender==proprietario, prezzo>0, marketplace effettivamente abilitato
        require(drugNFT.ownerOf(tokenId) == msg.sender, "Not the owner");
        require(price > 0, "Price must be greater than zero");
        require(address(this)==drugNFT.marketplace(),
           "Marketplace not approved"
        );
        //il nome si può non specificare per comodità
        listings[tokenId] = Listing({
            seller: msg.sender,
            drugName: drugNFT.getDrug(tokenId).name,
            price: price,
            isActive: true
        });
        drugNFT.markAsForSale(tokenId, true);
        emit DrugListed(tokenId, drugNFT.getDrug(tokenId).name, msg.sender, price);
    }

    // Funzione per acquistare il farmaco: questa può essere usata da qualunque client diverso dal proprietario
    function buyDrug(uint256 tokenId)
        external
        payable
        nonReentrant
    {   
        Listing storage listing = listings[tokenId];
        uint256 price = listing.price;
        address seller = listing.seller;
        //verifiche: farmaco non scaduto, annuncio attivo, buyer diverso dal proprietario stesso, fondi sufficienti
        
        require(
            !drugNFT.isExpired(tokenId),
            "Drug is expired"  
        );
        require(listing.isActive, "Listing not active");
        require(msg.sender != seller, "Seller cannot buy");
        require(msg.value >= price, "Insufficient funds");
        require(
            drugNFT.isForSale(tokenId),
            "Drug is not available "
        );

        listing.isActive = false;

        drugNFT.markAsSold(tokenId, msg.sender);
        drugNFT.markAsForSale(tokenId, false);

        drugNFT.safeTransferFrom(seller, msg.sender, tokenId);

        (bool sentToSeller, ) = payable(seller).call{value: price}("");
        require(sentToSeller, "Payment to seller failed");

        if (msg.value > price) {
            (bool sentToBuyer, ) = payable(msg.sender).call{value: msg.value - price}("");
            require(sentToBuyer, "Refund to buyer failed");
        }
       
        emit DrugSold(tokenId, seller, msg.sender, price);
    }

    // Funzione per ritirare l'annuncio, utilizzabile solo dal proprietario (utile ad esempio in caso di scadenza..)
    function cancelListing(uint256 tokenId) public {
        Listing storage listing = listings[tokenId];

        require(listing.isActive, "Listing is not active");
        require(listing.seller == msg.sender, "Only the seller can cancel the listing");

        listing.isActive = false;
        drugNFT.markAsForSale(tokenId, false);

        emit ListingCancelled(tokenId);
    }

    // Funzione per modificare il prezzo, utilizzabile solo dal proprietario
    function updatePrice(uint256 tokenId, uint256 newPrice) public {
        Listing storage listing = listings[tokenId];

        require(listing.isActive, "Listing is not active");
        require(listing.seller == msg.sender, "Only the seller can update the price");
        require(newPrice > 0, "Price must be greater than zero");

        listing.price = newPrice;

        emit PriceUpdated(tokenId, newPrice);
    }
    //FUNZIONI ACCESSORIE
    function getListing(uint256 tokenId) public view returns (address, string memory, uint256, bool) {
        Listing memory listing = listings[tokenId];
        return (listing.seller, listing.drugName, listing.price, listing.isActive);
    }
    function getPrice(uint256 tokenId) public view returns (uint256) {
        Listing memory listing = listings[tokenId];
        return listing.price;
    }
    function getSeller(uint256 tokenId) public view returns (address) {
        Listing memory listing = listings[tokenId];
        return listing.seller;
    } 
}