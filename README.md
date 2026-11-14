# Fix the Report

Practice finding, repairing and explaining misleading business reports before a spreadsheet task at work.

Fix the Report is a browser learning app built for the Zimran × AIESEC hackathon. It contains six authored lessons across revenue, conversion and business decisions, plus a connected Work Trial. Diagnose an error, repair a formula or recommendation, test it, answer a transfer question and receive a saved review with a next step.

English is the default, regardless of browser language. The EN/RU switch saves your choice. No account is required; progress stays in this browser. All companies and exercise data are fictional. There is no live AI service.

## Run locally

Use Node.js 22.12+; the frozen version was also checked with Node.js 26.13.0.

```sh
npm ci
npm run dev
```

Open [http://127.0.0.1:5173/](http://127.0.0.1:5173/) and keep the terminal running. Opening `index.html` directly from disk does not start the app. For all content during development, start with `VITE_DEMO_ACCESS=true npm run dev`.

## Build modes

| Mode | Access | Output |
| --- | --- | --- |
| Normal | Three foundation lessons and repeats; practice lessons and Work Trial lead to pricing | `dist/` |
| Demo | All six lessons and Work Trial, with a persistent **Demo access — not a purchase** banner | `dist-demo/` |

Normal build:

```sh
VITE_DEMO_ACCESS=false npm run build
npm run preview -- --port 4173 --strictPort
```

Demo build, preserving the normal output:

```sh
VITE_DEMO_ACCESS=true npm run build -- --outDir dist-demo
npm run preview -- --outDir dist-demo --port 4174 --strictPort
```

Open [normal preview](http://127.0.0.1:4173/) or [demo preview](http://127.0.0.1:4174/). These are local URLs, not public deployment links. See [BUILD_MODES.md](docs/BUILD_MODES.md) for the complete guide. Only the exact value `true` enables demo access, and it is applied at build time. Changing an environment variable only when starting preview does not change an existing build.

Both output folders can be served by a static host. Hash routes handle navigation, but asset URLs still need the correct Vite base when hosting under a subdirectory. A build served at the domain root uses the current default base.

## Two-minute demonstration

1. Open **The money that never arrived**, then **Open the report**.
2. Change the cancelled amount from $650 to `2300`, without a currency symbol or thousands separator. The broken total rises to $3,680; paid revenue remains $1,200.
3. Diagnose the missing status filter. Enter `=SUMIF(B2:B101,"Paid",C2:C101)` or `=SUMIFS(C2:C101,B2:B101,"Paid")`.
4. Verify the formula against **7 checks** using different datasets. Answer the transfer question with **$900 in paid revenue**; choices may appear in a different order.
5. With the correct diagnosis and transfer answer, this earns **100/100**. Under the same conditions, hardcoding `=1200` passes only 1 of 7 repair checks and earns **57/100**. Revealing the solution limits repair credit to 25/50 and the total to **75/100**; it is a practice attempt, not a completed lesson.

The learner controls the data. Changing the cancelled amount again demonstrates why a rule survives new data while a copied total does not. Scores describe exercise performance, not certification or hiring readiness.

## Lessons, feedback and pricing

The six lessons cover cancelled-order revenue, weighted conversion, contribution versus sales volume, refunded orders, a missing channel and a budget decision. Each includes editable data, diagnosis, a repair or decision, a transfer question, progressive hints and a saved review.

The lesson score is **20 diagnosis + up to 50 repair + 30 transfer**. Completion requires all repair checks, a correct transfer answer, at least 80 points and no revealed solution. Recommendations, saved progress and retries are implemented; their effect on retention or learning has not been measured. Unlimited generated lesson variants are not implemented.

Work Trial combines revenue, conversion and a channel decision, with 30 checks and fresh assignment variants. Its assessment is separate from lesson scoring.

**Free:** three foundation lessons and repeats. **Pro hypothesis: $19/month** for three practice lessons and Work Trial. The pricing page states: **Payments are not connected yet. This is a product test.** There is no checkout, purchase confirmation, account system or server-side subscription validation. Client-side access restrictions are not a secure payment system.

`PRO_INTEREST_URL` is currently an empty source-code constant, so the interest button is hidden. The app does not collect email addresses or send notifications. Adding a real link would require a source change and a new build; it is not part of the frozen release.

| Route | Purpose |
| --- | --- |
| `/` | Learning dashboard |
| `/#lesson/revenue-cancelled` | First foundation lesson |
| `/#progress` | Local progress and history |
| `/#review/<id>` | A saved review in this browser |
| `/#pricing` | Free and proposed Pro plan |
| `/#trial` | Work Trial in demo mode; pricing in normal mode |
| `/#practice` | Redirect to the first lesson; the former standalone screen is no longer routed |

## Verification

The sprint closed at code commit `01302ea` with **242 unit tests and 72 Chromium e2e tests passing in each mode**. The [task 4 report](docs/SPRINT_TASK_4_REPORT.md) records those runs, the initial failed fixture and its correction. A separate [clean-clone release check](docs/submission/RELEASE_CHECK.md) records the later verification of the frozen code.

Install dependencies once, then check normal mode:

```sh
npm ci
npx tsc -b
VITE_DEMO_ACCESS=false npm test
VITE_DEMO_ACCESS=false npm run build
npx playwright install chromium
npm run preview -- --port 4173 --strictPort
```

In a second terminal, while preview runs:

```sh
VITE_DEMO_ACCESS=false PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 npm run test:e2e
```

For demo mode:

```sh
VITE_DEMO_ACCESS=true npm test
VITE_DEMO_ACCESS=true npm run build -- --outDir dist-demo
npm run preview -- --outDir dist-demo --port 4174 --strictPort
```

In a second terminal:

```sh
VITE_DEMO_ACCESS=true PLAYWRIGHT_BASE_URL=http://127.0.0.1:4174 npm run test:e2e
```

The test flag must match the build being served. Run browser suites sequentially or give them separate output directories. `PW_CHANNEL=chrome` selects installed Chrome. Firefox and WebKit are optional through `PW_ALL_BROWSERS=1` after installing those browsers; the stated counts concern Chromium, not those engines or a physical phone.

## What has not been validated

- **Demand and price:** the target audience and $19/month willingness to pay are hypotheses. No validated traction or conversion rate is claimed.
- **Learning outcomes:** there is no controlled evidence of improved workplace performance, interview outcomes or long-term retention.
- **Payments and subscription business:** this release does not establish paid customers, functioning checkout or measured subscription retention.
- **Spreadsheet compatibility:** this is a restricted formula environment, not Excel compatibility. Criteria are case-sensitive: `"Paid"` matches the exercise status; `"paid"` does not. Wildcard escaping and empty-cell behavior have library-specific limits.
- **Persistence:** local storage is not account sync. Clearing browser data removes access to local progress. Storage failures use an in-page fallback with a warning; closing the page can lose that fallback. Cross-tab merges are not atomic transactions.
- **Public availability:** local tests do not prove a deployment works. Publication and public URL checks remain separate release steps.

The project is intended to fit a consumer learning-product direction. It does not claim a partnership with, or endorsement by, Zimran.

## Implementation and documentation

React 19, TypeScript, Vite, Vitest and Playwright. Formulas run in Web Workers with timeouts and an explicit allowlist using `fast-formula-parser@1.0.19`. `SUMIFS` and `COUNTIFS` use the library's custom-function mechanism and reuse its criteria matching. Arbitrary JavaScript evaluation is not used.

See the [technical handoff](docs/PROJECT_HANDOFF.md) for architecture, storage contracts and formula limitations; [build modes](docs/BUILD_MODES.md) for commands; and [skills provenance](SKILLS.md) for the four developer skill packages and their separate source licenses. Older plans and reports describe historical states; this README and the final sprint reports describe the frozen release.
