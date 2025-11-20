// portals/vendorPortal.js
const inquirer = require("inquirer");
const { loadProfileEnv, makeProvider, makeWallet, loadContractInstance, ethers } = require("../lib/eth");
const { statusName } = require("../lib/helpers");

async function vendorMenu(profilePath) {
  const env = loadProfileEnv(profilePath);
  const provider = makeProvider(env);
  const wallet = makeWallet(env, provider);
  const contract = loadContractInstance(env, wallet);

  console.log(`\nVendor Portal — ${env.NAME || "Vendor"} (${wallet.address})\n`);

  while (true) {
    const { opt } = await inquirer.prompt({
      name: "opt",
      type: "list",
      message: `Vendor Menu`,
      choices: [
        { name: "List open/tendering requests", value: "listOpen" },
        { name: "View request details", value: "show" },
        { name: "Submit bid for request", value: "bid" },
        { name: "View my awarded requests", value: "myAwards" },
        { name: "Mark delivered (for awarded request)", value: "deliver" },
        { name: "Back to Role Selection", value: "back" },
        { name: "Exit Program", value: "exit" }
      ]
    });

    if (opt === "exit") process.exit(0);
    if (opt === "back") return "back";

    try {
      if (opt === "listOpen") {
        const ids = await contract.getRequestIds();
        let found = false;
        for (const i of ids) {
          const r = await contract.getRequest(i);
          const st = Number(r[4]);
          if (st === 2) { // Tendering
            found = true;
            console.log(`ID ${i.toString()} - ${r[2]} - est ${ethers.formatEther(r[3])} ETH - requester ${r[1]}`);
          }
        }
        if (!found) console.log("No open tendering requests.");
      } else if (opt === "show") {
        const { id } = await inquirer.prompt({ name: "id", message: "Request ID", type: "input" });
        const r = await contract.getRequest(id);
        console.table({
          id: r[0].toString(), requester: r[1], description: r[2],
          estimatedETH: ethers.formatEther(r[3]), status: statusName(r[4]), winner: r[6]
        });
      } else if (opt === "bid") {
        const { id, amount } = await inquirer.prompt([
          { name: "id", message: "Request ID", type: "input" },
          { name: "amount", message: "Bid amount (ETH)", type: "input" }
        ]);
        const wei = ethers.parseEther(amount);
        const tx = await contract.submitBid(id, wei);
        console.log("Tx:", tx.hash); await tx.wait(); console.log("Bid submitted.");
      } else if (opt === "myAwards") {
        const ids = await contract.getRequestIds();
        let found = false;
        for (const i of ids) {
          const r = await contract.getRequest(i);
          if (r[6] && r[6].toLowerCase() === wallet.address.toLowerCase()) {
            found = true;
            console.log(`ID ${i.toString()} - ${r[2]} - winningBid ${ethers.formatEther(r[7])} ETH - status ${statusName(r[4])}`);
          }
        }
        if (!found) console.log("No awarded requests for you.");
      } else if (opt === "deliver") {
        const { id } = await inquirer.prompt({ name: "id", message: "Request ID to mark delivered", type: "input" });
        const tx = await contract.markDelivered(id);
        console.log("Tx:", tx.hash); await tx.wait(); console.log("Marked delivered.");
      }
    } catch (e) {
      console.error("Error:", e && e.message ? e.message : e);
    }
  }
}

module.exports = { vendorMenu };
