// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {DrugNFT} from "../contracts/DrugNFT.sol";

contract DrugNFTTest is Test {
    DrugNFT public drugNFT;
    
    // indirizzi fittizi per i test
    address public producer = address(0x1111);
    address public marketplace = address(0x2222);
    address public buyer = address(0x3333);
    address public stranger = address(0x4444);

    // Eseguito prima di ogni singolo test
    function setUp() public {
        // Viene eseguito il deploy impostando il "producer" come owner
        drugNFT = new DrugNFT(producer);
    }

    // Test sul Minting (Successo)
    function test_MintDrugNFT_Success() public {
        // vm.prank indica a Foundry che la PROSSIMA chiamata sarà fatta dal producer
        vm.prank(producer);
        // metto scadenza 24h
        uint256 productionDate = block.timestamp;
        uint256 expirationDate = block.timestamp + 1 days;

        uint256 tokenId = drugNFT.mintDrugNFT(
            "ipfs://drug-uri",
            "Aspirina",
            "LOT-999",
            productionDate,
            expirationDate
        );

        assertEq(tokenId, 0);
        
        // Verifico che il contenuto della struct sia quello che mi aspetto
        DrugNFT.Drug memory drug = drugNFT.getDrug(0);
        assertEq(drug.name, "Aspirina");
        assertEq(drug.lotNumber, "LOT-999");
        assertEq(drug.producer, producer);
        assertEq(drug.sold, false);
    }

    // Test sul Controllo Scadenza
    function test_IsExpired() public {
        vm.prank(producer);
        uint256 tokenId = drugNFT.mintDrugNFT(
            "uri", "Test", "LOT", block.timestamp, block.timestamp + 100
        );

        // simulo avanzare del tempo in modo da far scadere il farmaco
        vm.warp(block.timestamp + 101);

        // Verifico che risulti expired
        assertTrue(drugNFT.isExpired(tokenId));
    }
}
