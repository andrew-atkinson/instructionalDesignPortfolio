#!/usr/bin/env node
/**
 * test-parser.js
 *
 * Tests for md-to-json.js (parsePortfolioMD / renderBody / renderInline).
 * Run with: npm test
 *
 * Each test() call prints ✓ or ✗ and reports a final pass/fail count.
 * Exits with code 1 if any test fails.
 */

"use strict";

const assert = require("assert");
const path   = require("path");
const fs     = require("fs");

const { parsePortfolioMD, renderBody, renderInline } = require("./md-to-json");

// ── Helpers ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗  ${name}`);
    console.log(`       ${e.message}`);
    failed++;
  }
}

function contains(html, substring, msg) {
  assert.ok(
    html.includes(substring),
    msg || `Expected HTML to contain:\n       ${substring}\n       Got:\n       ${html.slice(0, 300)}`
  );
}

function notContains(html, substring, msg) {
  assert.ok(
    !html.includes(substring),
    msg || `Expected HTML NOT to contain: ${substring}`
  );
}

// ── Load fixture ──────────────────────────────────────────────────────────────

const fixturePath = path.join(__dirname, "content", "test-fixture.md");
const md     = fs.readFileSync(fixturePath, "utf8");
const result = parsePortfolioMD(md);
const { meta, intro, sections } = result;

// ── Front matter ──────────────────────────────────────────────────────────────

console.log("\nFront matter\n");

test("title", () => assert.strictEqual(meta.title, "Parser Test Fixture"));
test("subtitle", () => assert.strictEqual(meta.subtitle, "All Markdown Features"));
test("type", () => assert.strictEqual(meta.type, "case-study"));
test("client", () => assert.strictEqual(meta.client, "Test Suite"));
test("year", () => assert.strictEqual(meta.year, "2024"));
test("hero", () => assert.strictEqual(meta.hero, "assets/images/test-hero.jpg"));
test("tags is array", () => assert.ok(Array.isArray(meta.tags)));
test("tags has 3 items", () => assert.strictEqual(meta.tags.length, 3));
test("tags[0]", () => assert.strictEqual(meta.tags[0], "tag-one"));
test("tags[1]", () => assert.strictEqual(meta.tags[1], "tag-two"));
test("tags[2]", () => assert.strictEqual(meta.tags[2], "tag-three"));

// ── Intro section ─────────────────────────────────────────────────────────────

console.log("\nIntro section\n");

test("intro exists", () => assert.ok(intro !== null));
test("intro has html", () => assert.ok(intro.html && intro.html.length > 0));
test("intro has paragraphs", () => contains(intro.html, "<p>"));

// ── Sections ──────────────────────────────────────────────────────────────────

console.log("\nSections\n");

test("correct section count", () => assert.strictEqual(sections.length, 4));

test("section 0 title: Open Accordion", () =>
  assert.strictEqual(sections[0].title, "Open Accordion Section"));
test("section 0 startOpen: true (##!)", () =>
  assert.strictEqual(sections[0].startOpen, true));

test("section 1 title: Closed Accordion", () =>
  assert.strictEqual(sections[1].title, "Closed Accordion Section"));
test("section 1 startOpen: false (##)", () =>
  assert.strictEqual(sections[1].startOpen, false));

test("section 2 title: Images", () =>
  assert.strictEqual(sections[2].title, "Images Section"));
test("section 3 title: Arrow Links", () =>
  assert.strictEqual(sections[3].title, "Arrow Links Section"));

// ── Inline formatting ─────────────────────────────────────────────────────────

console.log("\nInline formatting\n");

test("**bold** → <strong>",         () => contains(intro.html, "<strong>bold text</strong>"));
test("*italic* → <em>",             () => contains(intro.html, "<em>italic text</em>"));
test("_also italic_ → <em>",        () => contains(intro.html, "<em>also italic</em>"));
test("***bold italic*** → combined", () => contains(intro.html, "<strong><em>bold and italic</em></strong>"));
test("`code` → <code>",             () => contains(intro.html, "<code>inline code</code>"));

// ── Links ─────────────────────────────────────────────────────────────────────

console.log("\nLinks\n");

test("internal link has correct href",
  () => contains(intro.html, 'href="about/"'));
test("internal link has no target=_blank",
  () => {
    // extract just the internal link tag
    const m = intro.html.match(/<a href="about\/"[^>]*>/);
    assert.ok(m, "Could not find internal link tag");
    assert.ok(!m[0].includes("target"), "Internal link should not have target attribute");
  });

test("external link has target=_blank",
  () => contains(intro.html, 'href="https://example.com" target="_blank"'));
test("external link has rel=noopener",
  () => {
    const m = intro.html.match(/href="https:\/\/example\.com"[^>]*/);
    assert.ok(m && m[0].includes("noopener"), "External link missing noopener");
  });
test("external link has ext-icon SVG",
  () => {
    // find the example.com link and check icon is present nearby
    const idx = intro.html.indexOf('href="https://example.com"');
    const snippet = intro.html.slice(idx, idx + 300);
    assert.ok(snippet.includes("ext-icon"), "External link missing ext-icon");
  });

test("bare URL renders as link",
  () => contains(intro.html, 'href="https://example.org"'));
test("bare URL link is external",
  () => {
    const m = intro.html.match(/href="https:\/\/example\.org"[^>]*/);
    assert.ok(m && m[0].includes("target=\"_blank\""), "Bare URL missing target=_blank");
  });
test("bare URL strips trailing period",
  () => {
    notContains(intro.html, 'href="https://example.org."');
    contains(intro.html, 'href="https://example.org"');
  });
