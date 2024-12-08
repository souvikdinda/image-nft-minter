"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import deployedContracts from "../../contracts/deployedContracts";
import { useWallet } from "../../hooks/useWallet";
import { ethers } from "ethers";
import { PinataSDK } from "pinata-web3";
import { getContractStore } from "~~/services/contractStore";

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || "";
const PINATA_GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "";

interface Auction {
  nftContract: string;
  tokenId: string;
  image?: string;
  seller?: string;
  highestBid?: string;
  endTime?: string;
}

export default function ViewAuctions() {
  const { provider } = useWallet();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const pinata = new PinataSDK({ pinataJwt: PINATA_JWT, pinataGateway: PINATA_GATEWAY_URL });

  const fetchActiveAuctions = async () => {
    if (!provider) {
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

      const auctionContract = contractStore.getAuctionContract();
      if (!auctionContract) {
        console.error("Failed to get auction contract");
        return;
      }

      const activeAuctions = await auctionContract.getAllActiveAuctions();
      const formattedAuctions: Auction[] = await Promise.all(
        activeAuctions.map(async (auction: any) => {
          const endTime = new Date(Number(auction.endTime) * 1000).toLocaleString();
          console.log(
            "Auction:",
            auction.nftContract,
            auction.tokenId.toString(),
            auction.highestBid.toString(),
            endTime,
            auction.seller,
            auction.settled,
          );
          const collectionContract = contractStore.getCollectionContractFromAddress(auction.nftContract);
          let image = "";

          if (collectionContract) {
            try {
              const tokenURI = await collectionContract.tokenURI(auction.tokenId);
              const metadataIpfs = tokenURI.replaceAll("ipfs://", "");
              const metadataFile = await pinata.gateways.get(metadataIpfs);
              const metadata =
                typeof metadataFile.data === "string" ? JSON.parse(metadataFile.data) : metadataFile.data;
              image = metadata.image.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/") || "";
            } catch (error) {
              console.error(`Failed to fetch tokenURI for ${auction.nftContract} - ${auction.tokenId}`, error);
            }
          }

          return {
            nftContract: auction.nftContract,
            tokenId: auction.tokenId.toString(),
            image,
          };
        }),
      );

      setAuctions(formattedAuctions);
    } catch (error) {
      console.error("Error fetching active auctions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (provider) {
      fetchActiveAuctions();
    }
  }, [provider]);

  const handleViewDetails = (nftContract: string, tokenId: string) => {
    router.push(`/viewauction/${nftContract}-${tokenId}`);
  };

  return (
    <div className="flex flex-col items-center pt-10">
      <h1 className="block text-4xl font-bold text-base-content mb-6">Active Auctions</h1>

      {loading && <p className="text-lg font-semibold text-base-content">Loading auctions...</p>}

      {!loading && auctions.length === 0 && (
        <p className="text-lg font-semibold text-base-content">No active auctions found</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-6 w-full max-w-5xl">
        {auctions.map(auction => (
          <div
            key={`${auction.nftContract}-${auction.tokenId}`}
            className="bg-base-100 shadow-md rounded-xl p-6 text-center flex flex-col items-center"
          >
            {auction.image && (
              <img
                src={auction.image}
                alt={`NFT from ${auction.nftContract} with Token ID ${auction.tokenId}`}
                className="w-full h-64 object-cover rounded-lg mb-4"
              />
            )}
            <p className="text-lg font-semibold mb-2">
              <strong>Contract Address:</strong> {auction.nftContract?.slice(0, 8)}...{auction.nftContract?.slice(-6)}
            </p>
            <p className="text-lg font-semibold mb-4">
              <strong>Token ID:</strong> {auction.tokenId}
            </p>
            <button onClick={() => handleViewDetails(auction.nftContract, auction.tokenId)} className="btn btn-primary">
              View Details
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
