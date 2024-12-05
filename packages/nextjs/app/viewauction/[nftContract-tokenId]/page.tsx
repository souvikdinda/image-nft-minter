"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "../../../hooks/useWallet";
import deployedContracts from "../../../contracts/deployedContracts";
import { useContractStore } from "~~/services/contractStore";
import { ethers } from "ethers";

interface AuctionDetails {
  seller: string;
  highestBidder: string;
  highestBid: string;
  endTime: string;
  settled: boolean;
}

export default function AuctionDetails({ params }: { params: { [key: string]: string } }) {
  const { provider, account } = useWallet();
  const [details, setDetails] = useState<AuctionDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [nftContract, tokenId] = (params['nftContract-tokenId'] || '').split('-');
  const [bidAmount, setBidAmount] = useState("");

  const fetchAuctionDetails = async () => {
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
      const contractStore = useContractStore(numericNetworkId, signer as unknown as ethers.Signer);

      const auctionContract = contractStore.getAuctionContract();
      if (!auctionContract) {
        console.error("Failed to get auction contract");
        return;
      }

      const auctionDetails = await auctionContract.getAuction(nftContract, tokenId);
      setDetails({
        seller: auctionDetails.seller,
        highestBidder: auctionDetails.highestBidder,
        highestBid: ethers.formatEther(auctionDetails.highestBid),
        endTime: new Date(Number(auctionDetails.endTime) * 1000).toLocaleString(),
        settled: auctionDetails.settled,
      });
    } catch (error) {
      console.error("Error fetching auction details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBid = async () => {
    if (!provider || !account || !details) {
      alert("Please connect your wallet");
      return;
    }

    if (parseFloat(bidAmount) <= parseFloat(details.highestBid)) {
      alert("Your bid must be higher than the current highest bid.");
      return;
    }

    try {
      setStatus("Placing bid...");
      const signer = provider.getSigner();
      const network = await provider.getNetwork();
      const networkId = network.chainId.toString();
      const numericNetworkId = parseInt(networkId, 10) as keyof typeof deployedContracts;
      const contractStore = useContractStore(numericNetworkId, signer as unknown as ethers.Signer);

      const auctionContract = contractStore.getAuctionContract();
      if (!auctionContract) {
        console.error("Failed to get auction contract");
        return;
      }

      const tx = await auctionContract.placeBid(nftContract, tokenId, {
        value: ethers.parseEther(bidAmount),
      });
      await provider.waitForTransaction(tx.hash);

      setStatus("Bid placed successfully!");
      fetchAuctionDetails();
    } catch (error) {
      console.error("Error placing bid:", error);
      setStatus("Failed to place bid.");
    }
  };

  const handleSettleAuction = async () => {
    if (!provider || !account || !details) {
      alert("Please connect your wallet");
      return;
    }

    try {
      setStatus("Settling auction...");
      const signer = provider.getSigner();
      const network = await provider.getNetwork();
      const networkId = network.chainId.toString();
      const numericNetworkId = parseInt(networkId, 10) as keyof typeof deployedContracts;
      const contractStore = useContractStore(numericNetworkId, signer as unknown as ethers.Signer);

      const auctionContract = contractStore.getAuctionContract();
      if (!auctionContract) {
        console.error("Failed to get auction contract");
        return;
      }

      const tx = await auctionContract.settleAuction(nftContract, tokenId);
      await provider.waitForTransaction(tx.hash);

      setStatus("Auction settled successfully!");
      fetchAuctionDetails();
    } catch (error) {
      console.error("Error settling auction:", error);
      setStatus("Failed to settle auction.");
    }
  };

  useEffect(() => {
    if (provider && nftContract && tokenId) {
      fetchAuctionDetails();
    }
  }, [provider, nftContract, tokenId]);

  const isAuctionEnded = details && new Date(details.endTime).getTime() <= Date.now();

  return (
    <div className="flex flex-col items-center pt-10">
      <h1 className="block text-4xl font-bold text-base-content mb-6">Auction Details</h1>

      {loading && <p className="text-lg font-semibold text-base-content">Loading auction details...</p>}

      {!loading && details && (
        <div className="shadow-md p-8 w-full max-w-lg flex flex-col bg-base-100 rounded-3xl">
          <p className="text-lg font-semibold">
            <strong>Seller:</strong> {details.seller}
          </p>
          <p className="text-lg font-semibold mt-2">
            <strong>Highest Bidder:</strong> {details.highestBidder}
          </p>
          <p className="text-lg font-semibold mt-2">
            <strong>Highest Bid:</strong> {details.highestBid} ETH
          </p>
          <p className="text-lg font-semibold mt-2">
            <strong>End Time:</strong> {details.endTime}
          </p>
          <p className="text-lg font-semibold mt-2">
            <strong>Settled:</strong> {details.settled ? "Yes" : "No"}
          </p>
          {!details.settled && (
            new Date(details.endTime).getTime() > Date.now() ? (
              account !== details.seller && (
                <div className="mt-6">
                  <input
                    type="text"
                    placeholder="Enter your bid in ETH"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="border rounded px-4 py-2 w-full mb-4"
                  />
                  <button onClick={handleBid} className="btn btn-primary w-full">
                    Place Bid
                  </button>
                </div>
              )
            ) : (
              (account === details.seller || account === details.highestBidder) && (
                <button onClick={handleSettleAuction} className="btn btn-secondary w-full mt-4">
                  Settle Auction
                </button>
              )
            )
          )}
        </div>
      )}

      {!loading && !details && <p className="text-lg font-semibold text-base-content">No details found for this auction.</p>}
      {status && <p className="mt-4 text-sm text-center text-base-content">{status}</p>}
    </div>
  );
}
