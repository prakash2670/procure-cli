# procurement-cli

Blockchain-Based Institute Procurement Management System (CLI)

This project implements a complete end-to-end procurement workflow for institutes using a blockchain network.
It supports multiple roles (Admin, Requesters, Vendors), secure on-chain storage, and a fully interactive Node.js CLI.

This README explains **how to install, configure, deploy, and run** the project.

---

## 📂 Project Structure

```text
procurement-cli/
│
├── contracts/
│   └── Procurement.sol
│
├── config/
│   └── hardhat.config.js
│
├── lib/
│   ├── eth.js
│   └── helpers.js
│
├── portals/
│   ├── adminPortal.js
│   ├── requesterPortal.js
│   └── vendorPortal.js
│
├── profiles/
│   ├── .env.admin
│   ├── .env.requester1
│   ├── .env.vendor1
│   └── (create more if needed)
│
├── scripts/
│   ├── deploy.js
│   └── testrpc.js
│
├── artifacts/ (auto-generated)
├── portal.js
└── package.json
```

---

## 🛠 Prerequisites

- Node.js (v18+ recommended)
- npm
- MetaMask for generating private keys
- College Blockchain RPC URL and Chain ID
- Funded accounts on the College Blockchain

---

## 📦 Install Dependencies

Run inside `procurement-cli`:

```bash
npm install
```

---

## ⚙️ Environment Setup

The **College Blockchain** is the default network.

Every profile needs its own `.env` file in `profiles/`:

Example `profiles/.env.admin`:

```text
NAME=Admin-Main
ROLE=admin
PRIVATE_KEY=0x<your-admin-private-key>
RPC_URL=https://<college-rpc-url>
CHAIN_ID=<college-chain-id>
CONTRACT_ADDRESS=
```

Example `profiles/.env.requester1`:

```text
NAME=Dept-CSE
ROLE=requester
PRIVATE_KEY=0x<requester-private-key>
RPC_URL=https://<college-rpc-url>
CHAIN_ID=<college-chain-id>
CONTRACT_ADDRESS=
```

Example `profiles/.env.vendor1`:

```text
NAME=TechVendor
ROLE=vendor
PRIVATE_KEY=0x<vendor-private-key>
RPC_URL=https://<college-rpc-url>
CHAIN_ID=<college-chain-id>
CONTRACT_ADDRESS=
```

### 👉 How to Add More Requesters/Vendors

Create new `.env` files in `/profiles`.

---

## 🧪 Test RPC Connection

```bash
node scripts/testrpc.js
```

Expected output:

```text
Testing RPC: <your-college-rpc>
Connected! Current Block: #######
```

---

## 🧱 Compile the Contract

```bash
npx hardhat compile
```

---

## 🚀 Deploy the Contract (College Network)

```bash
npx hardhat run scripts/deploy.js --network college
```

The deploy script prints:

```text
Contract deployed at: 0xABCDEF.....
```

Copy this value into ALL `.env` files under:

```text
CONTRACT_ADDRESS=0xABCDEF....
```

---

## ▶️ Run the CLI Portal

```bash
npm start
```

You will see:

```text
Select Role:
  Admin
  Requester
  Vendor
  Exit
```

Each role loads its own menu based on the selected `.env` profile.

---

## 🔁 Workflow Summary

1. **Requester**
   - Creates a request
   - Waits for admin approval
   - Confirms received after vendor delivery

2. **Admin**
   - Views all requests
   - Approves request → Tendering starts
   - Views vendor bids
   - Awards tender to lowest vendor
   - Pays vendor after requester confirms

3. **Vendor**
   - Views open tenders
   - Submits bid
   - If awarded → Marks delivered

---

## 🔧 Using a Different Network (Sepolia / Localhost / Others)

If switching networks, update these in ALL profile `.env` files:

```text
RPC_URL=<new rpc>
CHAIN_ID=<new chain id>
```

AND update `hardhat.config.js` → add a new network section.

Then:

```bash
npx hardhat run scripts/deploy.js --network <new-network>
```

---

## 🛠 Troubleshooting

### ❗ `insufficient funds`

Your account on the college network needs more coins.

### ❗ `execution reverted: not received`

Admin tried to pay before Requester confirmed delivery.

### ❗ RPC errors

Check:

- Wrong RPC URL
- Firewall/VPN
- Network down

Use `node scripts/testrpc.js` to verify.

---

## ✔ Project Working Successfully

This CLI is fully tested on the College Blockchain.
Supports unlimited requesters/vendors, full tender workflow, secure signing, and clean interaction model.

---
