# Fix the Report

A browser-based work simulation for adults preparing for a sales operations assessment. Built for the Zimran × AIESEC Business Cup MVP.

The main experience, **The Friday revenue review**, connects revenue repair, overall conversion and an evidence-based budget-test recommendation. The learner submits work, gets a transparent review across three skills, practices gaps and retries on changed data. The earlier **The cancelled order** exercise remains available as guided practice.

## Run locally

Use Node.js 22.12+ (Node 26 also works).

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. No account is required. Progress stays in that browser's local storage. The main assignment is at `/`; the guided lesson is at `/#practice`. `/?review=1#practice` opens the original Russian review dialog prepared for the project owner.

## Demonstrate the work trial

See [DEMO.md](DEMO.md) for a two-minute demo, the scoring rules, product hypothesis and remaining submission work.

1. Start the work trial. The draft reports $3,280 in revenue and 7.50% conversion.
2. Paid revenue is $1,800; overall conversion is 15/250 = 6.00%.
3. Both channels have $900 paid revenue, but Email has $200 ad spend and Ads has $1,100. Compare contribution per dollar of spend before recommending the next small test.
4. Submit to see 19 revenue checks, 8 conversion checks and 3 decision checks. Fix the gaps and resubmit.
5. Download the review or start a fresh assignment. New variants change the amounts, lead counts and the best channel choice.

The formulas are really executed. The score records performance on this exercise, not hiring readiness. The optional written handoff is saved without automated grading.

## Demonstrate the guided lesson

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

Browser tests use an installed Google Chrome. Unit tests cover calculation, alternative valid formulas, invalid input, hardcoded answers, linked channel metrics, changing recommendations and persistence. Browser tests cover both complete learner flows, failed submissions, repair, reload, download, fresh assignments, hints, mobile width, reset and navigation.

The production build is in `dist/` and can be served by a static hosting provider. `vite preview` is a local preview server.

## Implementation

- React + TypeScript + Vite; locally bundled DM Sans.
- `src/model.ts` owns training data, the independent business-rule calculation, validation and progress restoration.
- `src/formula.ts` evaluates formulas using fast-formula-parser. The supported function set is explicit. SUMIFS and COUNTIFS are outside this version's supported set.
- `src/simulation/model.ts` owns the connected assignment data, persistence and independent channel economics.
- `src/simulation/evaluate.ts` computes the 30 checks and transparent weighted score.
- Formula evaluation runs in Web Workers with timeouts; input is limited to A1:C101 for revenue and A1:D101 for conversion, with at most 100 data rows. Arbitrary JavaScript evaluation is never used.
- Revenue verification covers 19 datasets. Conversion verification covers 8 datasets, including zero leads (`N/A`), zero paid orders, unequal audiences and a new channel on row 101.
- Monetary totals are compared within half a cent; expected revenue is summed in integer cents.
- Prepared training examples are labelled. No live AI service is used or represented.

## Current scope

This release contains one connected sales operations assignment with varied data and one guided lesson. Payments, account sync and additional role-specific assignments are future work. Learning effectiveness and willingness to pay are unvalidated. A completed case demonstrates passing this exercise's checks, not universal spreadsheet correctness or job readiness. Product and proposed pricing assumptions are in DEMO.md.

The repository is private as created by its owner. The competition's final submission requires a public repository and a publicly accessible deployed product.
