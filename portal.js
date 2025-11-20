#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const inquirer = require("inquirer");
const { adminMenu } = require("./portals/adminPortal");
const { vendorMenu } = require("./portals/vendorPortal");
const { requesterMenu } = require("./portals/requesterPortal");
const { loadProfileEnv, makeProvider, makeWallet } = require("./lib/eth");

function listAllProfiles() {
  const dir = path.join(__dirname, "profiles");
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => f.startsWith(".env"));
  return files.map(f => path.join(dir, f));
}

function parseProfileMeta(profilePath) {
  const text = fs.readFileSync(profilePath, "utf8");
  const lines = text.split(/\r?\n/);
  const meta = {};
  for (const l of lines) {
    const t = l.trim();
    if (!t || t.startsWith("#")) continue;
    const idx = t.indexOf("=");
    if (idx === -1) continue;
    const key = t.substring(0, idx).trim();
    const val = t.substring(idx+1).trim();
    meta[key] = val;
  }
  return meta;
}

async function selectProfileByRole(role) {
  const dir = path.join(__dirname, "profiles");
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(f => f.startsWith(".env"));
  const filtered = [];
  for (const f of files) {
    const full = path.join(dir, f);
    const meta = parseProfileMeta(full);
    if ((meta.role && meta.role.toLowerCase() === role) || (!meta.role && role === "admin" && f.toLowerCase().includes("admin"))) {
      filtered.push({ file: full, name: meta.NAME || f });
    }
  }
  if (filtered.length === 0) return null;
  if (filtered.length === 1) return filtered[0].file;
  const choice = await inquirer.prompt({
    name: "sel",
    type: "list",
    message: `Select ${role} profile`,
    choices: filtered.map(p => ({ name: `${p.name} (${path.basename(p.file)})`, value: p.file }))
  });
  return choice.sel;
}

async function main() {
  const profiles = listAllProfiles();
  if (profiles.length === 0) {
    console.error("No profile files found. Create profiles/.env.admin, .env.requester1, .env.vendor1 etc.");
    process.exit(1);
  }

  outer:
  while (true) {
    const { role } = await inquirer.prompt({
      name: "role",
      type: "list",
      message: "Select Role (or Exit to quit)",
      choices: [
        { name: "Admin", value: "admin" },
        { name: "Requester", value: "requester" },
        { name: "Vendor", value: "vendor" },
        { name: "Exit", value: "exit" }
      ]
    });

    if (role === "exit") break;

    const profileFile = await selectProfileByRole(role);
    if (!profileFile) {
      console.error(`No profile found for role '${role}'. Make sure profiles/.env.* contains role=${role}`);
      continue;
    }

    // print selected profile info
    const meta = parseProfileMeta(profileFile);
    let displayAddress = "unknown";
    try {
      const envObject = require("./lib/eth").loadProfileEnv(profileFile);
      const provider = makeProvider(envObject);
      const wallet = makeWallet(envObject, provider);
      displayAddress = wallet.address;
    } catch (e) {
      // ignore, show unknown
    }

    console.log(`\nSelected profile: ${meta.NAME || path.basename(profileFile)} (${displayAddress}) role=${role}\n`);

    let result;
    if (role === "admin") result = await adminMenu(profileFile);
    else if (role === "vendor") result = await vendorMenu(profileFile);
    else if (role === "requester") result = await requesterMenu(profileFile);

    // if user selected Back in the submenu, continue outer loop to role selection
    if (result === "back") continue outer;

    // after completing a role session (Exit inside menus), continue to role selection again
  }

  console.log("Goodbye.");
}

main();
