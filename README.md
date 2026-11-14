# Fix the Report

A browser-based learning exercise for checking spreadsheet formulas. Built for the Zimran × AIESEC Business Cup MVP.

The first case, **The cancelled order**, is complete. The learner constructs a counterexample to a revenue formula, repairs it, and verifies the fix against 19 datasets.

## Run locally

Use Node.js 22.12+ (Node 26 also works).

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Progress stays in that browser's local storage. The normal exercise starts immediately, without an account. `/?review=1` opens a Russian review dialog prepared for the project owner.

## Demonstrate the full case

1. The initial five Paid orders total $1,200.
2. Click **Add order**. Set its status to **Cancelled**, keeping its amount at $300.
3. Click **Test the report**. The given formula reports $1,500, while paid revenue is $1,200.
4. Click **Fix the formula** and enter `=SUMIF(B2:B101,"Paid",C2:C101)`.
5. Click **Verify my formula**. All 19 checks pass and the completion screen appears.
6. Refresh to verify persistence, or practice with new numbers.

## Verify and build

```sh
npm test
npm run test:e2e
npm run build
npm run preview
```

Browser tests use an installed Google Chrome. Unit tests cover calculation, alternative valid formulas, invalid input, hardcoded answers and persistence. Browser tests cover the full learner flow, reload, retry, hints, help, empty data, mobile width and reset.

The production build is in `dist/` and can be served by a static hosting provider. `vite preview` is a local preview server.

## Implementation

- React + TypeScript + Vite; locally bundled DM Sans.
- `src/model.ts` owns training data, the independent business-rule calculation, validation and progress restoration.
- `src/formula.ts` evaluates formulas using fast-formula-parser. The supported function set is explicit. SUMIFS and COUNTIFS are outside this version's supported set.
- Formula evaluation runs in a Web Worker with a timeout; input is limited to A1:C101 and 100 orders. Arbitrary JavaScript evaluation is never used.
- Verification checks the current report and 18 other datasets, including mixed statuses, cents, empty reports and a paid order at row 101.
- Monetary totals are compared within half a cent; expected revenue is summed in integer cents.
- Prepared training examples are labelled. No live AI service is used or represented.

## Current scope

This release contains the cancelled-order case. The conversion-rate case, payments, account sync and an expanded exercise library are future work. Learning effectiveness and willingness to pay are unvalidated. A completed case certifies passing this exercise's checks, not universal spreadsheet correctness.

The repository is private as created by its owner. The competition's final submission requires a public repository and a publicly accessible deployed product.
