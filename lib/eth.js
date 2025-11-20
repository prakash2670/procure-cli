const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { ethers } = require("ethers");

function loadProfileEnv(profilePath) {
  if (!fs.existsSync(profilePath)) throw new Error("Profile not found: " + profilePath);
  const env = dotenv.parse(fs.readFileSync(profilePath));
  return env;
}

// Ethers v6 provider
function makeProvider(env) {
  const rpc = env.IITBH_RPC;
  const chainId = Number(env.IITBH_CHAIN_ID);

  if (!rpc) throw new Error("SEPOLIA_RPC missing in profile");
  if (!chainId) throw new Error("SEPOLIA_CHAIN_ID missing in profile");

  // v6 syntax
  return new ethers.JsonRpcProvider(rpc, chainId);
}

function makeWallet(env, provider) {
  if (!env.PRIVATE_KEY) throw new Error("PRIVATE_KEY missing in profile");
  return new ethers.Wallet(env.PRIVATE_KEY, provider); // v6 correct
}

// Load the contract instance (v6)
function loadContractInstance(env, signerOrProvider) {
  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "Procurement.sol",
    "Procurement.json"
  );

  if (!fs.existsSync(artifactPath)) {
    throw new Error("Compile the contract first: npx hardhat compile");
  }

  const json = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const abi = json.abi;

  const addr = env.CONTRACT_ADDRESS;
  if (!addr) throw new Error("CONTRACT_ADDRESS missing in profile env");

  // v6 contract instantiation
  return new ethers.Contract(addr, abi, signerOrProvider);
}

module.exports = {
  loadProfileEnv,
  makeProvider,
  makeWallet,
  loadContractInstance,
  ethers,
  fs,
  path
};
