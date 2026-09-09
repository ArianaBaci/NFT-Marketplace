import { describe, it } from "node:test";
import hre from "hardhat";
import assert from "node:assert/strict";

const { viem } = await hre.network.getOrCreate();
const now = Math.floor(Date.now() / 1000);
const publicClient = await viem.getPublicClient();
const walletClients = await viem.getWalletClients();
const producer = walletClients[0];
const other = walletClients[1];
const marketplaceDeployer = walletClients[2];
const buyer = walletClients[3]
//drugNFT as owner
const drugNFT = await viem.deployContract("DrugNFT", [
      producer.account.address,
    ]);
//drugNFT as Marketplace 
const drugNFTAsMarketplace = await viem.getContractAt("DrugNFT", drugNFT.address, {
        client: {
          wallet: marketplaceDeployer,
        },
    });
//drugNFT as other
const drugNFTAsOther = await viem.getContractAt(
        "DrugNFT",
        drugNFT.address, {
      client: {
      wallet: other,
              },
  }); 

describe("DrugNFT", async function () {

   // TEST INITZIALIZZAZIONE: verifico che l'owner del contratto sia l'account del producer e che il nome e il simbolo del token siano corretti
 
   it("dovrebbe inizializzare correttamente", async function () {

     const name = await publicClient.readContract({
        address: drugNFT.address,
        abi: drugNFT.abi,
        functionName: "name",
      });
      assert.equal(name, "DrugTraceability");
        const symbol = await publicClient.readContract({
        address: drugNFT.address,
        abi: drugNFT.abi,
        functionName: "symbol",
      });
       assert.equal(symbol, "DRUG");

   // leggo l'owner del contratto appena deployato
    const contractOwner = await publicClient.readContract({
       address: drugNFT.address,
       abi: drugNFT.abi,
       // chiamata alla funzione owner() del contratto 
       functionName: "owner",
    });
    assert.equal(
       contractOwner.toLowerCase(),
       producer.account.address.toLowerCase()
     );
   });

  // TEST MINTING: provo a fare un primo minting e vedo se si salva tutto correttamente

  it("Dovrebbe permettere al producer di mintare un farmaco", async function () {

  // Imposto le date di produzione e scadenza

  const productionDate = (BigInt(now));
  const expirationDate = (BigInt(now + 86400 * 365)); // +1 anno

  const txHash = await drugNFT.write.mintDrugNFT([
    "ipfs://test-uri",
    "Aspirina",
    "LOT123",
    productionDate,
    expirationDate,
  ]);

  const drug = await drugNFT.read.getDrug([0n]);

  //verifico dati salvati correttamente nella struct Drug

  assert.equal(drug.name, "Aspirina");
  assert.equal(drug.lotNumber, "LOT123");
  assert.equal(drug.productionDate, productionDate);
  assert.equal(drug.expirationDate, expirationDate);
  assert.equal(drug.producer.toLowerCase(), producer.account.address.toLowerCase());
});

  // TEST MINTING: verifico che un account non autorizzato non possa mintare un farmaco provando a usare "other"

it("Dovrebbe fallire se un account non autorizzato prova a mintare un farmaco", async function () {

  const productionDate = (BigInt(now));
  const expirationDate = (BigInt(now + 86400 * 365)); // +1 anno

  await assert.rejects(
    other.writeContract({
    address: drugNFT.address,
    abi: drugNFT.abi,
    functionName: "mintDrugNFT",
    args: [
          "ipfs://test-uri",
          "Aspirina",
          "LOT123",
          productionDate,
          expirationDate,
        ],
      })
    );
  });

 // TEST MINTING: verifico che un farmaco non possa essere mintato con date non valide

it("Dovrebbe fallire se le date non sono valide", async function () {
    
  // expirationDate < productionDate
    await assert.rejects(
      producer.writeContract({
        address: drugNFT.address,
        abi: drugNFT.abi,
        functionName: "mintDrugNFT",
        args: [
          "ipfs://test-uri",
          "Aspirina",
          "LOT123",
          (BigInt(now)),
          (BigInt(now)) - 10n,
        ],
      })
    );
  });

  it("Dovrebbe fallire se il farmaco è già scaduto", async function () {

    // Data di scadenza nel passato 
    await assert.rejects(
      producer.writeContract({
        address: drugNFT.address,
        abi: drugNFT.abi,
        functionName: "mintDrugNFT",
        args: [
          "ipfs://test-uri",
          "Aspirina",
          "LOT123",
          (BigInt(now))- 20n,
          (BigInt(now)) - 10n,
        ],
      })
    );
  });

  // TEST FUNZIONI CHE COINVOLGONO MARKETPLACE 

  describe("Marketplace & Vendita", function () {

    it("Dovrebbe permettere solo all'owner di impostare il marketplace", async function () {
    //provo a impostare il marketplace di riferimento del contratto drugNFT senza esserne l'owner (chiamo drugNFT da "other")
    
      assert.rejects(
        drugNFTAsOther.write.setMarketplace([marketplaceDeployer.account.address])
      ); 
    });

    it("Dovrebbe permettere solo al marketplace di marcare un prodotto come venduto", async function () {
      // Minto un farmaco
      await drugNFT.write.mintDrugNFT(["uri", "Test", "LOT", (BigInt(now)), (BigInt(now)) + 100000000n]);
      // Imposto il marketplace di riferimento (chiamando stavolta setMarketplace con l'account proprietario del contratto)
      await drugNFT.write.setMarketplace([marketplaceDeployer.account.address]);
      //provo a usare markAsSold da other aspettandomi reject
      await assert.rejects(  drugNFTAsOther.write.markAsSold([0n, buyer.account.address]));
      //provo a usare markAsSold con il marketplace abilitato
      await drugNFTAsMarketplace.write.markAsSold([0n, buyer.account.address]);
      //verifico che la venduta sia riuscita
      const isDrugSold = await drugNFT.read.isSold([0n]);
      assert.equal(isDrugSold, true);

    });
    
    it("dovrebbe permettere al marketplace di marcare un prodotto come in vendita", async function () {
      // Minting
      await drugNFT.write.mintDrugNFT(["uri", "Test", "LOT", (BigInt(now)), (BigInt(now)) + 100000000n]);
      // Impostiamo l'indirizzo del marketplace
      await drugNFT.write.setMarketplace([marketplaceDeployer.account.address]);
      //recupero l'id del prodotto appena mintato
      const lastTokenId = await drugNFT.read.lastTokenId();
      await drugNFTAsMarketplace.write.markAsForSale([lastTokenId, true]);
      const isDrugForSale = await drugNFT.read.isForSale([lastTokenId]);
      assert.equal(isDrugForSale, true);
    });
  });
});
