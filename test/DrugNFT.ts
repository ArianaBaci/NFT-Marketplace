import { describe, it } from "node:test";
import hre from "hardhat";
import { network } from "hardhat";
import assert from "node:assert/strict";

const { viem, networkHelpers } = await hre.network.getOrCreate();

describe("DrugNFT", async function () {
  const now = BigInt(Math.floor(Date.now() / 1000));

  const { viem } = await network.create();

  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();

  const producer = walletClients[0];
  const other = walletClients[1];
  const marketplace = walletClients[2];
   const buyer = walletClients[3];
  //const newOwner = walletClients[3];

  async function deployDrugNFT() {

    //deploy contract prende come argomento il nome del contratto e un array di argomenti per il costruttore (in questo caso l'indirizzo del producer)
  
    const drugNFT = await viem.deployContract("DrugNFT", [
      producer.account.address,
    ]);

    return drugNFT;
  }

  const drugNFT = await deployDrugNFT();
  
 // ============================================================
   // TEST INITZIALIZZAZIONE: verifico che l'owner del contratto sia l'account del producer
   // e che il nome e il simbolo del token siano corretti
   // ============================================================
 
   it("dovrebbe inizializzare correttamente", async function () {

   // faccio il deploy del contratto

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

  // ============================================================
  // TEST MINTING
  // ============================================================


it("Dovrebbe permettere al producer di mintare un farmaco", async function () {

    // Impostiamo le date di produzione e scadenza
      const now = Math.floor(Date.now() / 1000);
      const productionDate = (BigInt(now));
      const expirationDate = (BigInt(now + 86400 * 365)); // +1 anno

  const txHash = await drugNFT.write.mintDrugNFT([
    "ipfs://test-uri",
    "Aspirina",
    "LOT123",
    productionDate,
    expirationDate,
  ]);

  // Assicura che la transazione sia stata eseguita prima della lettura

  await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });

  const drug = await drugNFT.read.getDrug([0n]);

  //verifico dati salvati correttamente nella struct Drug

  assert.equal(drug.name, "Aspirina");
  assert.equal(drug.lotNumber, "LOT123");
  assert.equal(drug.productionDate, productionDate);
  assert.equal(drug.expirationDate, expirationDate);
  assert.equal(drug.producer.toLowerCase(), producer.account.address.toLowerCase());
});

  //verifico che un account non autorizzato non possa mintare un farmaco
it("Dovrebbe fallire se un account non autorizzato prova a mintare un farmaco", async function () {

    // Impostiamo le date di produzione e scadenza
      const now = Math.floor(Date.now() / 1000);
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

  //verifico che un farmaco non possa essere mintato con date non valide
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
          now,
          now - 10n,
        ],
      })
    );
  });

  it("Dovrebbe fallire se il farmaco è già scaduto", async function () {

    // Data di scadenza nel passato rispetto a block.timestamp
    await assert.rejects(
      producer.writeContract({
        address: drugNFT.address,
        abi: drugNFT.abi,
        functionName: "mintDrugNFT",
        args: [
          "ipfs://test-uri",
          "Aspirina",
          "LOT123",
          now - 20n,
          now - 10n,
        ],
      })
    );
  });

  describe("Marketplace & Vendita", function () {
    it("Dovrebbe permettere solo all'owner di impostare il marketplace", async function () {
      const drugNFTAsOther = await viem.getContractAt(
        "DrugNFT",
  drugNFT.address,
  {
    client: {
      wallet: other,
    },
  }); 
      assert.rejects(
        drugNFTAsOther.write.setMarketplace([marketplace.account.address])
      ); // Fallisce per OwnableUnauthorizedAccount
    });

    it("Dovrebbe permettere solo al marketplace di marcare come venduto", async function () {
      // Mintiamo prima un farmaco
      await drugNFT.write.mintDrugNFT(["uri", "Test", "LOT", now, now + 100n]);

      // Impostiamo l'indirizzo del marketplace
      await drugNFT.write.setMarketplace([marketplace.account.address]);

      // Connettiamoci come marketplace per chiamare markAsSold
      const drugNFTAsMarketplace = await viem.getContractAt("DrugNFT", drugNFT.address, {
        client: {
          wallet: marketplace,
        },
      });

      await drugNFTAsMarketplace.write.markAsSold([0n, buyer.account.address]);

      const isDrugSold = await drugNFT.read.isSold([0n]);
      assert.equal(isDrugSold, true);

    });
    
    it("dovrebbe permettere al marketplace di mettere in vendita un farmaco non venduto", async function () {
      // Mintiamo prima un farmaco
      await drugNFT.write.mintDrugNFT(["uri", "Test", "LOT", now, now + 100n]);

      // Impostiamo l'indirizzo del marketplace
      await drugNFT.write.setMarketplace([marketplace.account.address]);

      // Connettiamoci come marketplace per chiamare markAsForSale
      const drugNFTAsMarketplace = await viem.getContractAt("DrugNFT", drugNFT.address, {
        client: {
          wallet: marketplace,
        },
      });
      const lastTokenId = await drugNFT.read.lastTokenId();
      await drugNFTAsMarketplace.write.markAsForSale([lastTokenId, true]);

      const isDrugForSale = await drugNFT.read.isForSale([lastTokenId]);
      assert.equal(isDrugForSale, true);

    });
    
it("Dovrebbe fallire se il marketplace prova a vendere due volte lo stesso farmaco", async function () {

  const expirationDate = now + 365n * 24n * 60n * 60n;
  const drugNFT1 = await deployDrugNFT();

  // Il producer minta il token con ID 40.
  await drugNFT1.write.mintDrugNFT([
    "ipfs://test-uri",
    "Aspirina",
    "LOT123",
    now,
    expirationDate,
  ]);

  // Il producer autorizza il marketplace.
  await drugNFT1.write.setMarketplace([
    marketplace.account.address,
  ]);

  const drugNFTAsMarketplace = await viem.getContractAt(
    "DrugNFT",
    drugNFT1.address,
    {
      client: {
        wallet: marketplace,
      },
    }
  );

  // Prima vendita: deve riuscire.
  await drugNFTAsMarketplace.write.markAsSold([
    0n,
    buyer.account.address,
  ]);

  // Tentativo di rimettere in vendita il farmaco.
  await assert.rejects(
    drugNFTAsMarketplace.write.markAsForSale([
      0n,
      true,
    ]),
    /Drug already sold/
  );
});
  });
describe("Funzioni accessorie", function () {
  it("Dovrebbe comunicare correttamente se un farmaco è scaduto", async function () {
    // Mintiamo un farmaco che scade tra 1 secondo
    const expirationDate = now + 1n;
    await drugNFT.write.mintDrugNFT(["uri", "Test", "LOT", now, expirationDate]);
    // Attendere 2 secondi per far scadere il farmaco
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const isExpired = await drugNFT.read.isExpired([0n]);
    assert.equal(isExpired, true);
    //verificare che isExpired ritorni true
    const  lastTokenId = await drugNFT.read.lastTokenId();
    assert.equal(await drugNFT.read.isExpired([lastTokenId]), true);
  });
  
    it("Dovrebbe comunicare correttamente che un farmaco non è scaduto", async function () {
   // Mintiamo un farmaco con scadenza lontana e verifichiamo che isExpired ritorni false
   const futureExpirationDate = now + 1000000n;
    await drugNFT.write.mintDrugNFT(["uri", "Test", "LOT", now, futureExpirationDate]);
    const lastTokenId = await drugNFT.read.lastTokenId();
    assert.equal(await drugNFT.read.isExpired([lastTokenId]), false);
  });
});
});

