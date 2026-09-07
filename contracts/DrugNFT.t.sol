
//nella funzionen setup racchiudo le parti comuni dei test

/* pragma solidity ^0.8.20;

import "../contracts/DrugNFT.sol";

// Contratto helper per simulare un secondo wallet (un utente non proprietario)
contract UserWallet {
    function tryMint(address nftAddress, address to) external returns (bool success) {
        // Tenta di chiamare il minting: se fallisce, la chiamata a basso livello restituisce false
        (success, ) = nftAddress.call(
            abi.encodeWithSignature(
                "mintDrugNFT(address,string,string,string,uint256,string)",
                to, "uri", "SN", "LOT", block.timestamp + 365 days, "Man"
            )
        );
    }

    function tryTransfer(address nftAddress, address to, uint256 tokenId) external returns (bool success) {
        (success, ) = nftAddress.call(
            abi.encodeWithSignature("transferDrug(address,uint256,string)", to, tokenId, "Location")
        );
    }
}

contract DrugNFTTest {
    DrugNFT private drugNFT;
    UserWallet private unauthorizedUser;

    address owner = address(this); // Il contratto di test fa da Owner
    address recipient = address(0x123);
    address newOwner = address(0x456);

    // Eseguito automaticamente prima di ogni test
    function setUp() public {
        drugNFT = new DrugNFT(owner);
        unauthorizedUser = new UserWallet();
    }

    // 1. Test Inizializzazione
    function test_InitialState() public {
        require(keccak256(bytes(drugNFT.name())) == keccak256(bytes("DrugTraceability")), "Nome errato");
        require(keccak256(bytes(drugNFT.symbol())) == keccak256(bytes("DRUG")), "Simbolo errato");
        require(drugNFT.owner() == owner, "Owner errato");
    }

    // 2. Test Minting e sola lettura
    function test_MintDrugSuccess() public {
        uint256 expiration = block.timestamp + 365 days;
        uint256 tokenId = drugNFT.mintDrugNFT(
            recipient,
            "https://metadata.json",
            "SN-998877",
            "LOT-2026-A",
            expiration,
            "PharmaCorp"
        );

        // Verifiche
        require(tokenId == 0, "Il primo tokenId deve essere 0");
        require(drugNFT.ownerOf(tokenId) == recipient, "Recipient errato");
        require(drugNFT.exists(tokenId) == true, "Il token dovrebbe esistere");

        (string memory serial, string memory lot, uint256 exp, string memory man) = drugNFT.getDrug(tokenId);
        require(keccak256(bytes(serial)) == keccak256(bytes("SN-998877")), "Serial Number errato");
        require(exp == expiration, "Scadenza errata");
    }

    // 3. Test Controllo Accessi (Revert su mint da non-owner)
    function test_RevertWhen_UnauthorizedMint() public {
        bool success = unauthorizedUser.tryMint(address(drugNFT), recipient);
        require(success == false, "Il mint da parte di un utente non autorizzato doveva fallire");
    }

    // 4. Test Trasferimento
    function test_TransferDrugSuccess() public {
        uint256 tokenId = drugNFT.mintDrugNFT(
            address(this), // Mintato a questo contratto per poterlo trasferire
            "uri", "SN", "LOT", block.timestamp + 365 days, "Man"
        );

        drugNFT.transferDrug(newOwner, tokenId, "Nuova Sede");
        require(drugNFT.ownerOf(tokenId) == newOwner, "Il nuovo proprietario non corrisponde");
    }

    // 5. Test Trasferimento Fallito (Revert se non proprietario)
    function test_RevertWhen_UnauthorizedTransfer() public {
        uint256 tokenId = drugNFT.mintDrugNFT(
            recipient, // Mintato a recipient
            "uri", "SN", "LOT", block.timestamp + 365 days, "Man"
        );

        // L'utente non autorizzato prova a trasferire il token di recipient
        bool success = unauthorizedUser.tryTransfer(address(drugNFT), newOwner, tokenId);
        require(success == false, "Il trasferimento da un non-proprietario doveva fallire");
    }
}
*/





