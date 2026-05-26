---
title: Parser Test Fixture
subtitle: All Markdown Features
description: A comprehensive fixture covering every supported markdown element.
type: case-study
client: Test Suite
year: 2024
tags: [tag-one, tag-two, tag-three]
hero: assets/images/test-hero.jpg
---

# Intro Section

Intro paragraph with **bold text**, *italic text*, _also italic_, ***bold and italic***, and `inline code`.

A second paragraph with an [internal link](about/) and an [external link](https://example.com) and a bare URL https://example.org.

A bare URL at end of sentence with a comma https://example.org/comma, and one with a semicolon https://example.org/semi; should all strip trailing punctuation.

A paragraph that contains a [markdown link with a full URL](https://linked.example.com/path) followed by a bare URL https://bare.example.com to verify link-before-URL ordering is correct.

A link with [_italic label_](about/) and a link with [**bold label**](https://example.com/bold) to verify label formatting.

##! Open Accordion Section

This section starts open. It has an unordered list:

- First item
- Second item
- Third item

And an ordered list:

1. One
2. Two
3. Three

## Closed Accordion Section

This section starts closed. It has a level-three heading:

### A Subheading

And a level-four heading:

#### A Smaller Subheading

And a horizontal rule:

---

And a fenced code block:

```
const x = 1;
const y = 2;
```

## Images Section

A standard full-width image:

![Alt text for standard image](assets/images/standard.jpg)

A float-left image:

!<[Alt text for left image](assets/images/left.jpg)

A float-right image:

!>[Alt text for right image](assets/images/right.jpg)

## Arrow Links Section

→ [Download the report](assets/files/report.pdf)

→ [Visit the project site](https://example.com/project)
