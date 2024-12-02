"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../../hooks/useWallet";
import deployedContracts from "../../contracts/deployedContracts";
import { PinataSDK } from "pinata-web3";

interface NFT {
  tokenId: string;
  name: string;
  description: string;
  image: string;
}

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT!;
const PINATA_GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL!;

export default function ViewNFTs() {
  const { provider, connectWallet, account } = useWallet();
  const [nfts, setNFTs] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pinata = new PinataSDK({ pinataJwt: PINATA_JWT, pinataGateway: PINATA_GATEWAY_URL });

  useEffect(() => {
    if (account && provider) {
      fetchNFTs();
    }
  }, [account, provider]);

  const fetchNFTs = async () => {
    if (!account || !provider) {
      alert("Please connect your wallet");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

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

      const contract = new ethers.Contract(contractInfo.address, contractInfo.abi, signer as unknown as ethers.Signer);
      const tokenIds: ethers.BigNumberish[] = await contract.getTokensOfOwner(account);
      const fetchedNFTs: NFT[] = [];

      for (const tokenId of tokenIds) {
        console.log("Fetching NFT with token ID:", tokenId);
        const tokenURI = await contract.tokenURI(tokenId);
        console.log("Token URI:", tokenURI);
        const metadataIpfs = tokenURI.replace("ipfs://", "");
        const metadataFile = await pinata.gateways.get(metadataIpfs);
        console.log("Metadata file:", metadataFile);
        // const metadata = JSON.parse(metadataFile.data?.toString() || "{}");
        const metadata = typeof metadataFile.data === "string" 
          ? JSON.parse(metadataFile.data) 
          : metadataFile.data;
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
      setErrorMessage("Failed to fetch NFTs. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    // <div>
    //   <h1>Your NFTs</h1>
    //   {loading && <p>Loading NFTs...</p>}
    //   {!loading && nfts.length === 0 && <p>No NFTs found</p>}
    //   <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
    //     {nfts.map((nft) => (
    //       <div key={nft.tokenId} style={{ border: "1px solid #ccc", padding: "16px", borderRadius: "8px", width: "200px", textAlign: "center" }}>
    //         <img src={nft.image} alt={nft.name} style={{ width: "100%", height: "auto", borderRadius: "4px" }} />
    //         <h3>{nft.name}</h3>
    //         <p>{nft.description}</p>
    //         <p><strong>Token ID:</strong> {nft.tokenId}</p>
    //       </div>
    //     ))}
    //   </div>
    // </div>
    <>
      <div className="flex flex-col items-center pt-10">
        <h1 className="block text-4xl font-bold text-base-content mb-6">Your NFTs</h1>

        {/* Loading state */}
        {loading && <p className="text-lg font-semibold text-base-content">Loading NFTs...</p>}

        {/* No NFTs found */}
        {!loading && nfts.length === 0 && (
          <p className="text-lg font-semibold text-base-content">No NFTs found</p>
        )}

        {/* NFT Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-6 w-full max-w-5xl">
          {nfts.map((nft) => (
            <div
              key={nft.tokenId}
              className="bg-base-100 shadow-md rounded-xl p-6 text-center flex flex-col items-center"
            >
              <img
                src={nft.image}
                alt={nft.name}
                className="w-full h-auto rounded-lg mb-4"
              />
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
