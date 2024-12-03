import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { tenderly } from "hardhat";

const deployNFTCollection: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log(`🚀 Deploying NFTCollection with deployer: ${deployer}`);

  try {
    const deploymentResult = await deploy("NFTCollection", {
      from: deployer,
      args: ["MyNFTCollection", "MNFT"],
      log: false,
      autoMine: true,
    });

    if (!deploymentResult.transactionHash) {
      throw new Error("Transaction hash is undefined. Deployment might have failed.");
    }

    const receipt = await ethers.provider.getTransactionReceipt(deploymentResult.transactionHash);

    console.log(`✅ NFTCollection deployed at address: ${deploymentResult.address}`);
    console.log(`📝 NFTCollection transaction hash: ${deploymentResult.transactionHash}`);
    console.log(`📝 Transaction mined in block: ${receipt?.blockNumber}`);

    console.log("🔍 Verifying contract on Tenderly...");
    await tenderly.verify({
      name: "NFTCollection",
      address: deploymentResult.address,
      network: "virtual_sepolia",
    });
    console.log("✅ Contract verified successfully!");
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }

  console.log("🏁 Deployment finished.");
};

export default deployNFTCollection;
deployNFTCollection.tags = ["NFTCollection"];
