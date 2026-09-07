
/*
È un plugin che fornisce un insieme di funzionalità per interagire con la rete blockchain locale.
https://hardhat.org/docs/plugins/hardhat-network-helpers
 Funzioni relative al mining dei blocchi: mine(), mineUpTo()
 Funzioni per la manipolazione degli account: getStorageAt(), impersonateAccount(), setBalance(), setCode(), setNonce(),
setStorageAt(), stopImpersonatingAccount().
 Funzioni per gestire degli snapshot dello stato della blockchain: takeSnapshot(), clearSnapshots().
 Funzioni per la gestione di Fixtures: loadFixture() → vedremo in seguito.
 Funzione per la manipolazione dei blocchi: dropTransaction(), setBlockGasLimit(), setCoinbase(),
setNextBlockBaseFeePerGas(), setPrevRandao().
 Funzioni per la gestione del tempo: increase(), increaseTo(), latest(), latestBlock(), setNextBlockTimestamp().
 Funzioni per la conversione delle durate: years(), weeks(), days(), hours(), minutes(), seconds(), millis().

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";


const { viem, networkHelpers } = await network.connect();

describe("DrugNFT", function () {
  async function deployDrugNFTFixture() {
    const { viem } = await network.connect();

    const [producer, marketplace, buyer, stranger] =
      await viem.getWalletClients();

    const drugNFT = await viem.deployContract("DrugNFT", [
      producer.account.address,
    ]);

    return { viem, producer, marketplace, buyer, stranger, drugNFT };
  }
  /* 

  it("il producer può mintare un farmaco valido", async function () {
    const { producer, drugNFT } = await deployDrugNFTFixture();

    const now = BigInt(Math.floor(Date.now() / 1000));
    const productionDate = now;
    const expirationDate = now + 365n * 24n * 60n * 60n;

    await drugNFT.write.mintDrugNFT(
      [
        "ipfs://metadata/0",
        "Aspirina",
        "LOT-2026-001",
        productionDate,
        expirationDate,
      ],
      { account: producer.account }
    );

    expect(await drugNFT.read.ownerOf([0n]))
      .to.equal(producer.account.address);

    const drug = await drugNFT.read.getDrug([0n]);

    expect(drug.name).to.equal("Aspirina");
    expect(drug.lotNumber).to.equal("LOT-2026-001");
    expect(drug.producer).to.equal(producer.account.address);
    expect(drug.forSale).to.equal(false);
    expect(drug.sold).to.equal(false);
    expect(drug.buyer).to.equal("0x0000000000000000000000000000000000000000");
  });

  it("rifiuta il mint da un indirizzo che non è il producer", async function () {
    const { stranger, drugNFT } = await deployDrugNFTFixture();

    const now = BigInt(Math.floor(Date.now() / 1000));

    await expect(
      drugNFT.write.mintDrugNFT(
        [
          "ipfs://metadata/0",
          "Aspirina",
          "LOT-2026-001",
          now,
          now + 365n * 24n * 60n * 60n,
        ],
        { account: stranger.account }
      )
    ).to.be.rejected;
  });
}); 




//questo è del 5 settembre
//import { expect } from "chai";
//import { network } from "hardhat";
//mport { time } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";

import { describe, it } from "node:test";
import hre from "hardhat";

const { viem, networkHelpers } = await hre.network.getOrCreate();

describe("DrugNFT", function () {

  // Helper per fare il deploy del contratto prima di ogni test o set di test
  
  /*async function deployDrugNFTFixture() {
    const [producer, marketplace, buyer, otherAccount] = await hre.viem.getWalletClients();

    const drugNFT = await hre.deployContract("DrugNFT", [producer.account.address]);

    const publicClient = await hre.viem.getPublicClient();

    return {
      drugNFT,
      producer,
      marketplace,
      buyer,
      otherAccount,
      publicClient,
    };
  }



  describe("Deployment", function () {
    it("Dovrebbe impostare il corretto owner (producer)", async function () {
      const { drugNFT, producer } = await viem.deployContract("DrugNFT");
        walletClient: producer,
      });
      expect((await drugNFT.read.owner()).toLowerCase()).to.equal(producer.account.address.toLowerCase());
    });
  });

  describe("Minting", function () {
    it("Dovrebbe permettere all'owner di mintare un farmaco", async function () {
      const { drugNFT, producer, publicClient } = await deployDrugNFTFixture();
      
      const now = BigInt(await time.latest());
      const productionDate = now;
      const expirationDate = now + 86400n; // +1 giorno

      // Eseguiamo il mint
      const tx = await drugNFT.write.mintDrugNFT([
        "ipfs://test-uri",
        "Aspirina",
        "LOT123",
        productionDate,
        expirationDate
      ]);
      
      // Verifichiamo che il farmaco sia stato inserito correttamente nella struct
      const drug = await drugNFT.read.getDrug([0n]);
      expect(drug.name).to.equal("Aspirina");
      expect(drug.lotNumber).to.equal("LOT123");
      expect(drug.producer.toLowerCase()).to.equal(producer.account.address.toLowerCase());
    });

    it("Dovrebbe fallire se le date non sono valide", async function () {
      const { drugNFT } = await deployDrugNFTFixture();
      const now = BigInt(await time.latest());

      // expirationDate < productionDate
      await expect(
        drugNFT.write.mintDrugNFT(["uri", "Test", "LOT", now, now - 10n])
      ).to.be.rejectedWith("Invalid dates");
    });

    it("Dovrebbe fallire se il farmaco è già scaduto", async function () {
      const { drugNFT } = await deployDrugNFTFixture();
      const now = BigInt(await time.latest());

      // Data di scadenza nel passato rispetto a block.timestamp
      await expect(
        drugNFT.write.mintDrugNFT(["uri", "Test", "LOT", now - 20n, now - 10n])
      ).to.be.rejectedWith("Drug already expired");
    });
  });

  describe("Marketplace & Vendita", function () {
    it("Dovrebbe permettere solo all'owner di impostare il marketplace", async function () {
      const { drugNFT, marketplace, otherAccount } = await deployDrugNFTFixture();

      // Altro account prova a impostare il marketplace e fallisce
      const drugNFTAsOther = await hre.viem.getContractAt("DrugNFT", drugNFT.address, {
        walletClient: otherAccount,
      });
      await expect(
        drugNFTAsOther.write.setMarketplace([marketplace.account.address])
      ).to.be.rejected; // Fallisce per OwnableUnauthorizedAccount
    });

    it("Dovrebbe permettere solo al marketplace di marcare come venduto", async function () {
      const { drugNFT, marketplace, buyer } = await deployDrugNFTFixture();
      const now = BigInt(await time.latest());

      // Mintiamo prima un farmaco
      await drugNFT.write.mintDrugNFT(["uri", "Test", "LOT", now, now + 100n]);

      // Impostiamo l'indirizzo del marketplace
      await drugNFT.write.setMarketplace([marketplace.account.address]);

      // Connettiamoci come marketplace per chiamare markAsSold
      const drugNFTAsMarketplace = await hre.viem.getContractAt("DrugNFT", drugNFT.address, {
        walletClient: marketplace,
      });

      await drugNFTAsMarketplace.write.markAsSold([0n, buyer.account.address]);

      const isDrugSold = await drugNFT.read.isSold([0n]);
      expect(isDrugSold).to.be.true;
    });
  });
});


*/