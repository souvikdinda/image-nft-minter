import { expect } from "chai";
import { ethers } from "hardhat";
import { NFTCollection } from "../typechain-types";

describe("NFTCollection", function () {
  let nftCollection: NFTCollection;

  before(async () => {
    const NFTCollectionFactory = await ethers.getContractFactory("NFTCollection");
    nftCollection = (await NFTCollectionFactory.deploy("MyNFT", "MNFT")) as NFTCollection;
    await nftCollection.deploymentTransaction()?.wait();
  });

  describe("Deployment", function () {
    it("Should deploy with the correct name and symbol", async function () {
      expect(await nftCollection.name()).to.equal("MyNFT");
      expect(await nftCollection.symbol()).to.equal("MNFT");
    });

    it("Should have zero total minted tokens initially", async function () {
      expect(await nftCollection.totalMinted()).to.equal(0);
    });
  });
});
