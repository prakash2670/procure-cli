const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  try {
    console.log("Testing RPC:", process.env.IITBH_RPC);

    const provider = new ethers.JsonRpcProvider(process.env.IITBH_RPC);

    const block = await provider.getBlockNumber();
    console.log("Connected! Current Sepolia Block:", block);
  } catch (err) {
    console.error("RPC ERROR:", err.message);
  }
}

main();
