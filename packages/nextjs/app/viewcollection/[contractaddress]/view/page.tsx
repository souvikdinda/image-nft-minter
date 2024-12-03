"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import deployedContracts from "../../../../contracts/deployedContracts";
import { useWallet } from "../../../../hooks/useWallet";
import { ethers } from "ethers";
import { PinataSDK } from "pinata-web3";

interface NFT {
  tokenId: string;
  name: string;
  description: string;
  image: string;
}

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || "";
const PINATA_GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "";

export default function ViewImagesFromCollection({ params }: { params: { contractaddress: string } }) {
  const { provider, account } = useWallet();
  const [nfts, setNFTs] = useState<NFT[]>([]);
  const { contractaddress } = params;
  const [loading, setLoading] = useState(false);

  const pinata = new PinataSDK({ pinataJwt: PINATA_JWT, pinataGateway: PINATA_GATEWAY_URL });

  const fetchCollectionImages = async () => {
    if (!account || !provider) {
      alert("Please connect your wallet");
      return;
    }

    setLoading(true);

    try {
      const signer = provider.getSigner();
      const network = await provider.getNetwork();
      const networkId = network.chainId.toString();
      const numericNetworkId = parseInt(networkId, 10) as keyof typeof deployedContracts;
      const contractInfo = deployedContracts[numericNetworkId]?.NFTCollection;
      if (!contractInfo) {
        alert(`NFTCollection contract not deployed on network ${networkId}`);
        setLoading(false);
        return;
      }

      const contract = new ethers.Contract(contractaddress, contractInfo.abi, signer as unknown as ethers.Signer);
      const tokenIds: ethers.BigNumberish[] = await contract.getTokensOfOwner(account);
      const fetchedNFTs: NFT[] = [];

      for (const tokenId of tokenIds) {
        console.log("Fetching NFT with token ID:", tokenId);
        const tokenURI = await contract.tokenURI(tokenId);
        console.log("Token URI:", tokenURI);
        const metadataIpfs = tokenURI.replace("ipfs://", "");
        const metadataFile = await pinata.gateways.get(metadataIpfs);
        console.log("Metadata file:", metadataFile);
        const metadata = typeof metadataFile.data === "string" ? JSON.parse(metadataFile.data) : metadataFile.data;
        console.log("Metadata data:", metadata);
        const formattedMetadata: NFT = {
          tokenId: tokenId.toString(),
          name: metadata.name || "Unknown Name",
          description: metadata.description || "No Description",
          image: metadata.image?.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/") || "",
        };
        fetchedNFTs.push(formattedMetadata);
      }

      setNFTs(fetchedNFTs);
    } catch (error) {
      console.error("Error fetching NFTs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (account && provider) {
      fetchCollectionImages();
    }
  }, [account, provider, fetchCollectionImages]);

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
              <div className="w-full h-auto rounded-lg mb-4">
                <Image src={nft.image} alt={nft.name} fill style={{ objectFit: "cover" }} />
              </div>
              <h3 className="text-xl font-semibold text-base-content mb-2">{nft.name}</h3>
              <p className="text-sm text-base-content mb-2">{nft.description}</p>
              <p className="text-sm text-gray-500">
                <strong>Token ID:</strong> {nft.tokenId}
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
