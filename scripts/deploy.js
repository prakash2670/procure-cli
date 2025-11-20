const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with:", deployer.address);

    const Procurement = await ethers.getContractFactory("Procurement");
    const proc = await Procurement.deploy(deployer.address);

    // In Ethers v6: wait for deployment like this:
    await proc.waitForDeployment();

    console.log("Procurement deployed at:", await proc.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
