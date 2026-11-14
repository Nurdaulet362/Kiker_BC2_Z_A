# Fix the Report

A bilingual learning app for people who want to understand business reports and make better decisions from data. Built for the Zimran × AIESEC Business Cup MVP.

The rebuilt default experience is a personal learning workspace with **six short cases across revenue, conversion and decisions**. Each lesson follows a complete loop: read the brief, experiment with the report, repair the calculation or recommendation, apply the principle to a new situation, review the result and continue to a recommended case. Russian is the default language; English is available throughout. This version remains local and unpublished.

The repository also contains four developer skills adapted from the sources requested by the project owner. See [SKILLS.md](SKILLS.md) for provenance, installation, validation and their concrete application to the site.

## Run locally

Use Node.js 22.12+ (Node 26 also works).

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. No account is required. Progress stays in that browser's local storage. The learning dashboard is at `/`, progress at `/#progress`, and assignments at `/#lesson/<id>`. Saved reviews have their own hash routes. The earlier connected assessment remains at `/#trial` and the guided exercise at `/#practice`; their saved data is retained separately.

If browser storage is unavailable, an in-memory fallback preserves both drafts while switching exercises in the same open page. Reloading or closing that page can lose unsaved changes; the app displays a warning when durable saving fails.

## Demonstrate the learning product

1. Open **Деньги, которых не было**, then **Открыть отчёт**.
2. Change the cancelled order from $650 to $2,300. The broken SUM reports $3,680, although paid revenue is still $1,200.
3. Identify the missing status filter and use `=SUMIF(B2:B101,"Paid",C2:C101)`. The result becomes $1,200.
4. Check the solution against independent datasets, then answer the separate transfer question ($900).
5. The review awards 20 points for diagnosis, up to 50 for repair and 30 for transfer. A hardcoded `=1200` fails the varied datasets.
6. A weak result recommends the other revenue case (refunds); a successful result advances the route. Change languages or reload to verify saved drafts and results.

The other cases cover weighted conversion, profit contribution versus sales volume, refunded orders, an omitted channel, and holding budget when returns do not justify spending. Completion badges require successful repair and transfer with at least 80 points and no revealed solution; a submission alone does not count as passing. These thresholds describe this exercise, not proven skill mastery.

Hints reveal an idea first, then the structure. The full solution requires confirmation, caps repair credit at 25/50 and makes the attempt practice-only. Diagnosis and transfer choices shuffle once per attempt; transfer questions have four options. Numeric cell input accepts `12,5`, `12.5` and `2 300`; ambiguous `2,300` or `2.300` asks for an ungrouped number instead of silently changing its value.

The Phase 1 correction report, exact checks and local commits are in [PHASE_1_REPORT.md](PHASE_1_REPORT.md). Later phases are awaiting the review gate in [CODEX_TASKS.md](CODEX_TASKS.md).

## Earlier work trial (`/#trial`)

See [DEMO.md](DEMO.md) for a two-minute demo, the scoring rules, product hypothesis and remaining submission work.

1. Start the work trial. The draft reports $3,280 in revenue and 7.50% conversion.
2. Paid revenue is $1,800; overall conversion is 15/250 = 6.00%.
3. Both channels have $900 paid revenue, but Email has $200 ad spend and Ads has $1,100. Compare contribution per dollar of spend before recommending the next small test.
4. Submit to see 19 revenue checks, 8 conversion checks and 3 decision checks. Fix the gaps and resubmit.
5. Download the review or start a fresh assignment. New variants change the amounts, lead counts and the best channel choice.

The formulas are really executed. The score records performance on this exercise, not hiring readiness. The optional written handoff is saved without automated grading.

## Earlier guided lesson (`/#practice`)

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

For the latest checks and limitations, see [QA_REPORT.md](QA_REPORT.md). To test a running production preview instead of the development server:

```sh
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 npm run test:e2e -- --workers=1
node scripts/qa-smoke.mjs
```

The smoke script captures seven states at 375, 768 and 1440 px and checks page overflow, console errors and failed requests. Evidence stays in the ignored `.impeccable/review/ecc-qa/` directory. It does not claim visual regression coverage without an approved baseline.

The production build is in `dist/` and can be served by a static hosting provider. `vite preview` is a local preview server.

## Implementation

- React + TypeScript + Vite; locally bundled DM Sans, no new dependencies for the rebuild.
- `src/learning/model.ts` defines six bilingual cases, bounded saved state and error-based next-case recommendations.
- `src/learning/engine.ts` grades diagnosis, actual formula behavior on 7–8 datasets (or the submitted decision data) and transfer. Worker calls have timeouts and stale-result protection.
- `src/learning/LearningApp.tsx` and `Workspace.tsx` implement the curriculum, progress, three-stage lesson and review. The new layout is scoped in `src/learning/learning.css`.
- `src/model.ts` owns training data, the independent business-rule calculation, validation and progress restoration.
- `src/formula.ts` evaluates formulas using fast-formula-parser. The supported function set is explicit. SUMIFS and COUNTIFS are outside this version's supported set.
- `src/simulation/model.ts` owns the connected assignment data, persistence and independent channel economics.
- `src/simulation/evaluate.ts` computes the 30 checks and transparent weighted score.
- New submissions preserve their own source data, formulas, handoff note and hint use. Editing a draft does not rewrite the saved review; older reviews without a snapshot remain readable and identify missing details.
- Formula evaluation runs in Web Workers with timeouts; input is limited to A1:C101 for revenue and A1:D101 for conversion, with at most 100 data rows. Arbitrary JavaScript evaluation is never used.
- Revenue verification covers 19 datasets. Conversion verification covers 8 datasets, including zero leads (`N/A`), zero paid orders, unequal audiences and a new channel on row 101.
- Monetary totals are compared within half a cent; expected revenue is summed in integer cents.
- Prepared training examples are labelled. No live AI service is used or represented.

## Current scope

This release contains six authored lessons and two retained earlier exercises. Payments, account sync, a larger curriculum and measured learning effectiveness remain future work. There is no AI service or external data upload. All lesson companies and data are fictional. A successful case demonstrates passing its checks, not universal spreadsheet correctness or job readiness.

The repository remains private. The owner has explicitly requested that the site not be published yet.
