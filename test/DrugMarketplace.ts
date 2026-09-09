import { describe, it } from "node:test";
import hre from "hardhat";
import assert from "node:assert/strict";

describe("DrugMarketplace", async function () {
const { viem, networkHelpers } = await hre.network.getOrCreate();
const walletClients = await viem.getWalletClients();
const producer = walletClients[0];
const marketplaceDeployer = walletClients[1];
const buyer = walletClients[2];
  // Definizione unica della fixture che si occupa di tutto il setup
async function deployMarketplaceFixture() {
    // Deploy di DrugNFT
    const drugNFTAsProducer = await viem.deployContract("DrugNFT", [producer.account.address], {
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
    //marketplace usato da producer
    const marketplaceAsDrugOwner = await viem.getContractAt(
      "DrugMarketplace",
      drugMarketplace.address,
      {
        client: {
          wallet: producer,
        },
      },
    );
    //marketplace usato da buyer
    const marketplaceAsDrugBuyer = await viem.getContractAt(
        "DrugMarketplace",
        drugMarketplace.address,
        {
            client: {
                wallet: buyer,
            },
        },
    );
    // Impostazione dei riferimenti incrociati
    await drugMarketplace.write.setDrugNFT([drugNFTAsProducer.address]);
    await drugNFTAsProducer.write.setMarketplace([drugMarketplace.address]);
    return {
      drugNFTAsProducer,
      drugMarketplace,
      marketplaceAsDrugBuyer,
      marketplaceAsDrugOwner,
    };
  }
  // TEST setDrugNFT e unSetDrugNFT
  it("Dovrebbe permettere solo all'owner di definire il contratto di drugNFT di riferimento", async function () {
    const {drugNFTAsProducer, drugMarketplace, marketplaceAsDrugBuyer } =
     await networkHelpers.loadFixture(deployMarketplaceFixture);
;
    // Buyer: fallisce perché non è owner
    await assert.rejects(
      () => marketplaceAsDrugBuyer.write.setDrugNFT([drugNFTAsProducer.address]),
     "Account non autorizzato",
    );
    await assert.rejects(marketplaceAsDrugBuyer.write.unSetDrugNFT(), "Account non autorizzato");

    //riprovo a fare setDrugNFT usando l'account del marketplace
    await drugMarketplace.write.setDrugNFT([drugNFTAsProducer.address]);
    // Controlla che le variabili di stato siano state aggiornate correttamente
    var updatedNFT = await drugMarketplace.read.drugNFT();
    assert.equal(
    updatedNFT.toLowerCase(), drugNFTAsProducer.address.toLowerCase(),
    "L'indirizzo di drugProducerAddress non corrisponde"
  );
  //Provo a fare unSetDrugNFT usando l'account del marketplace
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

    const {drugNFTAsProducer, marketplaceAsDrugBuyer} =
    await networkHelpers.loadFixture(deployMarketplaceFixture);
;
    //creo un oggetto drugNFT
    const currentTime = BigInt(await networkHelpers.time.latest());
    await drugNFTAsProducer.write.mintDrugNFT([
    "uri",
    "Test",
    "LOT-001",
    currentTime,
    currentTime + 10_000_000n,]);
    const tokenID=await drugNFTAsProducer.read.lastTokenId();

    //verifico che un wallet diverso da quello del proprietario non possa caricare annunci
    await assert.rejects(
    async () => {
    await marketplaceAsDrugBuyer.write.listDrug([tokenID, 40n]);
     },
    "Account non autorizzato: solo il proprietario del farmaco può caricare un annuncio relativo"
    );    
});

// TEST buyDrug

 it("non dovrebbe permettere la vendita di prodotti con annuncio non attivo",async function () {
 //chiamo la fixiture
 const {marketplaceAsDrugOwner, marketplaceAsDrugBuyer,drugNFTAsProducer} =
    await networkHelpers.loadFixture(deployMarketplaceFixture);

    const currentTime = BigInt(await networkHelpers.time.latest());
   //creo un nuovo oggetto NFT
    await drugNFTAsProducer.write.mintDrugNFT([
    "uri",
    "Test",
    "LOT-001",
    currentTime,
    currentTime + 10_000_000n,]);
    var tokenID=await drugNFTAsProducer.read.lastTokenId();

    //carico annuncio (usando come wallet il produttore del farmaco)
    await marketplaceAsDrugOwner.write.listDrug([tokenID,4n])

    //rendo l'annuncio inattivo
    await marketplaceAsDrugOwner.write.cancelListing([tokenID]);

    //provo ad acquistare il farmaco 
    await assert.rejects(marketplaceAsDrugBuyer.write.buyDrug([tokenID]), "Prodotto non disponibile");

});

 it("non dovrebbe permettere a chi ha messo in vendita un prodotto di acquistarlo",async function () {
 //chiamo le fixiture
 const {drugNFTAsProducer, marketplaceAsDrugOwner} =
    await networkHelpers.loadFixture(deployMarketplaceFixture);
    const currentTime = BigInt(await networkHelpers.time.latest());
    await drugNFTAsProducer.write.mintDrugNFT([
    "uri",
    "Test",
    "LOT-001",
    currentTime,
    currentTime + 10_000_000n,]);
    var tokenID=await drugNFTAsProducer.read.lastTokenId();
//provo a comprare usando il contratto drug owner
await assert.rejects(marketplaceAsDrugOwner.write.buyDrug([tokenID]), "Sei già proprietario di questo prodotto: impossibile acquistare");
 });

it("non dovrebbe permettere l'acquisto di un prodotto senza i fondi necessari a disposizione, scaduto oppure già venduto", async function(){
//chiamo la fixiture
const {marketplaceAsDrugBuyer,drugNFTAsProducer, marketplaceAsDrugOwner} = 
await networkHelpers.loadFixture(deployMarketplaceFixture);
const currentTime = BigInt(await networkHelpers.time.latest());
await drugNFTAsProducer.write.mintDrugNFT([
    "uri",
    "Test",
    "LOT-001",
    currentTime,
    currentTime + 10_000_000n,]);
    var tokenID=await drugNFTAsProducer.read.lastTokenId();
await assert.rejects ( marketplaceAsDrugBuyer.write.buyDrug([tokenID], {
    value:2n,
}), "Fondi insufficienti");
//creo un nuovo oggetto NFT con scadenza breve
await drugNFTAsProducer.write.mintDrugNFT([
    "uri",
    "Test",
    "LOT-001",
    currentTime,
    currentTime + 50n,]);
var shortExpiringTokenId= await drugNFTAsProducer.read.lastTokenId();
//creo l'annuncio di riferimento
await marketplaceAsDrugOwner.write.listDrug([shortExpiringTokenId,300n]);
await networkHelpers.time.increase(100);
   await assert.rejects ( marketplaceAsDrugBuyer.write.buyDrug([shortExpiringTokenId],{
    value:20n,
   }));
});
//test vendita che va a buon fine
 it("dovrebbe permettere l'acquisto di un prodotto nei casi validi", async function(){
//chiamo le fixiture
 const {drugNFTAsProducer, marketplaceAsDrugOwner, marketplaceAsDrugBuyer} =
await networkHelpers.loadFixture(deployMarketplaceFixture);
const currentTime = BigInt(await networkHelpers.time.latest());
await drugNFTAsProducer.write.mintDrugNFT([
    "uri",
    "Test",
    "LOT-001",
    currentTime,
    currentTime + 50n,]);
var new_tokenID= await drugNFTAsProducer.read.lastTokenId();
await marketplaceAsDrugOwner.write.listDrug([new_tokenID,2n]);
await marketplaceAsDrugBuyer.write.buyDrug([new_tokenID], {
    value:20n,
});
const isSold = await drugNFTAsProducer.read.isSold([new_tokenID]);
assert.equal(true, isSold);
 });

 //test funzioni accessorie

 // updatePrice

  it("dovrebbe permettere solo al proprietario di modificare il prezzo", async function(){
    const {marketplaceAsDrugOwner, drugNFTAsProducer, drugMarketplace } =
    await networkHelpers.loadFixture(deployMarketplaceFixture);
    //minto un nuovo prodotto
    const currentTime = BigInt(await networkHelpers.time.latest());
    await drugNFTAsProducer.write.mintDrugNFT([
    "uri",
    "Test",
    "LOT-001",
    currentTime,
    currentTime + 50n,]);
    var new_tokenID= await drugNFTAsProducer.read.lastTokenId();
    //creo l'annuncio con impostando come prezzo 2n
    await marketplaceAsDrugOwner.write.listDrug([new_tokenID,2n])
    const newPrice=20n;
    //aggiorno il prezzo usando la funzione update price
    await marketplaceAsDrugOwner.write.updatePrice([new_tokenID, newPrice]);
    //verifico che il prezzo ora coincida con newPrice
    const actualPrice = await drugMarketplace.read.getPrice([new_tokenID]);
    await assert.equal(actualPrice, newPrice);
});

//funzioni accessorie getListing, getSeller, getPrice
it("dovrebbe ritornare correttamente i valori degli annunci", async function(){
   const {marketplaceAsDrugOwner, drugNFTAsProducer, drugMarketplace } =
    await networkHelpers.loadFixture(deployMarketplaceFixture);
  const listingPrice = 10n;
  const currentTime = BigInt(await networkHelpers.time.latest());
    await drugNFTAsProducer.write.mintDrugNFT([
    "uri",
    "aspirina",
    "LOT-001",
    currentTime,
    currentTime + 50n,]);
    const tokenID= await drugNFTAsProducer.read.lastTokenId();
    await marketplaceAsDrugOwner.write.listDrug([tokenID,listingPrice])
  const price = await drugMarketplace.read.getPrice([tokenID]);
  await assert.equal(price, listingPrice);
  const seller = await drugMarketplace.read.getSeller([tokenID]);
  await assert.equal(producer.account.address.toLocaleLowerCase(), seller.toLowerCase());
  const [address, drugName, price_ , isActive] = await drugMarketplace.read.getListing([tokenID]);
  await assert.equal(drugName.toLocaleLowerCase(), "aspirina");
  await assert.equal(isActive,true);
});
});
