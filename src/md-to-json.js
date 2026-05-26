#!/usr/bin/env node
/**
 * md-to-json.js
 *
 * Parses a portfolio Markdown file into structured JSON.
 *
 * MD format:
 *   ---
 *   title: Page Title
 *   subtitle: Optional subtitle
 *   type: home | about | case-study
 *   client: Vidcode
 *   year: 2018
 *   tags: [tag-one, tag-two]
 *   hero: assets/images/hero.jpg
 *   ---
 *
 *   # Overview (or page intro — always-visible, never in accordion)
 *
 *   Body text...
 *
 *   ##! Section Title   ← starts OPEN in accordion
 *   ## Section Title    ← starts CLOSED in accordion
 *
 * Output shape:
 *   {
 *     meta: { title, subtitle, type, client, year, tags, hero },
 *     intro: { body: string },          // content under # heading
 *     sections: [
 *       {
 *         title: string,
 *         body: string,                 // raw markdown prose
 *         startOpen: boolean
 *       }
 *     ]
 *   }
 */

"use strict";

const fs   = require("fs");
const path = require("path");

// ── YAML front matter parser ──────────────────────────────────────────────────

function parseFrontMatter(text) {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!match) return { meta: {}, body: text };

  const meta = {};
  for (const line of match[1].split("\n")) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (!m) continue;
    const [, key, val] = m;
    if (val.startsWith("[") && val.endsWith("]")) {
      meta[key] = val.slice(1, -1).split(",").map(s => s.trim());
    } else {
      meta[key] = val.trim();
    }
  }

  return { meta, body: text.slice(match[0].length) };
}

// ── Section splitter ──────────────────────────────────────────────────────────

function parseSections(body) {
  const lines   = body.split("\n");
  let intro     = null;
  const sections = [];
  let current   = null;
  let buf       = [];

  function flush() {
    if (current !== null) {
      sections.push({ ...current, body: buf.join("\n").trim() });
    } else if (buf.length) {
      intro = { body: buf.join("\n").trim() };
    }
    buf = [];
  }

  for (const line of lines) {
    // H1 — intro heading (title text discarded; content beneath it is intro)
    if (/^#\s+/.test(line) && !/^##/.test(line)) {
      flush();
      current = null;
      continue;
    }

    // ##! or ## — accordion section
    const secMatch = line.match(/^(##!?)\s+(.+)$/);
    if (secMatch) {
      flush();
      current = {
        title:     secMatch[2].trim(),
        startOpen: secMatch[1] === "##!",
      };
      continue;
    }

    buf.push(line);
  }
  flush();

  return { intro, sections };
}

// ── Inline markdown → HTML ────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const EXT_ICON = `<svg class="ext-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 9V1h4v1H2v7h7V5h1v4H1z"/><path d="M9 1H6l1.1 1.1L4 5.2l.8.8 3.1-3.1L9 4V1z"/></svg>`;

// Apply bold / italic / code patterns to an already-HTML-escaped string.
// Used both for body text and for link label text.
function applyFormatting(text) {
  text = text.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>");
  text = text.replace(/\*\*([^*]+)\*\*/g,     "<strong>$1</strong>");
  text = text.replace(/\*([^*\n]+)\*/g,        "<em>$1</em>");
  text = text.replace(/_([^_\n]+)_/g,          "<em>$1</em>");
  text = text.replace(/`([^`]+)`/g,            "<code>$1</code>");
  return text;
}

function renderInline(text) {
  // markdown links must be captured first, before bare URL replacement
  // runs — otherwise the URL inside [text](url) gets clobbered
  const links = [];
  text = text.replace(/\[([^\]]*)\]\(([^)]+)\)/g, (_, label, href) => {
    links.push({ label, href }); return `\x01L${links.length - 1}\x01`;
  });

  // protect remaining bare URLs; strip trailing sentence punctuation
  // so that "visit https://example.com." doesn't include the period in the href
  const urls = [];
  text = text.replace(/(https?:\/\/[^\s)<]+)/g, url => {
    url = url.replace(/[.,;:!?]+$/, "");
    urls.push(url); return `\x00U${urls.length - 1}\x00`;
  });

  text = applyFormatting(escapeHtml(text));

  // restore links — apply formatting to label so _italic_ and **bold** render
  text = text.replace(/\x01L(\d+)\x01/g, (_, i) => {
    const { label, href } = links[parseInt(i)];
    const isExt = /^https?:\/\//i.test(href);
    const attrs = isExt ? ' target="_blank" rel="noopener external"' : "";
    const icon  = isExt ? EXT_ICON : "";
    return `<a href="${escapeHtml(href)}"${attrs}>${applyFormatting(escapeHtml(label))}${icon}</a>`;
  });

  // restore bare URLs
  text = text.replace(/\x00U(\d+)\x00/g, (_, i) => {
    const url = urls[parseInt(i)];
    return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener external">${escapeHtml(url)}${EXT_ICON}</a>`;
  });

  return text;
}

// ── Block markdown → HTML ─────────────────────────────────────────────────────

