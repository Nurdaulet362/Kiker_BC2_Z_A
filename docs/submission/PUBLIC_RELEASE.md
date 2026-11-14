# Public release verification — 14 November 2026

[Live demo](https://fix-the-report-zimran-n362.decent-chair-7924.chatgpt.site) · [GitHub repository](https://github.com/Nurdaulet362/Kiker_BC2_Z_A)

The owner authorized ordinary merge/push and publication of the demo build. Public Git history was accepted as-is. No force-push or history rewrite was performed.

## GitHub synchronization

- Merge commit: `a7ea43838159c2dde91d43d1dbb86e8e2e2b820a`, parents `133547c` and `b75f864`.
- `git fetch origin` and `git merge --no-commit --no-ff origin/main` succeeded. There was no merge conflict. The merge staged the remote `CODEX_TASKS.md`; it was removed from the index before committing, and the original ignored local copy was restored byte-for-byte.
- The merge tree equals `133547c` exactly. `git push origin hackathon/h1:main` succeeded; `git ls-remote --heads origin main` confirmed the new SHA.
- A fresh HTTPS clone from GitHub, without credentials or inherited Git configuration, contained 103 tracked files and `src/learning/`. `skills/`, `SKILLS.md`, `.impeccable/`, `CODEX_TASKS.md`, `QA_REPORT.md` and `CODEX_SPRINT.md` were absent from its current tree. Earlier history is intentionally retained.
- All 71 application, test, public asset, script, manifest and configuration files match frozen `01302ea9cee0ff6aadbac53e273578f0fd5a5667` by Git blob and mode. Later public-link edits only change documentation, the pitch PDF and Git's binary-file classification for submission artifacts.

## Fresh public-clone checks

Dependencies were installed once in the verification clone. All commands exited 0.

| Command | Result | Wall time |
| --- | --- | --- |
| `npm ci` | Passed; zero reported vulnerabilities | 2.424 s |
| `npx tsc -b` | Passed | 2.995 s |
| `VITE_DEMO_ACCESS=false npm test` | 242/242, 12 files | 4.230 s |
| `VITE_DEMO_ACCESS=false npm run build` | Passed | 4.810 s |
| `VITE_DEMO_ACCESS=true npm test` | 242/242, 12 files | 2.504 s |
| `VITE_DEMO_ACCESS=true npm run build -- --outDir dist-demo` | Passed | 4.392 s |

## Deployment and public browser checks

The fresh clone's `dist-demo` contains 24 files (1,652,019 bytes). Those exact files were copied into an isolated static hosting wrapper; all SHA-256 hashes were checked before packaging. The GitHub application repository and its build configuration were not changed for hosting.

Sites saved version 1 and reported successful publication with public access on 14 November 2026. The hosting source commit is `79640aa49bf3321222ad1e1743742d7979df5478`; its provenance records GitHub source `a7ea438` and frozen application `01302ea`. This separate hosting commit packages build output, not new application code.

```sh
VITE_DEMO_ACCESS=true \
PLAYWRIGHT_BASE_URL=https://fix-the-report-zimran-n362.decent-chair-7924.chatgpt.site \
npm run test:e2e -- --project=chromium --workers=4
```

The existing suite passed **72/72**, with zero failures, flaky tests, skips or reruns. Playwright duration: 45.9 seconds; command wall time: 46.446 seconds. The actual run also enabled list/JSON reporters and stored output outside the source tree. It used fresh browser contexts without authentication; no local preview server was started.

Coverage includes English despite Russian browser settings, saved Russian language, complete lesson and Work Trial flows, scores 100/57/75, `SUMIFS`, demo pricing/access disclosure, old `#practice` redirect, persistence, worker recovery, and top next-step buttons at 375 px in both languages. A separate visible-browser walkthrough completed the first lesson with cancelled amount `2300`, `SUMIFS`, 7/7 checks and 100/100.

Anonymous requests returned HTTP 200 for all 24 deployed files. All 23 non-HTML assets match the verified build byte-for-byte. The host appends a Cloudflare challenge-platform script to HTML; removing exactly that appended script reproduces the original HTML bytes. The application's HTML and asset references are unchanged.

## Submission materials

[The PDF](Fix-the-Report-Pitch.pdf) contains 10 slides at 960×540 points. Slide 10 now has the verified application and repository URLs as clickable links. Slides 1–9 are identical in text, content streams and rendered pixels to the prior PDF. The updated last slide was visually inspected.

PDF SHA-256: `148d01d4fa303405592dd7123eae376f9e4eae7247ee95dc26cdfdbc126795f5` (404,699 bytes).

## Failures and remaining limits

- No merge, push, test, build or deployment failed during this release run. The preceding cleanup's non-fast-forward dry run was resolved by the ordinary merge above; it did not overwrite the remote.
- The temporary-directory default produced an initial clone outside `/tmp`; a second independent GitHub clone in `/tmp` was used for verification. This was a path correction, not a failed test or source fix.
- Playwright emitted a harmless `NO_COLOR`/`FORCE_COLOR` warning. No application or test changes were made to pass the checks.
- The first documentation `git diff --check` reported trailing spaces inside the generated PDF because Git classified its mostly ASCII bytes as text. `.gitattributes` now marks PDF and WebM artifacts as binary; the PDF bytes were not changed to address this. The repeated whitespace check passed.
- The newly published site is the demo build. Normal mode passed unit/build checks in this run; its 72/72 browser result remains the earlier [frozen-code check](RELEASE_CHECK.md), not a new public normal-mode deployment.
- A physical phone, Firefox and WebKit were not tested in this release run. Responsive Chromium checks are not physical-device verification.
- Payments, accounts and protected server-side subscriptions remain unimplemented. Demand and learning/retention impact remain unvalidated. No submission form was sent.

Detailed local logs and screenshots are retained in the ignored `.impeccable/review/merge-push/` and `.impeccable/sites-release/` folders; they are not required to run the public repository.
