# Fix the Report

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
Delegated by the user to implement the accepted MVP plan. React, TypeScript and Vite. Browser formula evaluation and local progress persistence.

## Users
Initial audience hypothesis from the accepted plan: US sales and operations professionals aged 25–45 who use spreadsheets and AI assistance.

## Product Purpose
Practice finding a plausible spreadsheet error by constructing a counterexample, then repair the formula and verify it against new data.

## Capabilities and Constraints
This implementation covers the cancelled-orders case end to end. Guest access, editable orders, formulas, independent checks, progressive hints, reset, persisted progress, and a completion screen. All data is labelled as training data. English product interface. No claim of live AI generation. Hosting and willingness to pay remain unverified.

## Operating Context
24-hour Zimran/AIESEC hackathon. Working product is 40% of scoring. The user explicitly delegated routine implementation decisions while away and asked to see the result on return.

## Brand Commitments
Product name is Fix the Report. No existing visual identity. Interface choices are implementation assumptions to review on return.

## Product Principles
- Correctness is demonstrated through user-controlled data.
- Explain the business rule before testing it.
- Preserve the learner's progress and make retries easy.
- Judge formulas by computed behavior across varied data.