function renderBody(md) {
  if (!md) return "";
  const lines  = md.split("\n");
  const out    = [];
  let inUl     = false;
  let inOl     = false;
  let inCode   = false;
  let codeBuf  = [];
  let paraBuf  = [];

  function flushPara() {
    if (!paraBuf.length) return;
    const text = paraBuf.join(" ").trim();
    if (text) out.push(`<p>${renderInline(text)}</p>`);
    paraBuf = [];
  }
  function flushUl() {
    if (inUl) { out.push("</ul>"); inUl = false; }
  }
  function flushOl() {
    if (inOl) { out.push("</ol>"); inOl = false; }
  }

  for (const raw of lines) {
    const line = raw;

    // fenced code block
    if (/^```/.test(line)) {
      if (inCode) {
        out.push(`<pre><code>${codeBuf.join("\n")}</code></pre>`);
        codeBuf = []; inCode = false;
      } else {
        flushPara(); flushUl(); flushOl(); inCode = true;
      }
      continue;
    }
    if (inCode) { codeBuf.push(escapeHtml(line)); continue; }

    // blank line
    if (!line.trim()) {
      flushPara(); flushUl(); flushOl(); continue;
    }

    // h3
    const h3 = line.match(/^###\s+(.+)/);
    if (h3) {
      flushPara(); flushUl(); flushOl();
      out.push(`<h3>${renderInline(h3[1])}</h3>`);
      continue;
    }

    // h4
    const h4 = line.match(/^####\s+(.+)/);
    if (h4) {
      flushPara(); flushUl(); flushOl();
      out.push(`<h4>${renderInline(h4[1])}</h4>`);
      continue;
    }

    // unordered list
    const ulItem = line.match(/^[-*]\s+(.+)/);
    if (ulItem) {
      flushPara();
      if (!inUl) { flushOl(); out.push("<ul>"); inUl = true; }
      out.push(`<li>${renderInline(ulItem[1])}</li>`);
      continue;
    }

    // ordered list
    const olItem = line.match(/^\d+\.\s+(.+)/);
    if (olItem) {
      flushPara();
      if (!inOl) { flushUl(); out.push("<ol>"); inOl = true; }
      out.push(`<li>${renderInline(olItem[1])}</li>`);
      continue;
    }

    // arrow links (→ [text](href))
    const arrow = line.match(/^→\s+(.+)/);
    if (arrow) {
      flushPara(); flushUl(); flushOl();
      out.push(`<p class="arrow-link">${renderInline("→ " + arrow[1])}</p>`);
      continue;
    }

    // float-left image: !<[alt](src)
    const imgLeft = line.match(/^!<\[([^\]]*)\]\(([^)]+)\)/);
    if (imgLeft) {
      flushPara(); flushUl(); flushOl();
      const alt = escapeHtml(imgLeft[1]);
      const src = escapeHtml(imgLeft[2]);
      out.push(`<figure class="content-figure content-figure--left"><img src="${src}" alt="${alt}" loading="lazy"></figure>`);
      continue;
    }

    // float-right image: !>[alt](src)
    const imgRight = line.match(/^!>\[([^\]]*)\]\(([^)]+)\)/);
    if (imgRight) {
      flushPara(); flushUl(); flushOl();
      const alt = escapeHtml(imgRight[1]);
      const src = escapeHtml(imgRight[2]);
      out.push(`<figure class="content-figure content-figure--right"><img src="${src}" alt="${alt}" loading="lazy"></figure>`);
      continue;
    }

    // standard full-width image: ![alt](src)
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (imgMatch) {
      flushPara(); flushUl(); flushOl();
      const alt = escapeHtml(imgMatch[1]);
      const src = escapeHtml(imgMatch[2]);
      out.push(`<figure class="content-figure"><img src="${src}" alt="${alt}" loading="lazy"></figure>`);
      continue;
    }

    // horizontal rule
    if (/^---+$/.test(line.trim())) {
      flushPara(); flushUl(); flushOl();
      out.push("<hr>");
      continue;
    }

    // accumulate paragraph
    flushUl(); flushOl();
    paraBuf.push(line);
  }

  flushPara(); flushUl(); flushOl();
  return out.join("\n");
}

// ── Main export ───────────────────────────────────────────────────────────────

function parsePortfolioMD(mdText) {
  const { meta, body }      = parseFrontMatter(mdText);
  const { intro, sections } = parseSections(body);

  return {
    meta,
    intro:    intro    ? { ...intro,   html: renderBody(intro.body)   } : null,
    sections: sections.map(s => ({ ...s, html: renderBody(s.body) })),
  };
}

module.exports = { parsePortfolioMD, renderInline, renderBody, escapeHtml, applyFormatting };

// ── CLI ───────────────────────────────────────────────────────────────────────

if (require.main === module) {
  const inputFile  = process.argv[2];
  if (!inputFile) {
    console.error("Usage: node md-to-json.js <input.md> [output.json]");
    process.exit(1);
  }
  const outputFile = process.argv[3] ||
    path.join(path.dirname(inputFile), "..", "data",
      path.basename(inputFile, ".md") + ".json");

  const md   = fs.readFileSync(inputFile, "utf8");
  const json = parsePortfolioMD(md);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(json, null, 2));
  console.log(`Wrote ${outputFile}`);
}
