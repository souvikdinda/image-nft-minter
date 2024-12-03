"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "../../hooks/useWallet";
import { fetchCollections } from "../../services/fetchCollections";

interface NFTCollection {
  tokenId: string;
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
      const collections = await fetchCollections(provider, account);
      for (const collection of collections) {
        console.log(
          "Fetching NFT with token ID:",
          collection.tokenId,
          collection.name,
          collection.symbol,
          collection.contractAddress,
          collection.createdBy,
        );
        fetchedCollections.push({
          tokenId: collection.tokenId,
          name: collection.name,
          symbol: collection.symbol,
          contractAddress: collection.contractAddress,
          createdBy: collection.createdBy,
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
  }, [account, provider, fetchAllCollections]);

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
              key={collection.tokenId}
              className="bg-base-100 shadow-md rounded-xl p-6 text-center flex flex-col items-center"
            >
              <h3 className="text-xl font-semibold text-base-content mb-2">{collection.name}</h3>
              <p className="text-sm text-base-content mb-2">{collection.symbol}</p>
              <p className="text-sm text-gray-500">
                <strong>Collection ID:</strong> {collection.tokenId}
              </p>
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