//Tabella di associazioni id farmaco --> informazioni del farmaco: traccia le informazioni e lo stato di tutti i farmaci mintati.
//Permette a uno specifico indirizzo owner di creare nft di farmaci.

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// eredito da ERC721URIStorage e Ownable per limitare la funzione di minting al proprietario del contratto
contract DrugNFT is ERC721URIStorage, Ownable {

// definisco una struttura per rappresentare il farmaco

 struct Drug {
    string name;
    string lotNumber;
    uint256 productionDate;
    uint256 expirationDate;
    address producer;
    bool forSale;
    bool sold;
    address buyer;
}

address public marketplace;

// Solo il produttore può decidere quale indirizzo è il Marketplace autorizzato.
function setMarketplace(address _marketplace) external onlyOwner {
    marketplace = _marketplace;
}

// controllo che solo il marketplace possa chiamare la funzione markAsSold
modifier onlyMarketplace() {
    require(msg.sender == marketplace, "Only marketplace");
    _; //"_" indica di eseguire il corpo della funzione se il controllo è superato
}

// solo il marketplace può modificare lo stato "sold" del farmaco e registrare l'acquirente
function markAsSold(uint256 tokenId, address buyer) external onlyMarketplace
{
    require(_ownerOf(tokenId) != address(0), "Token does not exist");
    require(!drugs[tokenId].sold, "Drug already sold");

    drugs[tokenId].sold = true;
    drugs[tokenId].buyer = buyer;
}
function markAsForSale(uint256 tokenId, bool forSale) external onlyMarketplace
{
    require(_ownerOf(tokenId) != address(0), "Token does not exist");
    require(!drugs[tokenId].sold, "Drug already sold");

    drugs[tokenId].forSale = forSale;
}
    // Definisco l'evento in cima al contratto
    event DrugMinted(
        uint256 indexed tokenId,
        string name,
        string lotNumber,
        uint256 productionDate,
        uint256 expirationDate,
        address producer,
        bool forSale,
        bool sold,
        address buyer
    );

    // uso un mapping per associare a ogni id di un farmaco la struct Drug con le info corrispondenti

    mapping(uint256 => Drug) private drugs;

    // variabile privata per registrare l'id del prossimo farmaco mintato
    uint256 private _nextTokenId;

    //costruttore -> eseguito solo una volta 

    //prende come parametro l'ind di quello che diventa il proprietario del contratto
    constructor(address producer)
     //inizializza la parte ERC-721 ereditata da OpenZeppelin assegnando il nome e il simbolo del token
        ERC721("DrugTraceability", "DRUG")
        // libreria di OpenZeppelin: prende initialOwner e lo imposta come proprietario del contratto
        Ownable(producer) 
    {}

    //minting

   function mintDrugNFT(
    string memory uri,
    string memory name,
    string memory lotNumber,
    uint256 productionDate,
    uint256 expirationDate
) public onlyOwner returns (uint256) {
    //controlli sulle date e scadenza
     require(
        expirationDate > productionDate,
        "Invalid dates"
    );

    require(
        expirationDate > block.timestamp,
        "Drug already expired"
    );
    uint256 tokenId = _nextTokenId;
    _nextTokenId++;

    _safeMint(owner(), tokenId);

    _setTokenURI(tokenId, uri);

    drugs[tokenId] = Drug(
        name,
        lotNumber,
        productionDate,
        expirationDate,
        owner(),
        false,
        false,
        address(0)
    );

    emit DrugMinted(
        tokenId,
        name,
        lotNumber,
        productionDate,
        expirationDate,
        owner(),
        false,
        false,
        address(0)
    );

    return tokenId;
}

    // ritorna serial number, lot number, scadenza e produttore del farmaco
   function getDrug(uint256 tokenId)
    public
    view
    returns (Drug memory)
{
    require(_ownerOf(tokenId) != address(0), "Token does not exist");

    return drugs[tokenId];
}

    function isExpired(uint256 tokenId) public view returns (bool) {
    require(_ownerOf(tokenId) != address(0), "Token does not exist");

    return block.timestamp >= drugs[tokenId].expirationDate;
}
    function isSold(uint256 tokenId) public view returns (bool) {
    require(_ownerOf(tokenId) != address(0), "Token does not exist");

    return drugs[tokenId].sold;

}
function lastTokenId() public view returns (uint256) {
    return _nextTokenId - 1;
}
function isForSale(uint256 tokenId) public view returns (bool) {
    require(_ownerOf(tokenId) != address(0), "Token does not exist");

    return drugs[tokenId].forSale;
}
        
}