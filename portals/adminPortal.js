// portals/adminPortal.js
const inquirer = require("inquirer");
const { loadProfileEnv, makeProvider, makeWallet, loadContractInstance, ethers } = require("../lib/eth");
const { statusName } = require("../lib/helpers");

async function adminMenu(profilePath) {
  const env = loadProfileEnv(profilePath);
  const provider = makeProvider(env);
  const wallet = makeWallet(env, provider);
  const contract = loadContractInstance(env, wallet);

  console.log(`\nAdmin Portal — ${env.NAME || "Admin"} (${wallet.address})\n`);

  while (true) {
    const { opt } = await inquirer.prompt({
      name: "opt",
      type: "list",
      message: `Admin Menu`,
      choices: [
        { name: "List all requests", value: "list" },
        { name: "Show request details", value: "show" },
        { name: "Approve a request (start tendering)", value: "approve" },
        { name: "View bids for a request", value: "viewBids" },
        { name: "Award tender to vendor", value: "award" },
        { name: "Pay vendor for a request", value: "pay" },
        { name: "Back to Role Selection", value: "back" },
        { name: "Exit Program", value: "exit" }
      ]
    });

    if (opt === "exit") {
      process.exit(0);
    }
    if (opt === "back") {
      return "back";
    }

    try {
      if (opt === "list") {
        const ids = await contract.getRequestIds();
        if (!ids || ids.length === 0) {
          console.log("No requests yet.");
        } else {
          console.log("IDs:", ids.map(i => i.toString()));
        }
        // after listing, loop back to Admin Menu (user will see options)
      } else if (opt === "show") {
        const { id } = await inquirer.prompt({ name: "id", message: "Request ID", type: "input" });
        const r = await contract.getRequest(id);
        console.table({
          id: r[0].toString(),
          requester: r[1],
          description: r[2],
          estimatedETH: ethers.formatEther(r[3]),
          status: statusName(r[4]),
          winner: r[6],
          winningBidETH: r[7].toString() === "0" ? null : ethers.formatEther(r[7]),
          delivered: r[8]
        });
      } else if (opt === "approve") {
        const { id } = await inquirer.prompt({ name: "id", message: "Request ID to approve", type: "input" });
        const tx = await contract.approveRequest(id);
        console.log("Tx sent:", tx.hash);
        await tx.wait();
        console.log("Approved and tendering started.");
      } else if (opt === "viewBids") {
        const { id } = await inquirer.prompt({ name: "id", message: "Request ID", type: "input" });
        const bids = await contract.getBids(id);
        if (!bids || bids.length === 0) console.log("No bids yet.");
        else {
          console.log("Bids:");
          bids.forEach((b, idx) => {
            console.log(`${idx+1}. vendor=${b.vendor} amountETH=${ethers.formatEther(b.amount)} ts=${new Date(Number(b.timestamp) * 1000).toISOString()}`);
          });
        }
      } else if (opt === "award") {
        const answers = await inquirer.prompt([
          { name: "id", message: "Request ID", type: "input" },
          { name: "vendor", message: "Vendor address (winner)", type: "input" },
          { name: "amount", message: "Winning bid amount (ETH)", type: "input" }
        ]);
        const wei = ethers.parseEther(answers.amount);
        const tx = await contract.awardTender(answers.id, answers.vendor, wei);
        console.log("Tx:", tx.hash); await tx.wait(); console.log("Awarded.");
      } else if (opt === "pay") {
        const answers = await inquirer.prompt([
          { name: "id", message: "Request ID", type: "input" },
          { name: "amount", message: "Amount to send (ETH) — leave blank to pay stored winningBid", type: "input", default: "" }
        ]);
        let wei;
        if (answers.amount && answers.amount.trim() !== "") wei = ethers.parseEther(answers.amount);
        else {
          const r = await contract.getRequest(answers.id);
          wei = r[7];
        }
        const tx = await contract.payRequest(answers.id, { value: wei });
        console.log("Tx:", tx.hash); await tx.wait(); console.log("Paid to vendor.");
      }
    } catch (e) {
      console.error("Error:", e && e.message ? e.message : e);
    }
  }
}

module.exports = { adminMenu };
