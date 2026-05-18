#!/usr/bin/env node
/**
 * json-to-pages.js
 *
 * Renders a portfolio JSON object into a self-contained HTML page.
 *
 * Exports:
 *   buildPage(json, options)  → HTML string
 *
 * options: {
 *   rootPath: string   // relative path back to site root (e.g. "../")
 *   pdfPath:  string   // relative path to PDF export (optional)
 * }
 */

"use strict";

const fs   = require("fs");
const path = require("path");

// ── Asset path resolver ───────────────────────────────────────────────────────
// Inline HTML from the parser uses root-relative paths like assets/images/...
// This rewrites them to be correct relative to the current page depth.

function resolveAssets(html, rootPath) {
  if (!html) return html;
  return html.replace(/\bsrc="assets\//g, `src="${rootPath}assets/`);
}

// ── Nav HTML ──────────────────────────────────────────────────────────────────

function renderNav(rootPath, activePage, siteConfig) {
  const brandName = (siteConfig && siteConfig.title) || "Andrew Atkinson";
  const homeHref  = rootPath + "index.html";
  const navItems  = (siteConfig && siteConfig.nav) || [
    { slug: "about", label: "About", href: rootPath + "about/" }
  ];

  const links = navItems.map(item => {
    const href    = item.href || (rootPath + item.slug + "/");
    const isActive = activePage === item.slug;
    return `<li><a href="${href}"${isActive ? ' class="active"' : ""}>${item.label || item.slug}</a></li>`;
  }).join("\n        ");

  return `
  <nav class="site-nav">
    <a class="nav-home" href="${homeHref}"${activePage === "home" ? ' aria-current="page"' : ""}>${brandName}</a>
    <ul class="nav-links">
      ${links}
    </ul>
  </nav>`;
}

// ── Meta strip (case studies) ─────────────────────────────────────────────────

function renderCaseMeta(meta, pdfPath) {
  const items = [];

  if (meta.client) items.push(`
    <div class="meta-item">
      <span class="meta-label">Client</span>
      <span class="meta-value">${meta.client}</span>
    </div>`);

  if (meta.year) items.push(`
    <div class="meta-item">
      <span class="meta-label">Year</span>
      <span class="meta-value">${meta.year}</span>
    </div>`);

  if (meta.tags && meta.tags.length) {
    const tagHtml = meta.tags.map(t =>
      `<span class="tag">${t}</span>`).join("\n        ");
    items.push(`
    <div class="meta-item">
      <span class="meta-label">Tags</span>
      <div class="meta-tags">${tagHtml}</div>
    </div>`);
  }

  const pdfBtn = pdfPath
    ? `<a class="pdf-link" href="${pdfPath}" target="_blank">Download PDF ↓</a>`
    : "";

  return `<div class="case-meta">${items.join("")}${pdfBtn}</div>`;
}

// ── Accordion sections ────────────────────────────────────────────────────────

function renderAccordion(sections) {
  if (!sections.length) return "";

  const items = sections.map((sec, i) => {
    const id      = `sec-${i}`;
    const isOpen  = sec.startOpen;
    return `
    <div class="accordion-item">
      <button class="accordion-trigger" aria-expanded="${isOpen}" aria-controls="${id}">
        <span class="trigger-title">${sec.title}</span>
        <span class="trigger-icon" aria-hidden="true">${isOpen ? "−" : "+"}</span>
      </button>
      <div class="accordion-body${isOpen ? " open" : ""}" id="${id}" role="region">
        <div class="accordion-content">
          ${sec.html}
        </div>
      </div>
    </div>`;
  }).join("\n");

  return `<div class="accordion" role="list">${items}\n  </div>`;
}

// ── Page builders ─────────────────────────────────────────────────────────────

function buildHomePage(json, options = {}) {
  const { rootPath = "./", siteConfig, allPages } = options;
  const { meta, intro } = json;

  // Build work cards from site.md work order + allPages metadata
  let workCards = "";
  const workOrder = siteConfig && siteConfig.work ? siteConfig.work : [];
  if (workOrder.length && allPages) {
    const cards = workOrder
      .filter(slug => allPages[slug])
      .map(slug => {
        const page = allPages[slug];
        const m    = page.json.meta;
        const title  = m.title || slug;
        const desc   = m.description || m.subtitle || "";
        const client = m.client || "";
        const href   = rootPath + slug + "/";
        return { title, desc, client, href };
      });

    if (cards.length) {
      workCards = `<div class="work-grid">` +
        cards.map(c => `
      <a class="work-card" href="${c.href}">
        <div class="card-eyebrow">Case Study${c.client ? ` · ${c.client}` : ""}</div>
        <div class="card-title">${c.title}</div>
        <div class="card-desc">${c.desc}</div>
        <span class="card-arrow">View project →</span>
      </a>`).join("") +
        `\n    </div>`;
    }
  }

  const introHtml = resolveAssets(intro ? intro.html : "", rootPath);
  const heroHtml  = meta.hero
    ? `<div class="page-hero"><img src="${rootPath}${meta.hero}" alt="${meta.title}"></div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${meta.title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${rootPath}assets/css/style.css">
</head>
<body>
  <div class="site-wrap">
    ${renderNav(rootPath, "home", siteConfig)}

    <header class="page-header">
      <h1>${meta.title}</h1>
      ${meta.subtitle ? `<p class="subtitle">${meta.subtitle}</p>` : ""}
    </header>

    ${heroHtml}

    <div class="page-intro">
      ${introHtml}
    </div>

    ${workCards}

    <footer class="site-footer">
      <p>Andrew Atkinson · Instructional Design Portfolio</p>
    </footer>
  </div>
  <script src="${rootPath}assets/js/accordion.js"></script>
</body>
</html>`;
}

function buildAboutPage(json, options = {}) {
  const { rootPath = "../", siteConfig } = options;
  const { meta, intro } = json;
  const siteTitle = (siteConfig && siteConfig.title) || "Andrew Atkinson";

  const portraitHtml = meta.portrait
    ? `<img class="about-portrait" src="${rootPath}${meta.portrait}" alt="Andrew Atkinson">`
    : "";
  const introHtml = resolveAssets(intro ? intro.html : "", rootPath);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${meta.title} · ${siteTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${rootPath}assets/css/style.css">
</head>
<body>
  <div class="site-wrap">
    ${renderNav(rootPath, "about", siteConfig)}

    <header class="page-header">
      <h1>${meta.title}</h1>
    </header>

    <div class="about-body">
      ${portraitHtml}
      ${introHtml}
    </div>

    <footer class="site-footer">
      <p>Andrew Atkinson · Instructional Design Portfolio</p>
    </footer>
  </div>
</body>
</html>`;
}

function buildCaseStudyPage(json, options = {}) {
  const { rootPath = "../", pdfPath, activePage, siteConfig } = options;
  const { meta, intro, sections } = json;
  const siteTitle = (siteConfig && siteConfig.title) || "Andrew Atkinson";

  const heroHtml = meta.hero
    ? `<div class="page-hero"><img src="${rootPath}${meta.hero}" alt="${meta.title}"></div>`
    : "";

  const introHtml    = resolveAssets(intro ? intro.html : "", rootPath);
  const resolvedSecs = sections.map(s => ({ ...s, html: resolveAssets(s.html, rootPath) }));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${meta.title} · ${siteTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${rootPath}assets/css/style.css">
</head>
<body>
  <div class="site-wrap">
    ${renderNav(rootPath, activePage || "", siteConfig)}

    <header class="page-header">
      <p class="eyebrow">Case Study</p>
      <h1>${meta.title}</h1>
      ${meta.subtitle ? `<p class="subtitle">${meta.subtitle}</p>` : ""}
    </header>

    ${heroHtml}

    ${renderCaseMeta(meta, pdfPath)}

    ${introHtml ? `<div class="page-intro">${introHtml}</div>` : ""}

    ${renderAccordion(resolvedSecs)}

    <footer class="site-footer">
      <p>Andrew Atkinson · Instructional Design Portfolio</p>
    </footer>
  </div>
  <script src="${rootPath}assets/js/accordion.js"></script>
</body>
</html>`;
}

// ── Main export ───────────────────────────────────────────────────────────────

function buildPage(json, options = {}) {
  const type = (json.meta && json.meta.type) || "about";
  if (type === "home")        return buildHomePage(json, options);
  if (type === "about")       return buildAboutPage(json, options);
  if (type === "case-study")  return buildCaseStudyPage(json, options);
  return buildAboutPage(json, options);
}

module.exports = { buildPage };
