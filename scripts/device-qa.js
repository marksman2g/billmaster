const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const DEFAULT_URL = "https://marksman2g.github.io/billmaster/?v=20260615-1";
const baseUrl = process.argv.includes("--url")
  ? process.argv[process.argv.indexOf("--url") + 1]
  : DEFAULT_URL;

const devices = [
  { name: "iphone-se", label: "iPhone SE", width: 375, height: 667, isMobile: true },
  { name: "iphone-14", label: "iPhone 14", width: 390, height: 844, isMobile: true },
  { name: "pixel-7", label: "Android Pixel", width: 412, height: 915, isMobile: true },
  { name: "ipad", label: "iPad", width: 768, height: 1024, isMobile: true },
  { name: "ipad-landscape", label: "iPad Landscape", width: 1024, height: 768, isMobile: true }
];

const routes = [
  { hash: "dashboard", label: "Dashboard" },
  { hash: "calendar", label: "Calendar" },
  { hash: "tasks", label: "Tasks" },
  { hash: "notes", label: "Notes" },
  { hash: "projects", label: "Projects" },
  { hash: "goals", label: "Goals" },
  { hash: "lending", label: "Lending" },
  { hash: "sync", label: "Sync Center" }
];

function cleanUrl(url) {
  return url.replace(/#.*$/, "").replace(/\?$/, "");
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function inspectPage(page) {
  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const bodyText = document.body.innerText || "";
    const visibleText = bodyText.replace(/\s+/g, " ").trim();
    const buttons = Array.from(document.querySelectorAll("button, a, input, select, textarea"));
    const smallTargets = buttons
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          text: (element.textContent || element.getAttribute("aria-label") || element.getAttribute("placeholder") || element.tagName).trim().slice(0, 48),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        };
      })
      .filter((target) => target.width > 0 && target.height > 0 && (target.width < 32 || target.height < 32))
      .slice(0, 12);

    const clippedText = Array.from(document.querySelectorAll("button, .status, .chip, .metric-card, .note-card, .task-card, .loan-card, .goal-card"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          text: (element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60),
          clipped: element.scrollWidth > element.clientWidth + 2 || element.scrollHeight > element.clientHeight + 2,
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        };
      })
      .filter((item) => item.clipped)
      .slice(0, 12);

    return {
      h1: document.querySelector("h1")?.textContent?.trim() || "",
      visibleText: visibleText.slice(0, 180),
      overflowX: scrollWidth > viewportWidth + 2,
      viewportWidth,
      scrollWidth,
      smallTargets,
      clippedText,
      blank: visibleText.length < 25
    };
  });
}

async function main() {
  const outputRoot = path.join(process.cwd(), "qa-reports", `device-${stamp()}`);
  const screenshotDir = path.join(outputRoot, "screenshots");
  fs.mkdirSync(screenshotDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const results = [];
  const cleanBase = cleanUrl(baseUrl);

  for (const device of devices) {
    const page = await browser.newPage({
      viewport: { width: device.width, height: device.height },
      isMobile: device.isMobile,
      deviceScaleFactor: device.isMobile ? 2 : 1
    });

    for (const route of routes) {
      const url = `${cleanBase}#${route.hash}`;
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(900);
      const inspection = await inspectPage(page);
      const screenshotName = `${device.name}-${route.hash}.png`;
      await page.screenshot({
        path: path.join(screenshotDir, screenshotName),
        fullPage: true
      });

      const issues = [];
      if (inspection.blank) issues.push("blank-or-too-little-text");
      if (inspection.overflowX) issues.push("horizontal-overflow");
      if (inspection.smallTargets.length) issues.push(`${inspection.smallTargets.length}-small-tap-targets`);
      if (inspection.clippedText.length) issues.push(`${inspection.clippedText.length}-possible-clipped-items`);

      results.push({
        device: device.label,
        viewport: `${device.width}x${device.height}`,
        route: route.label,
        hash: route.hash,
        screenshot: path.join("screenshots", screenshotName),
        pass: issues.length === 0,
        issues,
        inspection
      });
    }

    await page.close();
  }

  await browser.close();

  const summary = {
    testedAt: new Date().toISOString(),
    baseUrl,
    devices: devices.map((device) => `${device.label} ${device.width}x${device.height}`),
    routes: routes.map((route) => route.label),
    total: results.length,
    passed: results.filter((result) => result.pass).length,
    failed: results.filter((result) => !result.pass).length,
    results
  };

  fs.writeFileSync(path.join(outputRoot, "report.json"), JSON.stringify(summary, null, 2));

  const lines = [
    "# BillMaster Device QA Report",
    "",
    `Tested: ${summary.testedAt}`,
    `URL: ${baseUrl}`,
    "",
    `Passed: ${summary.passed}/${summary.total}`,
    "",
    "## Results",
    ""
  ];

  for (const result of results) {
    lines.push(`- ${result.pass ? "PASS" : "CHECK"} | ${result.device} | ${result.route} | ${result.viewport}`);
    if (result.issues.length) lines.push(`  - Issues: ${result.issues.join(", ")}`);
    lines.push(`  - Screenshot: ${result.screenshot}`);
  }

  fs.writeFileSync(path.join(outputRoot, "report.md"), lines.join("\n"));
  console.log(JSON.stringify({
    outputRoot,
    passed: summary.passed,
    total: summary.total,
    failed: summary.failed
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
