"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "../../hooks/useWallet";
import { PinataSDK } from "pinata-web3";
import deployedContracts from "../../contracts/deployedContracts";

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT!;
const PINATA_GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL!;

export default function CreateCollection() {
  const { provider, connectWallet, account } = useWallet();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");

  const pinata = new PinataSDK({ pinataJwt: PINATA_JWT, pinataGateway: PINATA_GATEWAY_URL });

  const handleMintNFT = async () => {
    if (!provider || !file || !name || !description) {
      alert("Please provide all required inputs and connect your wallet.");
      return;
    }

    setStatus("Preparing to mint NFT...");
    try {
      const signer = provider.getSigner();
      const network = await provider.getNetwork();
      const networkId = network.chainId.toString();
      const numericNetworkId = parseInt(networkId, 10) as keyof typeof deployedContracts;
      console.log(numericNetworkId);

      const contractInfo = deployedContracts[numericNetworkId]?.NFTCollection;
      if (!contractInfo) {
        alert(`NFTCollection contract is not deployed on network ${numericNetworkId}`);
        return;
      }

      const contract = new ethers.Contract(contractInfo.address, contractInfo.abi, signer as unknown as ethers.Signer);

      setStatus("Uploading image to Pinata...");
      const imageResponse = await pinata.upload.file(file);
      const imageUrl = `ipfs://${imageResponse.IpfsHash}`;

      setStatus("Creating metadata...");
      const metadata = { name, description, image: imageUrl };
      const metadataBlob = new Blob([JSON.stringify(metadata)], { type: "application/json" });
      const metadataFile = new File([metadataBlob], `${name}_metadata.json`);

      setStatus("Uploading metadata to Pinata...");
      const metadataResponse = await pinata.upload.file(metadataFile);
      const metadataUrl = `ipfs://${metadataResponse.IpfsHash}`;

      setStatus("Minting NFT...");
      const tx = await contract.mintToken(account, metadataUrl);
      setStatus("Waiting for transaction to be mined...");
      const receipt = await provider.waitForTransaction(tx.hash);
      if (receipt.status === 1) {
        setStatus("NFT minted successfully!");
      } else {
        setStatus("Transaction failed. Please try again.");
      }
    } catch (error) {
      console.error("Error minting NFT:", error);
      setStatus("Failed to mint NFT.");
    }
  };

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <h1 className="block text-4xl font-bold">Create Your NFT</h1>
        <div className="shadow-md p-8 w-full max-w-lg flex flex-col bg-base-100 rounded-3xl">
          <div className="mb-6">
            <label className="block font-semibold mb-2 text-base-content">Name</label>
            <input
              type="text"
              placeholder="Enter NFT Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div className="mb-6">
            <label className="block font-semibold mb-2 text-base-content">Description</label>
            <textarea
              placeholder="Enter NFT Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              rows={4}
            ></textarea>
          </div>
          <div className="mb-6">
            <label className="block font-semibold mb-2 text-base-content">Upload Image</label>
            <label
              htmlFor="file-upload"
              className="cursor-pointer px-4 py-2 bg-primary rounded-lg shadow-md hover:bg-primary-focus transition text-base-content"
            >
              Choose File
            </label>
            <input
              id="file-upload"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <span className="ml-3 mb-2 text-base-content">
              {file ? file.name : "No file chosen"}
            </span>
          </div>
          <button
            onClick={handleMintNFT}
            disabled={!provider}
            className="w-full btn btn-primary font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {provider ? "Mint NFT" : "Connect Wallet to Mint"}
          </button>
          {status && (
            <div className="mt-6 text-center">
              <p className="text-gray-600">{status}</p>
            </div>
          )}
          <div className="mt-4 text-center">
            {!account && (
              <button
                onClick={connectWallet}
                className="text-blue-600 hover:underline font-semibold"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}