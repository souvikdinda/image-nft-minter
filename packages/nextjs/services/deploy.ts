import deployedContracts from "../contracts/deployedContracts";
import { ethers } from "ethers";
import { BrowserProvider } from "ethers";

export const deployNFTCollection = async (
  provider: BrowserProvider,
  name: string,
  symbol: string,
  baseURI: string,
): Promise<string> => {
  const signer = await provider.getSigner();
  const network = await provider.getNetwork();
  const networkId = network.chainId.toString();

  // Retrieve contract ABI and bytecode for the NFTCollection
  const contracts = deployedContracts as any;
  const NFTCollectionABI = contracts[networkId]?.NFTCollection.abi;
  const NFTCollectionBytecode = contracts[networkId]?.NFTCollection.bytecode;

  if (!NFTCollectionABI || !NFTCollectionBytecode) {
    throw new Error(`No NFTCollection contract found on network ${networkId}`);
  }

  try {
    // Ensure baseURI ends with a trailing slash for proper metadata construction
    const formattedBaseURI = baseURI.endsWith("/") ? baseURI : `${baseURI}/`;

    // Create a contract factory
    const NFTCollectionFactory = new ethers.ContractFactory(NFTCollectionABI, NFTCollectionBytecode, signer);

    console.log("Deploying NFT collection...");

    // Get the address of the signer to use as the initial owner
    const initialOwner = await signer.getAddress();

    // Deploy the contract with constructor arguments
    const contract = await NFTCollectionFactory.deploy(name, symbol, initialOwner, formattedBaseURI);

    console.log("Waiting for deployment transaction to be mined...");
    const txHash = contract.deploymentTransaction()?.hash;

    if (!txHash) {
      throw new Error("Deployment transaction hash not found");
    }

    // Wait for the transaction to be mined and confirmed
    const receipt = await provider.waitForTransaction(txHash, 1); // Wait for 1 confirmation

    if (!receipt) {
      throw new Error("Failed to retrieve transaction receipt");
    }

    if (!receipt.contractAddress) {
      throw new Error("Failed to get contract address from receipt");
    }

    console.log("Contract deployed at:", receipt.contractAddress);
    return receipt.contractAddress;
  } catch (error) {
    console.error("Failed to deploy NFT collection:", error);
    throw error;
  }
};
