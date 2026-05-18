#!/usr/bin/env node
/**
 * md-to-portfolio.js
 * Portfolio build pipeline.
 *
 * Usage:
 *   node src/md-to-portfolio.js          # full build
 *   node src/md-to-portfolio.js [file]   # rebuild one page
 *
 * How it works:
 *   1. Read src/site.md for nav and work order.
 *   2. Scan src/content/ and parse every .md file.
 *   3. Build work grid: site.md order first, then any auto-discovered
 *      case studies not yet listed there.
 *   4. Render and write all HTML pages.
 */

"use strict";

const fs   = require("fs");
const path = require("path");

const { parsePortfolioMD } = require("./md-to-json.js");
const { buildPage }        = require("./json-to-pages.js");
const { loadSiteConfig }   = require("./parse-site.js");

const ROOT    = path.resolve(__dirname, "..");
const CONTENT = path.join(__dirname, "content");
const DATA    = path.join(__dirname, "data");

// ── Output path resolution ────────────────────────────────────────────────────

const FIXED_PATHS = {
  home:  { outDir: ROOT,                     rootPath: "./"  },
  about: { outDir: path.join(ROOT, "about"), rootPath: "../" },
};

function getOutputConfig(slug) {
  if (FIXED_PATHS[slug]) return FIXED_PATHS[slug];
  return { outDir: path.join(ROOT, slug), rootPath: "../" };
}

// ── Parse all content files ───────────────────────────────────────────────────

function parseAllContent() {
  const files = fs.readdirSync(CONTENT)
    .filter(f => f.endsWith(".md"))
    .map(f => path.join(CONTENT, f));

  const pages = {};
  for (const f of files) {
    const slug = path.basename(f, ".md");
    const md   = fs.readFileSync(f, "utf8");
    pages[slug] = { slug, json: parsePortfolioMD(md), srcPath: f };
  }
  return pages;
}

// ── Build work order ──────────────────────────────────────────────────────────
// Combines the explicit order from site.md with any auto-discovered
// case studies not yet listed there.

function buildWorkOrder(siteWork, pages) {
  const listed   = new Set(siteWork);
  const extra    = Object.values(pages)
    .filter(p => p.json.meta.type === "case-study" && !listed.has(p.slug))
    .map(p => p.slug);

  if (extra.length) {
    console.log(`  Auto-discovered case studies not in site.md: ${extra.join(", ")}`);
    console.log(`  They will appear at the end of the work grid.`);
    console.log(`  Add them to src/site.md # Work to control their position.\n`);
  }

  // Keep only slugs that actually have a parsed page
  return [...siteWork, ...extra].filter(slug => pages[slug]);
}

// ── Build nav items ───────────────────────────────────────────────────────────

function buildNavItems(siteNav, pages) {
  return siteNav
    .filter(slug => pages[slug])
    .map(slug => ({
      slug,
      label: pages[slug].json.meta.title || slug,
      href:  slug === "home" ? "./" : `../${slug}/`,
    }));
}

// ── Process one page ──────────────────────────────────────────────────────────

function processPage(slug, json, options) {
  const config   = getOutputConfig(slug);
  const pdfPath  = (json.meta.type === "case-study")
    ? `../pdf/${slug}.pdf`
    : undefined;

  const html = buildPage(json, {
    rootPath:   config.rootPath,
    pdfPath,
    activePage: slug,
    ...options,
  });

  // Write JSON
  fs.mkdirSync(DATA, { recursive: true });
  const jsonOut = path.join(DATA, slug + ".json");
  fs.writeFileSync(jsonOut, JSON.stringify(json, null, 2));

  // Write HTML
  fs.mkdirSync(config.outDir, { recursive: true });
  const htmlOut = path.join(config.outDir, "index.html");
  fs.writeFileSync(htmlOut, html);

  console.log(`  ${slug.padEnd(16)} → ${path.relative(ROOT, htmlOut)}  (${Math.round(html.length / 1024)}kb)`);
  return htmlOut;
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const singleArg = process.argv[2];
  const site      = loadSiteConfig();
  const pages     = parseAllContent();
  const workOrder = buildWorkOrder(site.work, pages);
  const navItems  = buildNavItems(site.nav, pages);

  // Shared options passed to every page renderer
  const sharedOptions = {
    siteConfig: { ...site.meta, nav: navItems, work: workOrder },
    allPages:   pages,
  };

  console.log(`\nPortfolio build`);
  console.log(`  Site:  ${site.meta.title || "unnamed"}`);
  console.log(`  Nav:   ${navItems.map(n => n.slug).join(", ") || "(none)"}`);
  console.log(`  Work:  ${workOrder.join(", ") || "(none)"}`);
  console.log(`  Pages: ${Object.keys(pages).length} found\n`);

  const slugsToBuild = singleArg
    ? [path.basename(singleArg, ".md")]
    : Object.keys(pages);

  for (const slug of slugsToBuild) {
    if (!pages[slug]) {
      console.warn(`  Warning: no content file found for slug "${slug}"`);
      continue;
    }
    processPage(slug, pages[slug].json, sharedOptions);
  }

  console.log(`\nDone.\n`);
}

main();