test("bare URL strips trailing comma",
  () => {
    notContains(intro.html, 'href="https://example.org/comma,"');
    contains(intro.html, 'href="https://example.org/comma"');
  });
test("bare URL strips trailing semicolon",
  () => {
    notContains(intro.html, 'href="https://example.org/semi;"');
    contains(intro.html, 'href="https://example.org/semi"');
  });

// ── Link-before-URL ordering (regression for the ordering bug) ────────────────

console.log("\nLink / URL ordering (regression)\n");

test("markdown link href not clobbered by bare URL pass",
  () => contains(intro.html, 'href="https://linked.example.com/path"'));
test("markdown link label preserved when URL follows in same paragraph",
  () => contains(intro.html, ">markdown link with a full URL<"));
test("bare URL after markdown link still renders",
  () => contains(intro.html, 'href="https://bare.example.com"'));
test("no raw placeholder tokens in output",
  () => {
    notContains(intro.html, "\x00U", "Raw URL placeholder found in output");
    notContains(intro.html, "\x01L", "Raw link placeholder found in output");
  });

// ── Formatted link labels ─────────────────────────────────────────────────────

console.log("\nFormatted link labels\n");

test("italic label → <em> inside <a>",
  () => contains(intro.html, '<a href="about/"><em>italic label</em></a>'));
test("bold label → <strong> inside <a>",
  () => contains(intro.html, '<strong>bold label</strong>'));
test("bold label link is external",
  () => contains(intro.html, 'href="https://example.com/bold" target="_blank"'));
test("italic label: no raw underscores in output",
  () => {
    const idx = intro.html.indexOf('href="about/"');
    const snippet = intro.html.slice(idx, idx + 100);
    assert.ok(!snippet.includes("_italic label_"), "Raw underscores found in link label");
  });

// ── Block elements ────────────────────────────────────────────────────────────

console.log("\nBlock elements\n");

const sec0 = sections[0].html;
const sec1 = sections[1].html;

test("unordered list → <ul>",   () => contains(sec0, "<ul>"));
test("unordered list items",    () => contains(sec0, "<li>First item</li>"));
test("ordered list → <ol>",    () => contains(sec0, "<ol>"));
test("ordered list items",      () => contains(sec0, "<li>One</li>"));

test("### → <h3>",  () => contains(sec1, "<h3>A Subheading</h3>"));
test("#### → <h4>", () => contains(sec1, "<h4>A Smaller Subheading</h4>"));
test("--- → <hr>",  () => contains(sec1, "<hr>"));

test("fenced code block → <pre><code>",
  () => contains(sec1, "<pre><code>"));
test("code block content preserved",
  () => contains(sec1, "const x = 1;"));
test("code block does not render as paragraph",
  () => notContains(sec1, "<p>const x"));

// ── Images ────────────────────────────────────────────────────────────────────

console.log("\nImages\n");

const sec2 = sections[2].html;

// ── Image file existence ──
const siteRoot = path.join(__dirname, "..");

function imageExists(relativePath) {
  return fs.existsSync(path.join(siteRoot, relativePath));
}

test("hero image file exists",
  () => assert.ok(imageExists(meta.hero), `Missing file: ${meta.hero}`));
test("standard image file exists",
  () => assert.ok(imageExists("assets/images/standard.jpg"), "Missing: assets/images/standard.jpg"));
test("float-left image file exists",
  () => assert.ok(imageExists("assets/images/left.jpg"), "Missing: assets/images/left.jpg"));
test("float-right image file exists",
  () => assert.ok(imageExists("assets/images/right.jpg"), "Missing: assets/images/right.jpg"));

test("standard image → content-figure",
  () => contains(sec2, 'class="content-figure"'));
test("standard image not float",
  () => {
    const m = sec2.match(/class="content-figure"[^>]*>.*?standard\.jpg/s);
    // The standard figure should not have --left or --right classes
    const tag = sec2.match(/<figure class="content-figure">/);
    assert.ok(tag, "Standard figure class not found");
  });
test("standard image alt text",
  () => contains(sec2, 'alt="Alt text for standard image"'));
test("standard image src",
  () => contains(sec2, 'src="assets/images/standard.jpg"'));

test("float-left → content-figure--left",
  () => contains(sec2, 'class="content-figure content-figure--left"'));
test("float-left alt text",
  () => contains(sec2, 'alt="Alt text for left image"'));
test("float-left src",
  () => contains(sec2, 'src="assets/images/left.jpg"'));

test("float-right → content-figure--right",
  () => contains(sec2, 'class="content-figure content-figure--right"'));
test("float-right alt text",
  () => contains(sec2, 'alt="Alt text for right image"'));
test("float-right src",
  () => contains(sec2, 'src="assets/images/right.jpg"'));

test("images have loading=lazy",
  () => contains(sec2, 'loading="lazy"'));

// ── Arrow links ───────────────────────────────────────────────────────────────

console.log("\nArrow links\n");

const sec3 = sections[3].html;

test("arrow link → class=arrow-link",
  () => contains(sec3, 'class="arrow-link"'));
test("arrow link internal href",
  () => contains(sec3, 'href="assets/files/report.pdf"'));
test("arrow link external href",
  () => contains(sec3, 'href="https://example.com/project"'));
test("arrow character preserved in output",
  () => contains(sec3, "→"));

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(40)}`);
console.log(`  ${passed} passed  ·  ${failed} failed`);
console.log(`${"─".repeat(40)}\n`);

if (failed > 0) process.exit(1);
