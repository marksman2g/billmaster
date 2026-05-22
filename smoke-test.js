const fs = require("fs");
const vm = require("vm");

const code = fs.readFileSync("app.js", "utf8");
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
