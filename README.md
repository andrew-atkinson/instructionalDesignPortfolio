# Instructional Design Portfolio

A static site pipeline. Content lives in Markdown files. One command rebuilds the entire site as self-contained HTML, ready for GitHub Pages or Netlify.

---

## Requirements

| Tool | Purpose | Install |
|------|---------|---------|
| [Node.js](https://nodejs.org/) 16+ | Runs the build | `brew install node` |

No other dependencies. Run `npm run build` from the project root.

---

## Project structure

```
instructionalDesignPortfolio/
│
├── index.html               ← Generated home page
├── about/index.html         ← Generated about page
├── cc-series/index.html     ← Generated case study
├── earth-day/index.html     ← Generated case study
│   (one folder per case study, added automatically)
│
├── assets/
│   └── images/              ← Drop images here, reference in front matter
│
├── pdf/                     ← PDF exports (future)
│
└── src/
    ├── site.md              ← SITE MANIFEST — edit to add nav and work items
    ├── content/             ← CONTENT FILES — one .md per page
    │   ├── home.md
    │   ├── about.md
    │   ├── cc-series.md
    │   └── earth-day.md
    ├── data/                ← Generated JSON (do not edit)
    ├── md-to-portfolio.js   ← Pipeline orchestrator
    ├── md-to-json.js        ← Markdown → JSON parser
    ├── json-to-pages.js     ← JSON → HTML renderer
    └── parse-site.js        ← Site manifest parser
```

**Only edit files in `src/content/` and `src/site.md`.** Everything else is generated.

---

## Build

```bash
npm run build
```

Rebuilds all pages from scratch. Output goes to the folders at the project root.

To rebuild a single page:

```bash
node src/md-to-portfolio.js src/content/earth-day.md
```

---

## Adding a new case study

**Step 1 — Create the content file**

Add a new `.md` file to `src/content/`. Use this template:

```markdown
---
title: Your Project Title
subtitle: A short descriptive line
description: One sentence for the home page card.
type: case-study
client: Client Name
year: 2024
tags: [tag-one, tag-two]
---

# Overview

Always-visible introductory paragraph(s). Keep this brief — it's the first
thing a visitor reads.

##! First Section Title

The `##!` marker means this section starts *open* in the accordion.
Use it for the section you most want visitors to read first.

## Second Section Title

The `##` marker means this section starts *closed*. Click to expand.

## Reflection

Closed by default.
```

**Step 2 — Add it to the site manifest**

Open `src/site.md` and add the slug (filename without `.md`) to the `# Work` list in the position you want it to appear on the home page:

```markdown
# Work

- cc-series
- earth-day
- your-new-project    ← add here
```

**Step 3 — Build**

```bash
npm run build
```

The new page is built at `/your-new-project/index.html` and its card appears on the home page.

> **Auto-discovery note:** If you run the build before adding the slug to `site.md`, the page will still be built and accessible — it just won't appear in the home page work grid until you add it to the manifest. The build will print a warning to remind you.

---

## Editing existing content

All content is in `src/content/`. Open the relevant `.md` file, make changes, and run `npm run build`.

| File | Controls |
|------|----------|
| `src/content/home.md` | Home page intro text |
| `src/content/about.md` | About page body |
| `src/content/cc-series.md` | CC1–3 case study |
| `src/content/earth-day.md` | Earth Day case study |
| `src/site.md` | Site title, nav items, work order |

---

## Markdown reference

### Front matter fields

```markdown
---
title: Page Title                    # required
subtitle: Short subtitle             # optional — shown under title
description: One sentence.          # optional — used on home page card
type: case-study                     # home | about | case-study
client: Client Name                  # case studies only
year: 2018                           # case studies only
tags: [tag-one, tag-two]            # case studies only
hero: assets/images/hero.jpg        # optional hero image (future)
---
```

### Section headings

```markdown
# Overview        ← always visible, never in accordion (use for intro)
##! Section       ← accordion section, starts OPEN
## Section        ← accordion section, starts CLOSED
```

### Inline formatting

```markdown
**bold**
*italic*
`code`
[link text](url)
```

### Lists

```markdown
- Unordered item
- Another item

1. Ordered item
2. Another item
```

---

## Updating site-level settings

Open `src/site.md`. The front matter controls site-wide metadata:

```markdown
---
title: Andrew Atkinson          ← appears in nav and page titles
subtitle: Instructional Design Portfolio
author: Andrew Atkinson
baseUrl: https://andrewatkinson.net/id/
---
```

The `# Navigation` section lists slugs that appear in the top nav bar:

```markdown
# Navigation

- about
- another-page
```

The `# Work` section controls which case studies appear on the home page and in what order:

```markdown
# Work

- cc-series
- earth-day
```

---

## Deployment

### GitHub Pages

The project root is the site root. Push to your repo and enable GitHub Pages from the root of the main branch. All generated HTML files are self-contained — no build step needed on the server.

### Netlify (andrewatkinson.net subdomain)

Point Netlify to the repo. No build command is needed if you commit the generated HTML. If you prefer Netlify to run the build, set:

- **Build command:** `npm run build`
- **Publish directory:** `.` (project root)

---

## How the pipeline works

```
src/site.md
src/content/*.md
      │
      ▼  md-to-portfolio.js
      │    reads site.md → nav, work order
      │    scans content/ → discovers all .md files
      │    auto-discovers any case studies not in site.md
      │
      ▼  md-to-json.js  (per file)
      │    parses YAML front matter → meta{}
      │    parses # intro block → intro{}
      │    parses ##/##! sections → sections[]
      │    renders Markdown to HTML
      │    writes src/data/<slug>.json
      │
      ▼  json-to-pages.js  (per file)
           selects page builder by type
           injects nav from siteConfig
           builds work cards for home page
           renders accordion sections
           writes <slug>/index.html
```
