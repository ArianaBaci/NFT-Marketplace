//Tabella di associazioni id farmaco --> informazioni del farmaco: traccia le informazioni e lo stato di tutti i farmaci mintati.
//Permette a uno specifico indirizzo owner di creare nft di farmaci.

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// eredito da ERC721URIStorage e Ownable per limitare la funzione di minting al proprietario del contratto
contract DrugNFT is ERC721URIStorage, Ownable {

    // definisco uno struct per rappresentare: numero di serie e di lotto, scadenza e produttore del farmaco
    struct Drug {
        string serialNumber;
        string lotNumber;
        uint256 expirationDate;
        string manufacturer;
    }
    // Definisci l'evento in cima al contratto
    event DrugMinted(
        uint256 indexed tokenId,
        string serialNumber,
        string lotNumber,
        address indexed recipient,
        string manufacturer
    );

    // uso un mapping per associare a ogni id di un farmaco la struct Drug con le info corrispondenti

    mapping(uint256 => Drug) private drugs;

    // variabile privata per registrare l'id del prossimo farmaco mintato
    uint256 private _nextTokenId;

    //costruttore --> eseguito solo una volta 
    //prende come parametro l'ind di quello che diventa il proprietario del contratto
    constructor(address initialOwner)
        ERC721("DrugTraceability", "DRUG") //libreria ERC721 di OpenZeppelin che gestisce gli NFT
        Ownable(initialOwner) // libreria di OpenZeppelin: prende initialOwner e lo imposta come proprietario del contratto
    {}

    //minting 

    function mintDrugNFT(
        address to, // wallet del destinatario (ospedale, farmacia, ecc.)
        string memory uri, // link al metadata remoto JSON del farmaco
        string memory serialNumber,
        string memory lotNumber,
        uint256 expirationDate,
        string memory manufacturer
    ) public onlyOwner returns (uint256) { //onlyOwner controllo di corrispondenza indirizzo del proprietario fornito da Ownable
        uint256 tokenId = _nextTokenId;
        _nextTokenId++;
        //safeMint e _setTokenURI fornite da ERC721URIStorage di OpenZeppelin 
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        drugs[tokenId] = Drug(serialNumber, lotNumber, expirationDate, manufacturer);
        // uso un evento per registrare il minting del farmaco
        emit DrugMinted(tokenId, serialNumber, lotNumber, to, manufacturer);

        return tokenId;
    }

    // ritorna serial number, lot number, scadenza e produttore del farmaco
    function getDrug(uint256 tokenId)
        public
        view
        returns (string memory, string memory, uint256, string memory)
    {
        require(exists(tokenId), "Token does not exist");
        Drug memory drug = drugs[tokenId];
        return (drug.serialNumber, drug.lotNumber, drug.expirationDate, drug.manufacturer);
    }

    function exists(uint256 tokenId) public view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
    //evento per tracciare i passaggi logistici
    event DrugTransferred(uint256 indexed tokenId, address indexed from, address indexed to, string location);

    function transferDrug(address to, uint256 tokenId, string memory newLocation) public {
        require(ownerOf(tokenId) == msg.sender, "Non sei il proprietario del farmaco");
        safeTransferFrom(msg.sender, to, tokenId);
        emit DrugTransferred(tokenId, msg.sender, to, newLocation);
}       
}