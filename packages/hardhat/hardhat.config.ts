import * as dotenv from "dotenv";
dotenv.config();
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@nomicfoundation/hardhat-verify";
import "hardhat-deploy";
import "hardhat-deploy-ethers";
import * as tenderly from "@tenderly/hardhat-tenderly";
tenderly.setup({ automaticVerifications: false });

interface ExtendedHardhatUserConfig extends HardhatUserConfig {
  tenderly?: {
    project: string;
    username: string;
    privateVerification: boolean;
  };
}

const deployerPrivateKey =
  process.env.DEPLOYER_PRIVATE_KEY ?? "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const tenderlyRpcUrl = process.env.TENDERLY_RPC_URL || "";
console.log("Tenderly RPC URL:", tenderlyRpcUrl);

const config: ExtendedHardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  defaultNetwork: "virtual_sepolia",
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
  networks: {
    virtual_sepolia: {
      url: tenderlyRpcUrl,
      chainId: 11155111,
      accounts: [deployerPrivateKey],
      gasPrice: "auto",
    },
  },
  tenderly: {
    project: "nftcollectioncreator",
    username: "souvikdinda",
    privateVerification: true,
  },
};

export default config;
