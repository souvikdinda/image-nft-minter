"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import deployedContracts from "../../contracts/deployedContracts";
import { useWallet } from "../../hooks/useWallet";
import { ethers } from "ethers";
import { PinataSDK } from "pinata-web3";
import { getContractStore } from "~~/services/contractStore";

interface NFT {
  contractAddress: string;
  tokenId: string;
  name: string;
  description: string;
  image: string;
}

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || "";
const PINATA_GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "";

export default function PurchasedNFTs() {
  const { provider, account } = useWallet();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const pinata = new PinataSDK({ pinataJwt: PINATA_JWT, pinataGateway: PINATA_GATEWAY_URL });

  const fetchNFTs = async () => {
    if (!provider || !account) {
      alert("Please connect your wallet");
      return;
    }

    setLoading(true);

    try {
      const signer = provider.getSigner();
      const network = await provider.getNetwork();
      const networkId = network.chainId.toString();
      const numericNetworkId = parseInt(networkId, 10) as keyof typeof deployedContracts;
      const contractStore = getContractStore(numericNetworkId, signer as unknown as ethers.Signer);

      const registryContract = contractStore.getRegistryContract();
      if (!registryContract) {
        console.error("Failed to get registry contract");
        return;
      }

      const collections = await registryContract.getAllCollections();
      for (const collection of collections) {
        const collectionContract = contractStore.getCollectionContractFromAddress(collection);
        if (!collectionContract) {
          console.error("Failed to get collection contract");
          return;
        }

        const tokenIds: ethers.BigNumberish[] = await collectionContract.getTokensOfOwner(account);
        const fetchedNFTs: NFT[] = [];

        for (const tokenId of tokenIds) {
          console.log("Fetching NFT with token ID:", tokenId);
          const tokenURI = await collectionContract.tokenURI(tokenId);
          console.log("Token URI:", tokenURI);
          const metadataIpfs = tokenURI.replace("ipfs://", "");
          const metadataFile = await pinata.gateways.get(metadataIpfs);
          console.log("Metadata file:", metadataFile);
          const metadata = typeof metadataFile.data === "string" ? JSON.parse(metadataFile.data) : metadataFile.data;
          console.log("Metadata data:", metadata);
          const formattedMetadata: NFT = {
            contractAddress: collection,
            tokenId: tokenId.toString(),
            name: metadata.name || "Unknown Name",
            description: metadata.description || "No Description",
            image: metadata.image?.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/") || "",
          };
          fetchedNFTs.push(formattedMetadata);
        }
        setNfts(fetchedNFTs);
      }
    } catch (error) {
      console.error("Error fetching NFTs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAuction = (contractAddress: string, tokenId: string) => {
    router.push(`/createauction?contractaddress=${contractAddress}&tokenid=${tokenId}`);
  };

  useEffect(() => {
    if (provider && account) {
      fetchNFTs();
    }
  }, [provider, account]);

  return (
    <>
      <div className="flex flex-col items-center pt-10">
        <h1 className="block text-4xl font-bold text-base-content mb-6">Your NFTs</h1>

        {/* Loading state */}
        {loading && <p className="text-lg font-semibold text-base-content">Loading NFTs...</p>}

        {/* No NFTs found */}
        {!loading && nfts.length === 0 && <p className="text-lg font-semibold text-base-content">No NFTs found</p>}

        {/* NFT Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-6 w-full max-w-5xl">
          {nfts.map(nft => (
            <div
              key={nft.tokenId}
              className="bg-base-100 shadow-md rounded-xl p-6 text-center flex flex-col items-center"
            >
              <img src={nft.image} alt={nft.name} className="w-full h-auto rounded-lg mb-4" />
              <h3 className="text-xl font-semibold text-base-content mb-2">{nft.name}</h3>
              <p className="text-sm text-base-content mb-2">{nft.description}</p>
              <p className="text-sm text-gray-500">
                <strong>Token ID:</strong> {nft.tokenId}
              </p>
              <div className="flex space-x-4 mt-4">
                <button
                  onClick={() => handleCreateAuction(nft.contractAddress, nft.tokenId)}
                  className="btn btn-primary"
                >
                  Auction
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
