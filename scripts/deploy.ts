import { ethers } from "hardhat";

async function main() {
  console.log(" Deploying ArbitrageExecutor");

  // Base Sepolia addresses
  const SWAP_ROUTER = "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4"; // Base Sepolia SwapRouter

  console.log("Constructor params:");
  console.log("  SwapRouter:", SWAP_ROUTER);

  // Deploy
  const ArbitrageExecutor = await ethers.getContractFactory("ArbitrageExecutor");
  const arbExecutor = await ArbitrageExecutor.deploy(SWAP_ROUTER);

  await arbExecutor.waitForDeployment();

  const address = await arbExecutor.getAddress();

  console.log(" ArbitrageExecutor deployed to:", address);
  console.log("\nVerification command:");
  console.log(`npx hardhat verify --network baseSepolia ${address} "${SWAP_ROUTER}"`);
  console.log("\n Update .env.local with:");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
