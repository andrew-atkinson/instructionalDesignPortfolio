---
title: coursekit
subtitle: A local-first tool for authoring and auditing course content
description: A local-first command-line tool that turns a course's own material into LMS-ready quizzes and pages, and audits existing content for pedagogical soundness — running on a model the instructor hosts themselves.
type: case-study
client: Personal project
year: 2026–present
tags:
  [
    instructional-design,
    edtech,
    ai-tooling,
    assessment,
    lms,
    local-first,
  ]
---

# Overview

coursekit is a tool I began building in 2026 to close the distance between the material a course already contains and the quizzes, pages, and packaged content an LMS needs. You point it at a week's lectures, readings, or slides; it drafts the quizzes and the teaching page, checks them for pedagogical soundness, and exports them as standard Canvas, Common Cartridge, or Moodle files — without the course material ever leaving the instructor's machine. It is a working prototype: today a command-line tool for the technically comfortable, with the friendlier interface still ahead.

**Repository:** [github.com/andrew-atkinson/quizbot](https://github.com/andrew-atkinson/quizbot)

##! The Premise

Most tools in this space generate: they take a prompt and produce a quiz. But a quiz that _looks_ like a quiz is easy to produce and hard to trust — it can be factually wrong, test something the course never taught, or be technically correct and pedagogically inert. coursekit is built on the premise that generation without evaluation is not useful to a teacher. So it both drafts content and _measures_ whether the result is sound — reading each page and quiz back and reporting on three axes: whether it is correct, whether it holds attention and signals its structure, and whether it actually delivers each concept — as coaching rather than a pass/fail grade.

The second premise is that the instructor's material is theirs. coursekit runs against a model the instructor hosts locally, so content and intellectual property stay on their own machine. Because it emits standard import files rather than pushing through a platform's API, it also works for adjunct and contingent faculty who often cannot get an LMS admin account or token at all.

## How it works

Every learning-management system speaks its own dialect, and every source document arrives in its own shape. coursekit resolves both by converging everything on a single canonical form — one neutral JSON representation per quiz bank and per page — that every exporter reads from, so adding a platform is one emitter, not a rewrite. The workflow moves through four phases: _ingest_ turns documents into clean week text, _analyze_ builds the concept map that grounds generation, _generate_ produces the quizzes and pages, and _emit_ packages the JSON into LMS files with no model involved, so the export step is deterministic and reviewable. A per-course domain profile pins every generator to the correct knowledge domain and corrects a transcript that drifts — the main defence against output that is plausible but wrong.
