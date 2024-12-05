"use client";

import { useState } from "react";
import deployedContracts from "../../contracts/deployedContracts";
import { useWallet } from "../../hooks/useWallet";
import { ethers } from "ethers";
import { PinataSDK } from "pinata-web3";
import { getContractStore } from "~~/services/contractStore";

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || "";
const PINATA_GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "";

export default function CreateCollection() {
  const { provider, account } = useWallet();
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [status, setStatus] = useState("");

  const pinata = new PinataSDK({ pinataJwt: PINATA_JWT, pinataGateway: PINATA_GATEWAY_URL });

  const handleDeployCollection = async () => {
    if (!provider || !name || !symbol) {
      alert("Please provide all required inputs and connect your wallet.");
      return;
    }

    setStatus("Deploying new NFT collection contract...");
    try {
      const signer = provider.getSigner();
      const network = await provider.getNetwork();
      const networkId = network.chainId.toString();
      const numericNetworkId = parseInt(networkId, 10) as keyof typeof deployedContracts;
      const contractStore = getContractStore(numericNetworkId, signer as unknown as ethers.Signer);
      const factory = contractStore.getCollectionContractFactory();
      if (!factory) {
        console.error("Failed to get collection contract factory.");
        return;
      }
      const contract = await factory.deploy(name, symbol);
      const deploymentTx = contract.deploymentTransaction();
      if (!deploymentTx) {
        throw new Error("Deployment transaction not found. Deployment might have failed.");
      }
      const receipt = await provider.getTransactionReceipt(deploymentTx.hash);
      if (receipt.status === 1) {
        console.log("✅ Contract deployed successfully at address:", contract.target);
      } else {
        console.error("❌ Deployment failed. Receipt status:", receipt?.status);
      }
      const contractAddress = receipt.contractAddress;

      console.log("Creating metadata...");
      const metadata = { name, symbol, contractAddress, createdBy: account };
      const metadataBlob = new Blob([JSON.stringify(metadata)], { type: "application/json" });
      const metadataFile = new File([metadataBlob], `${contractAddress}_metadata.json`);
      const metadataResponse = await pinata.upload.file(metadataFile);
      const metadataUrl = `ipfs://${metadataResponse.IpfsHash}`;
      console.log("Metadata uploaded to Pinata:", metadataUrl);

      const registryConract = contractStore.getRegistryContract();
      if (!registryConract) {
        console.error("Failed to get registry contract.");
        return;
      }
      const tx = await registryConract.registerCollection(contractAddress, account, name, symbol);
      const registerdCollectionReceipt = await provider.waitForTransaction(tx.hash);
      if (registerdCollectionReceipt.status === 1) {
        console.log("✅ Collection registered successfully!");
        setStatus(`Collection registered successfully at ${contractAddress}`);
      } else {
        setStatus("Collection registration failed. Please try again.");
      }
    } catch (error) {
      console.error("Error deploying contract:", error);
      setStatus("Failed to deploy contract.");
    }
  };

  return (
    <div className="flex flex-col items-center pt-10">
      <h1 className="block text-4xl font-bold">Create Your NFT Collection</h1>
      <div className="shadow-md p-8 w-full max-w-lg flex flex-col bg-base-100 rounded-3xl">
        <div className="mb-6">
          <label className="block font-semibold mb-2">Collection Name</label>
          <input
            type="text"
            placeholder="Enter Collection Name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>
        <div className="mb-6">
          <label className="block font-semibold mb-2">Symbol</label>
          <input
            type="text"
            placeholder="Enter Symbol"
            value={symbol}
            onChange={e => setSymbol(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>
        <button
          onClick={handleDeployCollection}
          disabled={!provider || status.includes("Deploying")}
          className={`w-full btn btn-primary font-bold flex items-center justify-center ${
            status.includes("Deploying") ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {status.includes("Deploying") ? (
            <>
              <svg
                className="animate-spin h-5 w-5 mr-2 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
              Deploying...
            </>
          ) : (
            "Deploy Collection"
          )}
        </button>
        {status && <p className="mt-6">{status}</p>}
      </div>
    </div>
  );
}
