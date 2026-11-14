---
name: Fix the Report
description: An editorial workbook for testing and repairing spreadsheet reports.
colors:
  purple: "#6552d8"
  purple-dark: "#5140b7"
  ink: "#29293c"
  muted: "#696a7e"
  paper: "#f8f9fc"
  surface: "#ffffff"
  line: "#e4e5ee"
  sidebar: "#252542"
  green: "#257458"
  warning: "#795c1c"
  error: "#a13e38"
typography:
  display:
    fontFamily: '"DM Sans", sans-serif'
    fontSize: "clamp(26px, 2.5vw, 35px)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-1.2px"
  body:
    fontFamily: '"DM Sans", sans-serif'
    fontSize: "14px"
    lineHeight: 1.6
  label:
    fontFamily: '"DM Sans", sans-serif'
    fontSize: "13px"
    fontWeight: 500
  formula:
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace'
    fontSize: "13px"
  total:
    fontFamily: '"DM Sans", sans-serif'
    fontSize: "37px"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "-1.5px"
rounded:
  field: "4px"
  button: "7px"
  navigation: "9px"
  panel: "12px"
  dialog: "16px"
spacing:
  compact: "8px"
  control: "12px"
  inset: "16px"
  panel: "24px"
  page: "42px"
components:
  button-primary:
    backgroundColor: "{colors.purple}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "11px 16px"
  button-primary-hover:
    backgroundColor: "{colors.purple-dark}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "#504660"
    typography: "{typography.label}"
    rounded: "{rounded.button}"
    padding: "11px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    padding: "8px 0"
  amount-input:
    backgroundColor: "transparent"
    textColor: "#383447"
    rounded: "{rounded.field}"
    padding: "7px 4px"
  lesson-navigation:
    backgroundColor: "#3c385b"
    textColor: "#f1f0fc"
    rounded: "{rounded.navigation}"
    padding: "14px 11px"
  validation-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "23px 21px 8px"
---

# Design System: Fix the Report

> The default learning experience was rebuilt at the owner's request. Its current contract is in REDESIGN.md and its styles are scoped in `src/learning/learning.css`. The specification below remains applicable to the retained `#trial` and `#practice` routes, not the new dashboard.

## Overview

**Creative North Star: "The Editorial Training Workbook"**

The Editorial Training Workbook uses a dark ink-violet navigation rail, quiet paper surfaces and compact annotations to make practical work feel legible and considered. DM Sans carries the interface; monospaced formulas and tabular money values make the underlying evidence easy to inspect.

Controls are restrained and familiar. Violet identifies actions, while green, amber and red communicate outcomes beside explicit text. This document records the implemented direction; descriptive names and atmosphere are implementation assumptions made under the user’s delegation, not a separately approved brand identity.

**Key Characteristics:**

- Compact editorial hierarchy with generous separation between work areas.
- Flat worksheet surfaces, explicit borders and a dark navigation anchor.
- Visible formulas, aligned figures and feedback explained in words.

## Colors

Violet anchors action and navigation against cool neutral paper; semantic outcome colors stay attached to their meaning.

### Primary

- **Workbook Violet** (`purple`): primary actions and the input caret.
- **Pressed Violet** (`purple-dark`): primary hover and emphasized text actions.

### Neutral

- **Printed Ink** (`ink`): primary text.
- **Annotation Gray** (`muted`): supporting text and small worksheet labels.
- **Cool Paper** (`paper`): the application canvas.
- **White Sheet** (`surface`): editable worksheets and validation panels.
- **Rule Gray** (`line`): panel outlines, table divisions and section rules.
- **Night Ink** (`sidebar`): the desktop navigation rail and compact mobile brand bar.

### Semantic

- **Verified Green** (`green`): confirmed results and expected paid revenue.
- **Guidance Amber** (`warning`): caution notices.
- **Correction Red** (`error`): invalid input and recovery messages. Status selectors use related pale fills with readable colored text.

