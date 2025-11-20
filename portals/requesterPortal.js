// portals/requesterPortal.js
const inquirer = require("inquirer");
const { loadProfileEnv, makeProvider, makeWallet, loadContractInstance, ethers } = require("../lib/eth");
const { statusName } = require("../lib/helpers");

async function requesterMenu(profilePath) {
  const env = loadProfileEnv(profilePath);
  const provider = makeProvider(env);
  const wallet = makeWallet(env, provider);
  const contract = loadContractInstance(env, wallet);

  console.log(`\nRequester Portal — ${env.NAME || "Requester"} (${wallet.address})\n`);

  while (true) {
    const { opt } = await inquirer.prompt({
      name: "opt",
      type: "list",
      message: `Requester Menu`,
      choices: [
        { name: "Create a new request", value: "create" },
        { name: "List my requests", value: "list" },
        { name: "Show request details", value: "show" },
        { name: "Confirm received (for delivered request)", value: "confirm" },
        { name: "Back to Role Selection", value: "back" },
        { name: "Exit Program", value: "exit" }
      ]
    });

    if (opt === "exit") process.exit(0);
    if (opt === "back") return "back";

    try {
      if (opt === "create") {
        const answers = await inquirer.prompt([
          { name: "description", message: "Description (item name)", type: "input" },
          { name: "estimated", message: "Estimated amount (ETH)", type: "input" }
        ]);
        const wei = ethers.parseEther(answers.estimated);
        const tx = await contract.createRequest(answers.description, wei);
        console.log("Tx:", tx.hash); await tx.wait(); console.log("Request created.");
      } else if (opt === "list") {
        const ids = await contract.getRequestIds();
        let found = false;
        for (const i of ids) {
          const r = await contract.getRequest(i);
          if (r[1].toLowerCase() === wallet.address.toLowerCase()) {
            found = true;
            console.log(`ID ${i.toString()} - ${r[2]} - ${statusName(r[4])}`);
          }
        }
        if (!found) console.log("You have no requests.");
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
      } else if (opt === "confirm") {
        const { id } = await inquirer.prompt({ name: "id", message: "Request ID to confirm received", type: "input" });
        const tx = await contract.confirmReceived(id);
        console.log("Tx:", tx.hash); await tx.wait(); console.log("Confirmed received.");
      }
    } catch (e) {
      console.error("Error:", e && e.message ? e.message : e);
    }
  }
}

module.exports = { requesterMenu };
