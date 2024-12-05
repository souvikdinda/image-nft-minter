"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { BookOpenIcon, FaceSmileIcon, PlusCircleIcon, WrenchIcon, ShoppingBagIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5">
          <h1 className="text-center">
            <span className="block text-2xl mb-2">Welcome to</span>
            <span className="block text-4xl font-bold">NFT Collection Creator</span>
          </h1>
          <div className="flex justify-center items-center space-x-2 flex-col sm:flex-row">
            <p className="my-2 font-medium">Connected Address:</p>
            <Address address={connectedAddress} />
          </div>

          <p className="text-center text-lg font-bold">
            <FaceSmileIcon className="h-6 w-6 inline-block" /> Happy Image Minting{" "}
            <FaceSmileIcon className="h-6 w-6 inline-block" />
          </p>
        </div>

        <div className="flex-grow bg-base-300 w-full mt-16 px-8 py-12">
          <div className="flex justify-center items-center gap-12 flex-col sm:flex-row">
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <PlusCircleIcon className="h-8 w-8 fill-secondary" />
              <p>
                Create your own NFT collections using the{" "}
                <Link href="/createcollection" passHref className="link">
                  Create Collections
                </Link>{" "}
                tab.
              </p>
            </div>
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <BookOpenIcon className="h-8 w-8 fill-secondary" />
              <p>
                View your NFT collections on the{" "}
                <Link href="/viewcollection" passHref className="link">
                  View Collections
                </Link>{" "}
                tab.
              </p>
            </div>
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <WrenchIcon className="h-8 w-8 fill-secondary" />
              <p>
                View all active auctions of NFTs on the{" "}
                <Link href="/viewauction" passHref className="link">
                  View Auctions
                </Link>{" "}
                tab.
              </p>
            </div>
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <ShoppingBagIcon className="h-8 w-8 fill-secondary" />
              <p>
                View all your purchased NFTs on the{" "}
                <Link href="/purchasednfts" passHref className="link">
                  View Purchased NFTs
                </Link>{" "}
                tab.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
