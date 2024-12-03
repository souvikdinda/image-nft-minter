"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "../../hooks/useWallet";
import { PinataSDK } from "pinata-web3";
import { useContractStore } from "~~/services/contractStore";
import deployedContracts from "~~/contracts/deployedContracts";
import { ethers } from "ethers";

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT!;
const PINATA_GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL!;

const pinata = new PinataSDK({ pinataJwt: PINATA_JWT, pinataGateway: PINATA_GATEWAY_URL });

interface NFTCollection {
  name: string;
  symbol: string;
  contractAddress: string;
  createdBy: string;
}

export default function ViewCollections() {
  const { provider, account } = useWallet();
  const [collections, setCollections] = useState<NFTCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const fetchAllCollections = async () => {
    if (!account || !provider) {
      alert("Please connect your wallet");
      return;
    }

    setLoading(true);

    const fetchedCollections: NFTCollection[] = [];
    try {
      const signer = provider.getSigner();
      const network = await provider.getNetwork();
      const networkId = network.chainId.toString();
      const numericNetworkId = parseInt(networkId, 10) as keyof typeof deployedContracts;
      const contractStore = useContractStore(numericNetworkId, signer as unknown as ethers.Signer);
      const registryConract = contractStore.getRegistryContract();
      if (!registryConract) {
        console.error("Failed to get registry contract.");
        return;
      }
      const collectionContractAddresses: string[] = await registryConract.getCollectionsByOwner(account);
      if (!collectionContractAddresses.length) {
        console.log("No collections found for this account.");
        return [];
      }

      for (const contractAddress of collectionContractAddresses) {
        const collectionMetadata = await registryConract.getCollectionMetadata(contractAddress);
        fetchedCollections.push({
          name: collectionMetadata.name,
          symbol: collectionMetadata.symbol,
          contractAddress,
          createdBy: account,
        });
      }
      setCollections(fetchedCollections);
    } catch (error) {
      console.error("Error fetching NFTs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (account && provider) {
      fetchAllCollections();
    }
  }, [account, provider]);

  const handleAdd = (contractAddress: string) => {
    router.push(`/viewcollection/${contractAddress}/add`);
  };

  const handleView = (contractAddress: string) => {
    router.push(`/viewcollection/${contractAddress}/view`);
  };

  return (
    <>
      <div className="flex flex-col items-center pt-10">
        <h1 className="block text-4xl font-bold text-base-content mb-6">Your NFTs</h1>

        {/* Loading state */}
        {loading && <p className="text-lg font-semibold text-base-content">Loading NFTs...</p>}

        {/* No NFTs found */}
        {!loading && collections.length === 0 && (
          <p className="text-lg font-semibold text-base-content">No NFTs found</p>
        )}

        {/* NFT Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-6 w-full max-w-5xl">
          {collections.map(collection => (
            <div
              key={collection.contractAddress}
              className="bg-base-100 shadow-md rounded-xl p-6 text-center flex flex-col items-center"
            >
              <h3 className="text-xl font-semibold text-base-content mb-2">{collection.name}</h3>
              <p className="text-sm text-base-content mb-2">{collection.symbol}</p>
              <div className="flex space-x-4 mt-4">
                {/* Add Button */}
                <button onClick={() => handleAdd(collection.contractAddress)} className="btn btn-primary">
                  Add
                </button>
                {/* View Button */}
                <button onClick={() => handleView(collection.contractAddress)} className="btn btn-secondary">
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
