// portals/adminPortal.js
const inquirer = require("inquirer");
const {
  loadProfileEnv,
  makeProvider,
  makeWallet,
  loadContractInstance,
  ethers,
  loadAllProfiles
} = require("../lib/eth");

const { statusName } = require("../lib/helpers");

function short(addr) {
  return addr.substring(0, 10) + "...";
}

function getNameFromAddress(address, profiles) {
  const x = profiles.find(
    (p) => p.address.toLowerCase() === address.toLowerCase()
  );
  return x ? x.name : short(address);
}

async function adminMenu(profilePath) {
  const env = loadProfileEnv(profilePath);
  const provider = makeProvider(env);
  const wallet = makeWallet(env, provider);
  const contract = loadContractInstance(env, wallet);

  // Load all vendors/requesters from profiles
  const allProfiles = loadAllProfiles();
  const vendorProfiles = allProfiles.filter((p) => p.role === "vendor");
  const requesterProfiles = allProfiles.filter((p) => p.role === "requester");

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
        { name: "Exit Program", value: "exit" },
      ],
    });

    if (opt === "exit") process.exit(0);
    if (opt === "back") return "back";

    try {
      // LIST ALL REQUESTS
      if (opt === "list") {
        const ids = await contract.getRequestIds();
        if (!ids || ids.length === 0) {
          console.log("No requests yet.");
        } else {
          console.log("\nRequest IDs:", ids.map((i) => i.toString()).join(", "));
        }
      }

      // SHOW REQUEST DETAILS (with requester & winner names)
      else if (opt === "show") {
        const { id } = await inquirer.prompt({
          name: "id",
          message: "Request ID",
          type: "input",
        });

        const r = await contract.getRequest(id);

        // Lookup names (fall back to shortened address)
        const requesterName = getNameFromAddress(r[1], requesterProfiles);
        const winnerName =
          r[6] === ethers.ZeroAddress
            ? "—"
            : getNameFromAddress(r[6], vendorProfiles);

        console.table({
          id: r[0].toString(),
          requester: `${requesterName} (${short(r[1])})`,
          description: r[2],
          estimatedETH: ethers.formatEther(r[3]),
          status: statusName(r[4]),
          winner: r[6] === ethers.ZeroAddress ? "—" : `${winnerName} (${short(r[6])})`,
          winningBidETH: r[7].toString() === "0" ? "—" : ethers.formatEther(r[7]),
          delivered: r[8],
        });
      }

      // APPROVE REQUEST
      else if (opt === "approve") {
        const { id } = await inquirer.prompt({
          name: "id",
          message: "Request ID to approve",
          type: "input",
        });
        const tx = await contract.approveRequest(id);
        console.log("Tx sent:", tx.hash);
        await tx.wait();
        console.log("Approved and tendering started.");
      }

      // VIEW BIDS (with vendor names)
      else if (opt === "viewBids") {
        const { id } = await inquirer.prompt({
          name: "id",
          message: "Request ID",
          type: "input",
        });

        const bids = await contract.getBids(id);
        if (!bids || bids.length === 0) {
          console.log("No bids yet.");
        } else {
          console.log("\nBids:");
          bids.forEach((b, idx) => {
            const vendorName = getNameFromAddress(b.vendor, vendorProfiles);
            console.log(
              `${idx + 1}. ${vendorName} (${short(b.vendor)}) | ${ethers.formatEther(b.amount)} ETH | ${new Date(Number(b.timestamp) * 1000).toISOString()}`
            );
          });
        }
      }

      // AWARD TENDER (Auto vendor + auto amount)
      else if (opt === "award") {
        const { reqId } = await inquirer.prompt({
          name: "reqId",
          message: "Request ID",
          type: "input",
        });

        const bids = await contract.getBids(reqId);
        if (!bids || bids.length === 0) {
          console.log("No bids available for this request!");
          continue;
        }

        // Build selection list
        const choices = bids.map((b, i) => {
          const vendorName = getNameFromAddress(b.vendor, vendorProfiles);
          return {
            name: `${vendorName} (${short(b.vendor)}) - ${ethers.formatEther(b.amount)} ETH`,
            value: i,
          };
        });

        const { winnerIndex } = await inquirer.prompt({
          name: "winnerIndex",
          type: "list",
          message: "Select vendor to award:",
          choices,
        });

        const winningBid = bids[winnerIndex];

        console.log(
          `\nAwarding to ${short(winningBid.vendor)} for ${ethers.formatEther(winningBid.amount)} ETH`
        );

        const tx = await contract.awardTender(reqId, winningBid.vendor, winningBid.amount);
        console.log("Tx:", tx.hash);
        await tx.wait();
        console.log("Tender awarded successfully.");
      }

      // PAY VENDOR (auto amount)
      else if (opt === "pay") {
        const { id } = await inquirer.prompt({
          name: "id",
          message: "Request ID",
          type: "input",
        });

        const r = await contract.getRequest(id);
        const amountToSend = r[7]; // stored winning bid

        if (!amountToSend || amountToSend.toString() === "0") {
          console.log("No stored winning bid to pay.");
          continue;
        }

        const tx = await contract.payRequest(id, { value: amountToSend });
        console.log("Tx:", tx.hash);
        await tx.wait();
        console.log("Paid to vendor.");
      }
    } catch (e) {
      // friendly error handling
      console.error("\nError:", e.reason || e.message || e);
    }
  }
}

module.exports = { adminMenu };
