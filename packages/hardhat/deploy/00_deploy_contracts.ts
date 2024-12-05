import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { tenderly } from "hardhat";

const deployNFTCollection: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log(`🚀 Deploying contracts with deployer: ${deployer}`);

  try {
    console.log("📦 Deploying NFTCollectionRegistry...");
    const registryDeployment = await deploy("NFTCollectionRegistry", {
      from: deployer,
      args: [], // No constructor arguments
      log: true,
      autoMine: true,
    });
    console.log(`✅ NFTCollectionRegistry deployed at address: ${registryDeployment.address}`);

    console.log("📦 Deploying NFTAuction...");
    const feeRecipient = deployer; // Replace with the fee recipient address
    const feePercent = 250; // 2.5% fee
    const auctionDeployment = await deploy("NFTAuction", {
      from: deployer,
      args: [feeRecipient, feePercent],
      log: true,
      autoMine: true,
    });
    console.log(`✅ NFTAuction deployed at address: ${auctionDeployment.address}`);

    console.log("📦 Deploying NFTCollection...");
    const nftCollectionDeployment = await deploy("NFTCollection", {
      from: deployer,
      args: ["MyNFTCollection", "MNFT"],
      log: true,
      autoMine: true,
    });
    console.log(`✅ NFTCollection deployed at address: ${nftCollectionDeployment.address}`);

    console.log("🔍 Verifying contracts on Tenderly...");

    console.log("🔍 Verifying NFTCollectionRegistry...");
    if (!registryDeployment.transactionHash) {
      throw new Error("Transaction hash is undefined. Deployment might have failed.");
    }
    const registryReceipt = await ethers.provider.getTransactionReceipt(registryDeployment.transactionHash);
    await tenderly.verify({
      name: "NFTCollectionRegistry",
      address: registryDeployment.address,
      network: "virtual_sepolia",
    });

    console.log("🔍 Verifying NFTAuction...");
    if (!auctionDeployment.transactionHash) {
      throw new Error("Transaction hash is undefined. Deployment might have failed.");
    }
    const auctionReceipt = await ethers.provider.getTransactionReceipt(auctionDeployment.transactionHash);
    await tenderly.verify({
      name: "NFTAuction",
      address: auctionDeployment.address,
      network: "virtual_sepolia",
    });

    console.log("🔍 Verifying NFTCollection...");
    if (!nftCollectionDeployment.transactionHash) {
      throw new Error("Transaction hash is undefined. Deployment might have failed.");
    }
    const receipt = await ethers.provider.getTransactionReceipt(nftCollectionDeployment.transactionHash);
    await tenderly.verify({
      name: "NFTCollection",
      address: nftCollectionDeployment.address,
      network: "virtual_sepolia",
    });

    console.log("✅ Contracts verified successfully!");
    console.log("🏁 Deployment finished.");
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }

  console.log("🏁 Deployment finished.");
};

export default deployNFTCollection;
deployNFTCollection.tags = ["NFTCollection"];