**The Explicit Status Rule.** Pair semantic colors with labels or explanatory text.

## Typography

**Display Font:** DM Sans, sans-serif.
**Body Font:** DM Sans, sans-serif.
**Label/Mono Font:** SFMono-Regular, Consolas, Liberation Mono, monospace for formulas.

The single sans-serif family keeps the workspace calm. Formula text changes family to identify executable content; money uses tabular numerals for stable comparison.

### Hierarchy

- **Display:** the frontmatter display token serves the main exercise heading; mobile uses a smaller fixed heading.
- **Title:** worksheet titles use medium-to-semibold compact text; the formula remains visually subordinate.
- **Body:** brief and help copy use the body token; longer guidance gains line height.
- **Label:** the label token identifies buttons and navigation; worksheet metadata ranges from small annotations to regular table labels.
- **Total:** the total token makes the computed report amount the validation panel’s dominant figure.

## Layout

Desktop uses a navigation column (246px) beside a flexible main area. The main content is centered with a maximum width (1400px) and horizontal page padding from the frontmatter. The worksheet and validation panel form a two-column grid with a panel width (288px) and gap (24px).

At 1150px and below, navigation narrows (210px), page padding reduces (26px), and the validation panel narrows (254px). At 940px and below, navigation becomes a compact brand bar and its lesson path is hidden. At 680px and below, the workspace stacks into one column with page padding (18px). At 1600px and above, the validation panel expands (330px). Table scrolling remains inside the worksheet.

## Elevation & Depth

Ordinary surfaces have no shadows. White paper, pale context fills and fine borders establish depth. Dialogs alone lift above a dark translucent backdrop with the observed shadow (`0 24px 80px #19132f33`).

The only continuous motion is the verification spinner (one second, linear rotation). Reduced-motion preferences suppress animation and transitions.

## Shapes

Fields use small corners, buttons slightly softer corners, and panels broader corners as recorded in the frontmatter. Dialogs use the largest radius. Circular step indices and the completion check distinguish progress from rectangular work surfaces. Fine borders divide the worksheet without giving each cell a card.

## Components

### Buttons

Restrained, readable actions. Primary and secondary buttons share a minimum height (44px), with violet fill for the main action and an outlined white treatment for secondary actions. Primary hover darkens; secondary hover adds a pale violet fill. Ghost actions remain text-led. Disabled buttons reduce opacity and use the unavailable cursor.

### Chips

Order statuses are actual select controls with compact chip styling. Paid uses a pale green fill, Cancelled pale red and Pending pale amber. Text identifies the state independently of color; the chevron signals editability.

### Cards / Containers

Worksheet and validation panels use a white fill, fine neutral border and panel radius. Worksheet divisions form a connected document. Validation uses a large total followed by instructions, an action and progressive feedback.

### Inputs / Fields

Amounts align right, use tabular numerals and reveal a fine border on hover. Formula editing uses a bordered multiline monospace field. Errors appear near the affected workflow with recovery text. Focusable controls use an offset violet outline (3px with a 3px offset).

### Navigation

The dark desktop rail contains the selected lesson and numbered learning path. The current step uses a filled violet circle; completed steps use a pale green circle and check. On narrower screens the rail reduces to its brand bar.

### Report Evidence

Computed and expected revenue have distinct labels. The completion report preserves the original observed total beside the corrected value, then shows the verified formula and check count. Values remain selectable text.

## Do's and Don'ts

### Do:

- Do use the muted token for small neutral worksheet labels.
- Do preserve tabular money values and separate reported totals from expected totals.
- Do keep visible focus outlines and pair status colors with text.
- Do stack the worksheet and validation panel on narrow screens.

### Don't:

- Don’t replace the status selector with a decorative badge.
- Don’t remove the border separating worksheet regions.
- Don’t apply dialog shadows to ordinary worksheet panels.
