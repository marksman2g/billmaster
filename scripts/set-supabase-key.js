const fs = require("fs");
const path = require("path");
const readline = require("readline");

const configPath = path.resolve(__dirname, "..", "billmaster-config.js");
const projectUrl = "https://hhmiyebcduegpoihbgrt.supabase.co";

function normalizeKey(value) {
  return String(value || "").trim().replace(/^["']|["']$/g, "");
}

function maskKey(value) {
  if (!value) return "";
  if (value.length <= 18) return `${value.slice(0, 6)}...`;
  return `${value.slice(0, 14)}...${value.slice(-6)}`;
}

function writeConfig(anonKey) {
  const text = `window.BILLMASTER_CLOUD_CONFIG = {\n  url: "${projectUrl}",\n  anonKey: "${anonKey}"\n};\n`;
  fs.writeFileSync(configPath, text);
  console.log(`Updated billmaster-config.js with publishable key ${maskKey(anonKey)}.`);
}

async function promptForKey() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  const answer = await new Promise((resolve) => {
    rl.question("Paste Supabase publishable key: ", resolve);
  });
  rl.close();
  return answer;
}

(async () => {
  const provided = normalizeKey(process.argv[2] || process.env.SUPABASE_PUBLISHABLE_KEY || "");
  const anonKey = provided || normalizeKey(await promptForKey());
  if (!anonKey) {
    console.error("No key provided.");
    process.exit(1);
  }
  if (!/^sb_publishable_|^eyJ/i.test(anonKey)) {
    console.warn("Warning: this does not look like a modern sb_publishable_ key or legacy JWT anon key.");
  }
  writeConfig(anonKey);
})();
