import { ethers } from "ethers";
import deployedContracts from "../contracts/deployedContracts";
import { Web3Provider } from "@ethersproject/providers";
import { PinataSDK } from "pinata-web3";

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT!;
const PINATA_GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL!;

const pinata = new PinataSDK({ pinataJwt: PINATA_JWT, pinataGateway: PINATA_GATEWAY_URL });

/**
 * Fetches the NFT collections owned by the user.
 * @param provider - The ethers provider connected to the user's wallet.
 * @param account - The user's wallet address.
 * @returns An array of collection details.
 */
export const fetchCollections = async (provider: Web3Provider, account: string) => {
    try {
      const signer = provider.getSigner();
      const network = await provider.getNetwork();
      const networkId = network.chainId.toString();
      const numericNetworkId = parseInt(networkId, 10) as keyof typeof deployedContracts;
  
      const contractInfo = deployedContracts[numericNetworkId]?.NFTCollection;
      if (!contractInfo) {
        throw new Error(`NFTCollection contract is not deployed on network ${numericNetworkId}`);
      }
  
      const parentContract = new ethers.Contract(contractInfo.address, contractInfo.abi, signer as unknown as ethers.Signer);
      const tokenIds: ethers.BigNumberish[] = await parentContract.getTokensOfOwner(account);
  
      if (!tokenIds.length) {
        console.log("No collections found for this account.");
        return [];
      }
  
      const collections = await Promise.all(
        tokenIds.map(async (tokenId) => {
          const tokenURI = await parentContract.tokenURI(tokenId);
          const metadataIpfs = tokenURI.replace("ipfs://", "");
          const metadataFile = await pinata.gateways.get(metadataIpfs);
          const metadata = typeof metadataFile.data === "string" 
          ? JSON.parse(metadataFile.data) 
          : metadataFile.data;
          return {
            tokenId: tokenId.toString(),
            name: metadata.name,
            symbol: metadata.symbol,
            contractAddress: metadata.contractAddress,
            createdBy: metadata.createdBy,
          };
        })
      );
  
      return collections;
    } catch (error) {
      console.error("Error fetching collections:", error);
      throw error;
    }
  };