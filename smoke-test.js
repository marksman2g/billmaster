const fs = require("fs");
const vm = require("vm");

const code = fs.readFileSync("app.js", "utf8");
const plaidFunction = fs.readFileSync("supabase/functions/plaid-sync/index.ts", "utf8");
const openAiTtsFunction = fs.readFileSync("supabase/functions/openai-tts/index.ts", "utf8");
const views = [
  "dashboard",
  "tracking",
  "analytics",
  "bills",
  "inbox",
  "sync",
  "subscriptions",
  "calendar",
  "tasks",
  "habits",
  "projects",
  "goals",
  "notebooks",
  "notes",
  "contacts",
  "addresses",
  "lending",
  "ai"
];

const failures = [];

[
  ["Plaid consent setting", /plaidConsentAt/],
  ["Plaid consent modal", /type === "plaidConsent"/],
  ["Plaid consent confirmation", /confirm-plaid-consent/],
  ["Plaid consent gate", /if \(!data\.settings\.plaidConsentAt\)/],
  ["In-app privacy notice", /type === "privacyNotice"/],
  ["Privacy notice contact", /computer\.fieldtech@gmail\.com/]
].forEach(([label, pattern]) => {
  if (!pattern.test(code)) failures.push(`source: missing ${label}`);
});

[
  ["Plaid user deletion action", /action === "delete_user_data"/],
  ["Plaid expiry purge action", /action === "purge_expired_data"/],
  ["Plaid item revocation", /\/item\/remove/]
].forEach(([label, pattern]) => {
  if (!pattern.test(plaidFunction)) failures.push(`plaid-sync: missing ${label}`);
});

[
  ["OpenAI TTS endpoint", /api\.openai\.com\/v1\/audio\/speech/],
  ["OpenAI TTS server key", /OPENAI_API_KEY/],
  ["OpenAI TTS auth check", /auth\.getUser/],
  ["OpenAI TTS voice allowlist", /allowedVoices/]
].forEach(([label, pattern]) => {
  if (!pattern.test(openAiTtsFunction)) failures.push(`openai-tts: missing ${label}`);
});

for (const view of views) {
  const app = { innerHTML: "" };
  const sandbox = {
    document: {
      getElementById(id) {
        return id === "app" ? app : null;
      },
      addEventListener() {},
      querySelectorAll() {
        return [];
      },
      createElement() {
        return { click() {} };
      }
    },
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {}
    },
    window: {
      location: { hash: `#${view}` },
      history: { pushState() {} },
      addEventListener() {},
      open() {}
    },
    requestAnimationFrame(callback) {
      callback();
    },
    structuredClone: global.structuredClone,
    Blob,
    URL: {
      createObjectURL() {
        return "blob://billmaster";
      },
      revokeObjectURL() {}
    },
    console
  };

  try {
    vm.runInNewContext(code, sandbox, { filename: "app.js" });
    if (!app.innerHTML || app.innerHTML.length < 1000) {
      failures.push(`${view}: rendered output was unexpectedly small`);
    }
    if (view === "goals") {
      const requiredBusinessSignals = [
        "Make BillMaster sustainable",
        "Scale-plan commitment",
        "Next Time & Money moves",
        "$949.00",
        "$20.50 per month",
        "Review Bills",
        "Review Analytics",
        "Open Calendar"
      ];
      requiredBusinessSignals.forEach((signal) => {
        if (!app.innerHTML.includes(signal)) failures.push(`${view}: missing business signal ${signal}`);
      });
    }
  } catch (error) {
    failures.push(`${view}: ${error.message}`);
  }
}

if (failures.length) {
  console.error("Smoke test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Smoke test passed for ${views.length} routes.`);
