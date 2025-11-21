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

function loadAllProfiles() {
  const profilesDir = path.join(__dirname, "..", "profiles");
  if (!fs.existsSync(profilesDir)) return [];
  const files = fs.readdirSync(profilesDir).filter(f => f.toLowerCase().includes("env"));
  const profiles = [];
  for (const f of files) {
    const full = path.join(profilesDir, f);
    const parsed = dotenv.parse(fs.readFileSync(full));
    if (!parsed.PRIVATE_KEY) continue;
    // Create wallet to normalize address (no provider needed)
    let address = parsed.ADDRESS;
    try {
      const w = new ethers.Wallet(parsed.PRIVATE_KEY);
      address = w.address;
    } catch (e) {
      // ignore invalid key
    }
    profiles.push({
      name: parsed.NAME || (address ? address.substring(0, 10) : f),
      role: (parsed.role || "").toLowerCase(),
      address: address,
    });
  }
  return profiles;
}


module.exports = {
  loadProfileEnv,
  loadAllProfiles,
  makeProvider,
  makeWallet,
  loadContractInstance,
  ethers, fs, path
};

