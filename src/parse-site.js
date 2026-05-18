#!/usr/bin/env node
/**
 * parse-site.js
 *
 * Parses src/site.md into a site configuration object.
 *
 * Output shape:
 *   {
 *     meta: {
 *       title:    string,   // site/author name
 *       subtitle: string,   // portfolio tagline
 *       author:   string,
 *       baseUrl:  string,
 *     },
 *     nav:  string[],  // ordered slugs for top nav (e.g. ["about"])
 *     work: string[],  // ordered slugs for home page work grid
 *   }
 */

"use strict";

const fs   = require("fs");
const path = require("path");

const SITE_MD = path.join(__dirname, "site.md");

function parseSiteConfig(mdText) {
  // ── Front matter ────────────────────────────────────────────────────────────
  const fmMatch = mdText.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  const meta = {};
  if (fmMatch) {
    for (const line of fmMatch[1].split("\n")) {
      const m = line.match(/^(\w+):\s*(.+)$/);
      if (m) meta[m[1]] = m[2].trim();
    }
  }

  // ── Section splitter ─────────────────────────────────────────────────────────
  const body = fmMatch ? mdText.slice(fmMatch[0].length) : mdText;

  // Extract bullet list items from a named # section
  function extractList(sectionName) {
    const re = new RegExp(
      `#\\s+${sectionName}[\\s\\S]*?(?=\\n#\\s|$)`, "i"
    );
    const match = body.match(re);
    if (!match) return [];

    return match[0]
      .split("\n")
      .filter(l => /^\s*-\s+\S/.test(l))
      .map(l => l.replace(/^\s*-\s+/, "").trim())
      // strip any trailing comment after whitespace
      .filter(Boolean);
  }

  return {
    meta,
    nav:  extractList("Navigation"),
    work: extractList("Work"),
  };
}

function loadSiteConfig() {
  if (!fs.existsSync(SITE_MD)) {
    console.warn("Warning: src/site.md not found — using empty site config.");
    return { meta: {}, nav: [], work: [] };
  }
  return parseSiteConfig(fs.readFileSync(SITE_MD, "utf8"));
}

module.exports = { parseSiteConfig, loadSiteConfig };
