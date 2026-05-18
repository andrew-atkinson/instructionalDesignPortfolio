#!/usr/bin/env node
/**
 * html-to-pdf.js
 *
 * Generates PDF exports from built HTML case study pages.
 * Requires Google Chrome or Chromium installed locally.
 *
 * Usage:
 *   node src/html-to-pdf.js            # export all case studies
 *   node src/html-to-pdf.js cc-series  # export one
 *
 * Output: pdf/<slug>.pdf
 */

"use strict";

const fs   = require("fs");
const path = require("path");

const { loadSiteConfig } = require("./parse-site.js");

const ROOT = path.resolve(__dirname, "..");

// ── Find Chrome on macOS / Linux ──────────────────────────────────────────────

function findChrome() {
  const candidates = [
    // macOS
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    // Linux
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    // Common snap path
    "/snap/bin/chromium",
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// ── Generate one PDF ──────────────────────────────────────────────────────────

async function generatePDF(slug, browser) {
  const htmlFile = path.join(ROOT, slug, "index.html");
  const pdfFile  = path.join(ROOT, "pdf", `${slug}.pdf`);

  if (!fs.existsSync(htmlFile)) {
    console.warn(`  Warning: ${htmlFile} not found — run npm run build first`);
    return;
  }

  const page = await browser.newPage();

  // Load local file; waitUntil networkidle0 lets web fonts time out gracefully
  await page.goto(`file://${htmlFile}`, { waitUntil: "networkidle0", timeout: 15000 });

  // Expand all accordion sections so content is fully visible in the PDF
  await page.evaluate(() => {
    document.querySelectorAll(".accordion-body").forEach(body => {
      body.classList.add("open");
      body.style.maxHeight = "none";
      body.style.paddingBottom = "0";
    });
    document.querySelectorAll(".accordion-trigger").forEach(btn => {
      btn.setAttribute("aria-expanded", "true");
      const icon = btn.querySelector(".trigger-icon");
      if (icon) icon.textContent = "−";
    });
  });

  fs.mkdirSync(path.join(ROOT, "pdf"), { recursive: true });

  await page.pdf({
    path:            pdfFile,
    format:          "A4",
    printBackground: true,
    margin: {
      top:    "2cm",
      bottom: "2.5cm",
      left:   "2.2cm",
      right:  "2.2cm",
    },
  });

  await page.close();
  console.log(`  ${slug.padEnd(16)} → pdf/${slug}.pdf`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Lazy-require so the rest of the codebase doesn't need puppeteer-core
  let puppeteer;
  try {
    puppeteer = require("puppeteer-core");
  } catch (e) {
    console.error("Error: puppeteer-core is not installed.");
    console.error("Run: npm install");
    process.exit(1);
  }

  const chromePath = findChrome();
  if (!chromePath) {
    console.error("Error: Could not find Chrome or Chromium.");
    console.error("Install Google Chrome, or set CHROME_PATH to its executable.");
    process.exit(1);
  }

  const site    = loadSiteConfig();
  const slugArg = process.argv[2];
  const slugs   = slugArg ? [slugArg] : site.work;

  console.log(`\nPDF export`);
  console.log(`  Chrome: ${chromePath}`);
  console.log(`  Pages:  ${slugs.join(", ")}\n`);

  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || chromePath,
    headless:       "new",
    args:           ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  for (const slug of slugs) {
    await generatePDF(slug, browser);
  }

  await browser.close();
  console.log(`\nDone.\n`);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
