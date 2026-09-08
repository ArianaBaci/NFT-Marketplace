import { describe, it } from "node:test";
import hre from "hardhat";
import assert from "node:assert/strict";

describe("DrugMarketplace", function () {
const now = BigInt(Math.floor(Date.now() / 1000));
  // Definizione unica della fixture che si occupa di tutto il setup
  async function deployMarketplaceFixture() {
    const { viem, networkHelpers } = await hre.network.getOrCreate();
    const walletClients = await viem.getWalletClients();

    const producer = walletClients[0];
    const other = walletClients[1];
    const marketplaceDeployer = walletClients[2];
    const buyer = walletClients[3];


    // Deploy di DrugNFT
    const drugNFT = await viem.deployContract("DrugNFT", [producer.account.address], {
      client: {
        wallet: producer,
      },
    });

    // Deploy di DrugMarketplace
    const drugMarketplace = await viem.deployContract("DrugMarketplace", [], {
      client: {
        wallet: marketplaceDeployer,
      },
    });

    // Impostazione dei riferimenti incrociati
    await drugMarketplace.write.setDrugNFT([drugNFT.address]);
    await drugNFT.write.setMarketplace([drugMarketplace.address]);

    return {
      producer,
      other,
      marketplaceDeployer,
      buyer,
      drugNFT,
      drugMarketplace,
      networkHelpers,
      viem,
    };
  }
  async function nextFixiture(){
     const {viem, buyer, drugNFT, producer, drugMarketplace } =
    await deployMarketplaceFixture();

   //creo un nuovo oggetto NFT
    await drugNFT.write.mintDrugNFT([
    "uri",
    "Test",
    "LOT-001",
    now,
    now + 10_000_000n,]);

    //estraggo il tokenID
    var tokenID=await drugNFT.read.lastTokenId();

    const marketplaceAsDrugOwner = await viem.getContractAt(
      "DrugMarketplace",
      drugMarketplace.address,
      {
        client: {
          wallet: producer,
        },
      },
    );
    const marketplaceAsDrugBuyer = await viem.getContractAt(
        "DrugMarketplace",
        drugMarketplace.address,
        {
            client: {
                wallet: buyer,
            },
        },
    );
    return {
      marketplaceAsDrugBuyer,
      marketplaceAsDrugOwner,
      tokenID,
    };
  }

  // TEST setDrugNFT e unSetDrugNFT

  it("Dovrebbe permettere solo all'owner di definire il contratto di drugNFT di riferimento", async function () {
    const {viem, buyer, drugNFT, drugMarketplace } =
      await deployMarketplaceFixture();

    const marketplaceAsBuyer = await viem.getContractAt(
      "DrugMarketplace",
      drugMarketplace.address,
      {
        client: {
          wallet: buyer,
        },
      },
    );

    // Buyer: fallisce perché non è owner
    await assert.rejects(
      () => marketplaceAsBuyer.write.setDrugNFT([drugNFT.address]),
     "Account non autorizzato",
    );
    await assert.rejects(marketplaceAsBuyer.write.unSetDrugNFT(), "Account non autorizzato");

    await drugMarketplace.write.setDrugNFT([drugNFT.address]);
// Controlla che le variabili di stato siano state aggiornate correttamente
  var updatedNFT = await drugMarketplace.read.drugNFT();
 assert.equal(
    updatedNFT.toLowerCase(),
    drugNFT.address.toLowerCase(),
    "L'indirizzo di drugProducerAddress non corrisponde"
  );
  await drugMarketplace.write.unSetDrugNFT();
  updatedNFT = await drugMarketplace.read.drugNFT();
   assert.equal(
    updatedNFT.toLowerCase(),
    "0x0000000000000000000000000000000000000000",
    "L'indirizzo non è stato reimpostato correttamente"
  );
});

// TEST listDrug

  it("Dovrebbe permettere solo al proprietario del farmaco di creare un annuncio", async function () {

    const {viem, other, drugNFT, producer, drugMarketplace } =
    await deployMarketplaceFixture();

    //creo un oggetto drugNFT
    await drugNFT.write.mintDrugNFT([
    "uri",
    "Test",
    "LOT-001",
    now,
    now + 10_000_000n,]);

    const marketplaceAsother = await viem.getContractAt(
      "DrugMarketplace",
      drugMarketplace.address,
      {
        client: {
          wallet: other,
        },
      },
    );
    const marketplaceAsDrugOwner = await viem.getContractAt(
      "DrugMarketplace",
      drugMarketplace.address,
      {
        client: {
          wallet: producer,
        },
      },
    );
    var tokenID=await drugNFT.read.lastTokenId();

    //verifico che un wallet diverso da quello del proprietario non possa caricare annunci

    await assert.rejects(
    async () => {
    await marketplaceAsother.write.listDrug([tokenID, 40n]);
     },
    "Account non autorizzato: solo il proprietario del farmaco può caricare un annuncio relativo"
    );    

});

// TEST buyDrug

 it("non dovrebbe permettere la vendita di prodotti con annuncio non attivo",async function () {
 //chiamo la fixiture
 const {viem, buyer, drugNFT, producer, drugMarketplace } =
    await deployMarketplaceFixture();

   //creo un nuovo oggetto NFT
    await drugNFT.write.mintDrugNFT([
    "uri",
    "Test",
    "LOT-001",
    now,
    now + 10_000_000n,]);

    //estraggo il tokenID
    var tokenID=await drugNFT.read.lastTokenId();

    const marketplaceAsDrugOwner = await viem.getContractAt(
      "DrugMarketplace",
      drugMarketplace.address,
      {
        client: {
          wallet: producer,
        },
      },
    );
    const marketplaceAsDrugBuyer = await viem.getContractAt(
        "DrugMarketplace",
        drugMarketplace.address,
        {
            client: {
                wallet: buyer,
            },
        },
    );

    //carico annuncio (usando come wallet il produttore del farmaco)
    await marketplaceAsDrugOwner.write.listDrug([tokenID,4n])

    //rendo l'annuncio inattivo
    await marketplaceAsDrugOwner.write.cancelListing([tokenID]);

    //provo ad acquistare il farmaco 
    await assert.rejects(marketplaceAsDrugBuyer.write.buyDrug([tokenID]), "Prodotto non disponibile");

});

 it("non dovrebbe permettere a chi ha messo in vendita un prodotto di acquistarlo",async function () {
 //chiamo le fixiture
 const {viem, buyer, drugNFT, producer, drugMarketplace } =
    await deployMarketplaceFixture();
const {marketplaceAsDrugOwner, marketplaceAsDrugBuyer, tokenID}=
    await nextFixiture();
//creo l'annuncio
await marketplaceAsDrugOwner.write.listDrug([tokenID,4n])
//provo a comprare usando il contratto drug owner
await assert.rejects(marketplaceAsDrugOwner.write.buyDrug([tokenID]), "Sei già proprietario di questo prodotto: impossibile acquistare");
 });

 it("non dovrebbe permettere l'acquisto di un prodotto senza i fondi necessari a disposizione, scaduto oppure già venduto", async function(){
//chiamo le fixiture
 const {viem, networkHelpers, buyer, drugNFT, producer, drugMarketplace } =
    await deployMarketplaceFixture();
const {marketplaceAsDrugOwner, marketplaceAsDrugBuyer, tokenID}=
    await nextFixiture();
//creo l'annuncio
var listingPrice=4n
await marketplaceAsDrugOwner.write.listDrug([tokenID,listingPrice]);
await assert.rejects ( marketplaceAsDrugBuyer.write.buyDrug([tokenID], {
    value:2n,
}), "Fondi insufficienti");
//creo un nuovo oggetto NFT con scadenza breve
    await drugNFT.write.mintDrugNFT([
    "uri",
    "Test",
    "LOT-001",
    now,
    now + 100n,]);
var shortExpiringTokenId= await drugNFT.read.lastTokenId();
//creo l'annuncio di riferimento
await marketplaceAsDrugOwner.write.listDrug([shortExpiringTokenId,listingPrice]);
await networkHelpers.time.increase(150);
   await assert.rejects ( marketplaceAsDrugBuyer.write.buyDrug([shortExpiringTokenId],{
    value:20n,
   }), "Prodotto scaduto, impossibile procedere con l'acquisto")
});
});
