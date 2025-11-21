// portals/vendorPortal.js
const inquirer = require("inquirer");
const {
  loadProfileEnv,
  makeProvider,
  makeWallet,
  loadContractInstance,
  ethers,
  loadAllProfiles,
} = require("../lib/eth");
const { statusName } = require("../lib/helpers");

function short(a) { return a.substring(0,10) + "..."; }
function getName(a, list) {
  const m = list.find(p => p.address.toLowerCase() === a.toLowerCase());
  return m ? m.name : short(a);
}

async function vendorMenu(profilePath) {
  const env = loadProfileEnv(profilePath);
  const provider = makeProvider(env);
  const wallet = makeWallet(env, provider);
  const contract = loadContractInstance(env, wallet);

  const all = loadAllProfiles();
  const vendors = all.filter(x => x.role === "vendor");
  const requesters = all.filter(x => x.role === "requester");

  console.log(`\nVendor Portal — ${env.NAME} (${wallet.address})\n`);

  while (true) {
    const { opt } = await inquirer.prompt({
      name:"opt",
      type:"list",
      message:"Vendor Menu",
      choices:[
        { name:"List open tenders", value:"list"},
        { name:"Show request details", value:"show"},
        { name:"Place bid", value:"bid"},
        { name:"Mark delivered", value:"deliver"},
        { name:"Back", value:"back"},
        { name:"Exit", value:"exit"},
      ]
    });

    if (opt==="exit") process.exit(0);
    if (opt==="back") return;

    try {
      // LIST tendering = status == 2
      if (opt==="list") {
        const ids = await contract.getRequestIds();
        const tendering = [];
        for (const id of ids) {
          const r = await contract.getRequest(id);
          if (Number(r[4]) === 2) tendering.push(id.toString());
        }
        if (tendering.length===0) console.log("No open tenders.");
        else console.log("Open tenders:", tendering.join(", "));
      }

      // SHOW DETAILS
      else if (opt==="show") {
        const {id} = await inquirer.prompt({name:"id", message:"Request ID"});
        const r = await contract.getRequest(id);

        const reqName = getName(r[1], requesters);
        const winName = r[6] === ethers.ZeroAddress ? "—" : getName(r[6], vendors);

        console.table({
          id:r[0].toString(),
          requester:`${reqName} (${short(r[1])})`,
          description:r[2],
          estimatedETH:ethers.formatEther(r[3]),
          status:statusName(r[4]),
          winner: r[6]===ethers.ZeroAddress ? "—" : `${winName} (${short(r[6])})`,
          winningBidETH:r[7].toString()==="0"?"—":ethers.formatEther(r[7]),
          delivered:r[8],
        });
      }

      // PLACE BID — uses ONLY submitBid
      else if (opt==="bid") {
        const {id, amt} = await inquirer.prompt([
          {name:"id", message:"Request ID"},
          {name:"amt", message:"Your Bid (ETH)"},
        ]);

        const wei = ethers.parseEther(amt);
        try {
          const tx = await contract.submitBid(id, wei);
          console.log("Tx:", tx.hash);
          await tx.wait();
          console.log("Bid placed!");
        } catch (err) {
          console.log("❌ Cannot bid:", err.reason || err.message);
        }
      }

      // MARK DELIVERED
      else if (opt==="deliver") {
        const {id} = await inquirer.prompt({name:"id", message:"Request ID"});
        const r = await contract.getRequest(id);

        if (r[6] === ethers.ZeroAddress) {
          console.log("❌ No vendor assigned yet.");
          continue;
        }
        if (r[6].toLowerCase() !== wallet.address.toLowerCase()) {
          console.log("❌ You are not the winning vendor.");
          continue;
        }

        try {
          const tx = await contract.markDelivered(id);
          console.log("Tx:", tx.hash);
          await tx.wait();
          console.log("Delivered marked.");
        } catch (err) {
          console.log("❌ Error:", err.reason || err.message);
        }
      }

    } catch (e) {
      console.log("❌ Error:", e.reason || e.message);
    }
  }
}

module.exports = { vendorMenu };
