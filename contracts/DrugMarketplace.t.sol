// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {DrugNFT} from "../contracts/DrugNFT.sol";
import {DrugMarketplace} from "../contracts/DrugMarketplace.sol";

contract DrugNFTTest is Test {
    DrugNFT public drugNFT;
    DrugMarketplace public marketplace;

    // Indirizzi fittizi per i test
    address public producer = address(0x1111);
    address public buyer = address(0x3333);
    address public stranger = address(0x4444);

    function setUp() public {
        // DrugNFT con 'producer' come owner
        drugNFT = new DrugNFT(producer);
        // deploy del contratto DrugMarketplace
        marketplace = new DrugMarketplace();
        // Riferimenti incrociati tra i due contratti
        vm.prank(producer);
        drugNFT.setMarketplace(address(marketplace));
        marketplace.setDrugNFT(address(drugNFT));
    }

    function testVendita() public {
        uint256 price = 100 wei;

        //simulo minting
        vm.startPrank(producer);
        
        drugNFT.mintDrugNFT(
            "uri",
            "Paracetamolo",
            "LOT-002",
            block.timestamp,
            block.timestamp + 1000
        );
        uint256 tokenId = drugNFT.lastTokenId();

        // creo annuncio
        marketplace.listDrug(tokenId, price);
        
        vm.stopPrank();

        // Do dei fondi al buyer per poter acquistare
        vm.deal(buyer, 1 ether);

        vm.startPrank(buyer);
        marketplace.buyDrug{value: price}(tokenId);
        vm.stopPrank();

        // verifico che se estraggo l'owner del token acquistatp ottengo il buyer
        assertEq(drugNFT.ownerOf(tokenId), buyer, "Proprieta NFT non trasferita al compratore");

        // Verifico che l'annuncio di cui è stato appena effettuato l'acquisto non sia più attivo (e gli altri dati estratti da getListing)
        (address seller, string memory drugName, uint256 listingPrice, bool isActive) = marketplace.getListing(tokenId);
        assertEq(seller, address(producer));
        assertEq(drugName, "Paracetamolo");
        assertEq(listingPrice, price);
        assertFalse(isActive);        

        // IVerifico che il flag isForSale sull'NFT sia stato azzerato
        assertTrue(!drugNFT.isForSale(tokenId), "Il flag isForSale deve essere false");
    }
}