/*

//questo è del 5 settembre
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {DrugNFT} from "../src/DrugNFT.sol"; // Aggiusta il path in base alla tua struttura

contract DrugNFTTest is Test {
    DrugNFT public drugNFT;
    
    // Generiamo degli indirizzi fittizi per i test
    address public producer = address(0x1111);
    address public marketplace = address(0x2222);
    address public buyer = address(0x3333);
    address public stranger = address(0x4444);

    // Eseguito prima di ogni singolo test
    function setUp() public {
        // Viene eseguito il deploy impostando il "producer" come owner
        drugNFT = new DrugNFT(producer);
    }

    // 1. Test sul Deployment
    function test_CorrectOwner() public view {
        assertEq(drugNFT.owner(), producer);
    }

    // 2. Test sul Minting (Successo)
    function test_MintDrugNFT_Success() public {
        // vm.prank indica a Foundry che la PROSSIMA chiamata sarà fatta dal producer
        vm.prank(producer);
        
        uint256 productionDate = block.timestamp;
        uint256 expirationDate = block.timestamp + 1 days;

        uint256 tokenId = drugNFT.mintDrugNFT(
            "ipfs://drug-uri",
            "Paracetamolo",
            "LOT-999",
            productionDate,
            expirationDate
        );

        assertEq(tokenId, 0);
        
        // Verifichiamo il contenuto della struct usando il getter custom
        DrugNFT.Drug memory drug = drugNFT.getDrug(0);
        assertEq(drug.name, "Paracetamolo");
        assertEq(drug.lotNumber, "LOT-999");
        assertEq(drug.producer, producer);
        assertEq(drug.sold, false);
    }

    // 3. Test sul Minting (Fallimento: Non Owner)
    function test_MintDrugNFT_RevertIfNotOwner() public {
        // Lo stranger prova a mintare
        vm.prank(stranger);
        
        // Ci aspettiamo che la transazione fallisca con l'errore standard di OpenZeppelin
        // OwnableUnauthorizedAccount(address)
        vm.expectRevert(
            abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", stranger)
        );
        
        drugNFT.mintDrugNFT("uri", "Test", "LOT", block.timestamp, block.timestamp + 1 days);
    }

    // 4. Test sul Controllo Scadenza (Uso dei Cheatcode Temporali)
    function test_IsExpired() public {
        vm.prank(producer);
        uint256 tokenId = drugNFT.mintDrugNFT(
            "uri", "Test", "LOT", block.timestamp, block.timestamp + 100
        );

        // All'inizio non è scaduto
        assertFalse(drugNFT.isExpired(tokenId));

        // vm.warp "porta avanti il tempo" della blockchain portandolo a block.timestamp + 101 secondi
        vm.warp(block.timestamp + 101);

        // Ora deve risultare scaduto
        assertTrue(drugNFT.isExpired(tokenId));
    }

    // 5. Test sul Marketplace e Modificatori
    function test_MarkAsSold_OnlyMarketplace() public {
        // 1. Mintiamo il farmaco come producer
        vm.prank(producer);
        uint256 tokenId = drugNFT.mintDrugNFT(
            "uri", "Test", "LOT", block.timestamp, block.timestamp + 1 days
        );

        // 2. Impostiamo il marketplace come producer
        vm.prank(producer);
        drugNFT.setMarketplace(marketplace);

        // 3. Se prova lo stranger a marcare come venduto, deve fallire
        vm.prank(stranger);
        vm.expectRevert("Only marketplace");
        drugNFT.markAsSold(tokenId, buyer);

        // 4. Se lo fa il marketplace autorizzato, deve avere successo
        vm.prank(marketplace);
        drugNFT.markAsSold(tokenId, buyer);

        // Verifichiamo lo stato
        assertTrue(drugNFT.isSold(tokenId));
        DrugNFT.Drug memory drug = drugNFT.getDrug(tokenId);
        assertEq(drug.buyer, buyer);
    }
}
*/