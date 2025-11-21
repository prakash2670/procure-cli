// portals/requesterPortal.js
const inquirer = require("inquirer");
const {
  loadProfileEnv, makeProvider, makeWallet,
  loadContractInstance, ethers, loadAllProfiles
} = require("../lib/eth");
const { statusName } = require("../lib/helpers");

function short(a){return a.substring(0,10)+"...";}
function getName(a,list){
  const m=list.find(x=>x.address.toLowerCase()===a.toLowerCase());
  return m?m.name:short(a);
}

async function requesterMenu(profilePath){
  const env=loadProfileEnv(profilePath);
  const provider=makeProvider(env);
  const wallet=makeWallet(env,provider);
  const contract=loadContractInstance(env,wallet);

  const all=loadAllProfiles();
  const vendors=all.filter(x=>x.role==="vendor");
  const requesters=all.filter(x=>x.role==="requester");

  console.log(`\nRequester Portal — ${env.NAME} (${wallet.address})\n`);

  while(true){
    const {opt}=await inquirer.prompt({
      name:"opt", type:"list", message:"Requester Menu",
      choices:[
        {name:"Create request", value:"create"},
        {name:"My requests", value:"mine"},
        {name:"Show details", value:"show"},
        {name:"Confirm received", value:"confirm"},
        {name:"Back", value:"back"},
        {name:"Exit", value:"exit"},
      ]
    });

    if(opt==="exit")process.exit(0);
    if(opt==="back")return;

    try {
      // CREATE
      if(opt==="create"){
        const {desc,est}=await inquirer.prompt([
          {name:"desc",message:"Description"},
          {name:"est",message:"Estimated ETH"},
        ]);
        const wei=ethers.parseEther(est);
        const tx=await contract.createRequest(desc,wei);
        console.log("Tx:",tx.hash); await tx.wait();
        console.log("Request created.");
      }

      // MY REQUESTS
      else if(opt==="mine"){
        const ids=await contract.getRequestIds();
        const mine=[];
        for(const id of ids){
          const r=await contract.getRequest(id);
          if(r[1].toLowerCase()===wallet.address.toLowerCase())
            mine.push(id.toString());
        }
        console.log(mine.length? "Your requests: "+mine.join(", ") : "No requests yet.");
      }

      // SHOW DETAILS
      else if(opt==="show"){
        const {id}=await inquirer.prompt({name:"id",message:"Request ID"});
        const r=await contract.getRequest(id);
        const reqName=getName(r[1],requesters);
        const winName=r[6]===ethers.ZeroAddress?"—":getName(r[6],vendors);

        console.table({
          id:r[0].toString(),
          requester:`${reqName} (${short(r[1])})`,
          description:r[2],
          estimatedETH:ethers.formatEther(r[3]),
          status:statusName(r[4]),
          winner:r[6]===ethers.ZeroAddress?"—":`${winName} (${short(r[6])})`,
          winningBidETH:r[7].toString()==="0"?"—":ethers.formatEther(r[7]),
          delivered:r[8],
        });
      }

      // CONFIRM RECEIVED
      else if(opt==="confirm"){
        const {id}=await inquirer.prompt({name:"id",message:"Request ID"});
        const r=await contract.getRequest(id);

        if(r[1].toLowerCase()!==wallet.address.toLowerCase()){
          console.log("❌ You are NOT the requester.");
          continue;
        }
        if(!r[8]){
          console.log("❌ Vendor has not marked delivered yet.");
          continue;
        }

        try {
          const tx=await contract.confirmReceived(id);
          console.log("Tx:",tx.hash); await tx.wait();
          console.log("Confirmed received.");
        } catch(err){
          console.log("❌ Error:",err.reason||err.message);
        }
      }

    } catch(e){
      console.log("❌ Error:",e.reason||e.message);
    }
  }
}

module.exports={requesterMenu};
