"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import deployedContracts from "../../../contracts/deployedContracts";
import { useWallet } from "../../../hooks/useWallet";
import { ethers } from "ethers";
import FlipNumbers from "react-flip-numbers";
import { getContractStore } from "~~/services/contractStore";

interface AuctionDetails {
  seller: string;
  highestBidder: string;
  highestBid: string;
  endTime: number;
  settled: boolean;
}

export default function AuctionDetails({ params }: { params: { [key: string]: string } }) {
  const { provider, account } = useWallet();
  const [details, setDetails] = useState<AuctionDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [nftContract, tokenId] = (params["nftContract-tokenId"] || "").split("-");
  const [bidAmount, setBidAmount] = useState("");
  const [remainingTime, setRemainingTime] = useState("00:00:00");
  const [ethToUsdRate, setEthToUsdRate] = useState<number | null>(null);

  const fetchEthToUsdRate = async () => {
    try {
      const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
      const data = await response.json();
      setEthToUsdRate(data.ethereum.usd);
    } catch (error) {
      console.error("Error fetching ETH to USD rate:", error);
    }
  };

  useEffect(() => {
    fetchEthToUsdRate();
  }, []);

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
      const contractStore = getContractStore(numericNetworkId, signer as unknown as ethers.Signer);

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
        endTime: Number(auctionDetails.endTime),
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
      const contractStore = getContractStore(numericNetworkId, signer as unknown as ethers.Signer);

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
      const contractStore = getContractStore(numericNetworkId, signer as unknown as ethers.Signer);

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
    if (!details) return;

    const calculateRemainingTime = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = details.endTime - now;

      if (diff <= 0) {
        setRemainingTime("00:00:00");
        return;
      }

      const hours = String(Math.floor(diff / 3600)).padStart(2, "0");
      const minutes = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
      const seconds = String(diff % 60).padStart(2, "0");

      setRemainingTime(`${hours}:${minutes}:${seconds}`);
    };

    calculateRemainingTime();
    const timer = setInterval(calculateRemainingTime, 1000);

    return () => clearInterval(timer);
  }, [details]);

  useEffect(() => {
    if (provider && nftContract && tokenId) {
      fetchAuctionDetails();
    }
  }, [provider, nftContract, tokenId]);

  const isAuctionEnded = details && details.endTime <= Math.floor(Date.now() / 1000);

  return (
    <div className="flex flex-col items-center pt-10">
      <h1 className="block text-4xl font-bold text-base-content mb-6">Auction Details</h1>

      {loading && <p className="text-lg font-semibold text-base-content">Loading auction details...</p>}

      {!loading && details && (
        <div className="shadow-md p-8 w-full max-w-lg flex flex-col bg-base-100 rounded-3xl">
          <p className="text-lg text-center">
            <strong>Seller:</strong> {details.seller?.slice(0, 8)}...{details.seller?.slice(-6)}
          </p>
          <p className="text-lg text-center mt-2">
            <strong>Highest Bidder:</strong> {details.highestBidder?.slice(0, 8)}...{details.highestBidder?.slice(-6)}
          </p>
          <p className="text-lg text-center mt-2">
            <strong>Highest Bid:</strong> {details.highestBid} ETH
            {ethToUsdRate && (
              <span className="text-lg text-base-content">
                {" "}
                (~${(parseFloat(details.highestBid) * ethToUsdRate).toFixed(2)})
              </span>
            )}
          </p>
          <p className="text-lg text-center mt-2">
            <strong>End Time:</strong> {details.endTime ? new Date(details.endTime * 1000).toLocaleString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "numeric",
              hour12: true,
            }) : ""}
          </p>
          <div className="mt-2">
            <p className="text-lg text-center">
              <strong>Time Remaining:</strong>
            </p>
            <div className="flex justify-center items-center space-x-4">
              <FlipNumbers
                height={50}
                width={40}
                color="currentColor"
                background="transparent"
                play
                numbers={remainingTime}
              />
            </div>
          </div>
          <p className="text-lg text-center mt-8">
            <strong>Settled:</strong> {details.settled ? "Yes" : "No"}
          </p>
          {!details.settled &&
            (!isAuctionEnded
              ? account !== details.seller &&
              account !== details.highestBidder && (
                <div className="mt-6">
                  <input
                    type="text"
                    placeholder="Enter your bid in ETH"
                    value={bidAmount}
                    onChange={e => setBidAmount(e.target.value)}
                    className="border rounded px-4 py-2 w-full mb-4"
                  />
                  <p className="text-sm text-base-content mb-4">
                    Note: Your bid must be higher than the current highest bid.
                  </p>
                  {ethToUsdRate && bidAmount && (
                    <p className="text-sm text-base-content mb-4">
                      Equivalent USD: ~${(parseFloat(bidAmount) * ethToUsdRate).toFixed(2)}
                    </p>
                  )}
                  <button onClick={handleBid} className="btn btn-primary w-full">
                    Place Bid
                  </button>
                </div>
              )
              : (account === details.seller || account === details.highestBidder) && (
                <button onClick={handleSettleAuction} className="btn btn-secondary w-full mt-4">
                  Settle Auction
                </button>
              ))}
        </div>
      )}

      {!loading && !details && (
        <p className="text-lg font-semibold text-base-content">No details found for this auction.</p>
      )}
      {status && <p className="mt-4 text-sm text-center text-base-content">{status}</p>}
    </div>
  );
}
