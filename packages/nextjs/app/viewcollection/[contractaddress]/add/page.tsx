"use client";

import { useState } from "react";
import deployedContracts from "../../../../contracts/deployedContracts";
import { useWallet } from "../../../../hooks/useWallet";
import { ethers } from "ethers";
import { PinataSDK } from "pinata-web3";
import { getContractStore } from "~~/services/contractStore";

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || "";
const PINATA_GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "";

export default function AddToCollection({ params }: { params: { contractaddress: string } }) {
  const { provider, connectWallet, account } = useWallet();
  const { contractaddress } = params;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [creatingNFT, setCreatingNFT] = useState(false);

  const pinata = new PinataSDK({ pinataJwt: PINATA_JWT, pinataGateway: PINATA_GATEWAY_URL });

  const handleImageUpload = async () => {
    setCreatingNFT(true);
    if (!provider || !image || !name || !description) {
      alert("Please provide all required inputs and connect your wallet.");
      return;
    }

    setStatus("Preparing to mint NFT...");
    try {
      const signer = provider.getSigner();
      const network = await provider.getNetwork();
      const networkId = network.chainId.toString();
      const numericNetworkId = parseInt(networkId, 10) as keyof typeof deployedContracts;
      const contractStore = getContractStore(numericNetworkId, signer as unknown as ethers.Signer);
      const contract = contractStore.getCollectionContractFromAddress(contractaddress);
      if (!contract) {
        console.error("Failed to get collection contract for address:", contractaddress);
        return;
      }

      setStatus("Uploading image to Pinata...");
      const originalFileName = image.name;
      const fileExtension = originalFileName.includes(".") ? originalFileName.split(".").pop() : "unknown";
      const originalFileNameWithoutExt = originalFileName.includes(".")
        ? originalFileName.substring(0, originalFileName.lastIndexOf("."))
        : originalFileName;
      const newFileName = `${originalFileNameWithoutExt}-${Date.now().toString()}.${fileExtension}`;
      const renamedImage = new File([image], newFileName, { type: image.type });
      setImage(renamedImage);

      const imageResponse = await pinata.upload.file(image);
      const imageUrl = `ipfs://${imageResponse.IpfsHash}`;
      const metadata = { name, description, image: imageUrl };
      const metadataBlob = new Blob([JSON.stringify(metadata)], { type: "application/json" });
      const metadataFile = new File([metadataBlob], `${imageResponse.IpfsHash}_metadata.json`);

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
      console.error("Error uploading image:", error);
      setStatus("Failed to upload image.");
    }
    setCreatingNFT(false);
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
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div className="mb-6">
            <label className="block font-semibold mb-2 text-base-content">Description</label>
            <textarea
              placeholder="Enter NFT Description"
              value={description}
              onChange={e => setDescription(e.target.value)}
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
              onChange={e => setImage(e.target.files?.[0] || null)}
              className="hidden"
            />
            <span className="ml-3 mb-2 text-base-content">{image ? image.name : "No file chosen"}</span>
          </div>
          <button
            onClick={handleImageUpload}
            disabled={!provider || creatingNFT}
            className="w-full btn btn-primary font-bold flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {provider ? (
              creatingNFT ? (
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
                  Minting NFT...
                </>
              ) : (
              "Mint NFT"
              )) : "Connect Wallet to Mint"}
          </button>
          {status && (
            <div className="mt-6 text-center">
              <p className="text-gray-600">{status}</p>
            </div>
          )}
          <div className="mt-4 text-center">
            {!account && (
              <button onClick={connectWallet} className="text-blue-600 hover:underline font-semibold">
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
