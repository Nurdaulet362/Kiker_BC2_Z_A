# Source notes

Inspected on 2026-11-14 using the connected GitHub repository tools.

- Repository: [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail).
- Pinned revision: [96608e078b2d5ea607c5c3b8b5a54d1c1fba6846](https://github.com/DietrichGebert/ponytail/commit/96608e078b2d5ea607c5c3b8b5a54d1c1fba6846), main when inspected, committed 2026-10-29.
- License: [MIT](https://github.com/DietrichGebert/ponytail/blob/96608e078b2d5ea607c5c3b8b5a54d1c1fba6846/LICENSE), copyright 2026 DietrichGebert. The notice is reproduced below.

## What the source actually supplies

[README](https://github.com/DietrichGebert/ponytail/blob/96608e078b2d5ea607c5c3b8b5a54d1c1fba6846/README.md) describes a prompt distributed through agent skills, rule files, and host adapters. Its published benchmark percentages are measurements of its particular agent/task setup, not promises about this website.

The [main skill](https://github.com/DietrichGebert/ponytail/blob/96608e078b2d5ea607c5c3b8b5a54d1c1fba6846/skills/ponytail/SKILL.md) favors the smallest complete solution after reading affected code. Its important invariant is that simplifying code must not remove input validation, data-loss protection, security, or accessibility. Existing project components precede platform replacements. Non-trivial logic requires a useful check.

The [review skill](https://github.com/DietrichGebert/ponytail/blob/96608e078b2d5ea607c5c3b8b5a54d1c1fba6846/skills/ponytail-review/SKILL.md) extends inspection beyond the diff to callers, tests, and real data flow. The [audit skill](https://github.com/DietrichGebert/ponytail/blob/96608e078b2d5ea607c5c3b8b5a54d1c1fba6846/skills/ponytail-audit/SKILL.md) begins with a repository map and expected load. Both require concrete failure cases and rank correctness ahead of shortening code.

The [instruction-builder implementation](https://github.com/DietrichGebert/ponytail/blob/96608e078b2d5ea607c5c3b8b5a54d1c1fba6846/hooks/ponytail-instructions.js) reads the skill file, filters intensity-specific rows, and uses a bundled fallback when the skill cannot be read. This is host instruction injection, not an application runtime or deterministic code-analysis engine.

## Local adaptation boundaries

The local SKILL.md is original condensed guidance derived from those workflows. It omits the persistent persona, intensity modes, fixed response slogans, benchmark scoreboard, and automatic hook activation. Installing this folder does not install the upstream CLI/plugin, expose its slash commands, activate its band/board UI, or verify any of those integrations. No upstream scripts were executed and no upstream dependencies were installed while creating this skill.

## Applying it to Fix the Report

Project inspected: `/Users/nurdauletkystaubaj/Desktop/Zimran_Aiesec_Hackathon`. These are source-navigation hints from the inspection date; confirm them against the current checkout before use.

The React/TypeScript/Vite application runs fictional sales-operations practice locally. Expected use is one learner in one browser, with up to 100 report rows, a bounded formula language, worker execution timeouts, and browser storage. Its checks demonstrate performance on the exercise rather than universal formula correctness or hiring readiness.

Trace these connected paths before changing formulas or reviews:

1. `src/simulation/Simulation.tsx`: editable draft, homepage actions, worker requests, submission state, and review download.
2. `src/simulation/model.ts`: scenario validation, independent channel economics, saved-state restoration, and the submission snapshot contract.
3. `src/simulation/worker.ts` and `trial.worker.ts`: cancellation, timeout, worker failures, and assessment dispatch.
4. `src/simulation/evaluate.ts`: revenue/conversion checks, economic reasoning, score weighting, and independent copies of submitted data.
5. `src/formula.ts` and `src/model.ts`: parser allowlist and bounds, independent expected revenue in integer cents, and varied validation datasets.
6. `src/App.tsx`, `src/worker-client.ts`, and `src/formula.worker.ts`: the guided exercise shares formula/model behavior and must remain compatible.

The independent expected-value calculation is intentional: do not reuse the learner's formula to calculate its own expected answer. Submission snapshots must remain independent of later draft edits. Keep worker timeouts and cancellation when simplifying async code. Local storage can fail; keep both the unsaved-work warning and the usable in-memory session. Check the route boundary in `src/main.tsx`: navigating between exercises unmounts one component, so failed-to-save drafts need to survive beyond that component's state.

Reuse the existing installed test runtime, after inspecting `package.json`:

```sh
npm test
npm run test:e2e -- --workers=1
npm run build
```

Unit tests already exercise monetary totals, alternative formulas, hardcoded answers, varied data, recommendations, and snapshot restoration. Browser tests exercise start/continue/review navigation, editing, worker evaluation, downloaded snapshots, reload, keyboard access, and storage failure. Run only checks relevant to the change; inspect `playwright.config.ts` and its browser dependency before invoking browser tests. A successful skill-format validation is separate from application tests or a complete audit.

## Upstream MIT notice

MIT License

Copyright (c) 2026 DietrichGebert

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
