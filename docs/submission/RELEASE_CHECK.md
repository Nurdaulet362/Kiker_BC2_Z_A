# Fresh frozen-source clean-clone verification

Verified at: 2026-11-14T17:06:19.163668+00:00

This report records new runs performed during release preparation. It does not reuse historical test counts.

- Frozen source HEAD: `01302ea9cee0ff6aadbac53e273578f0fd5a5667`.
- Temporary clean clone: `/tmp/ftr-release-clean-3vbpry10/repo`.
- Cloned locally with `git clone --no-hardlinks --single-branch --branch hackathon/h1 <source-repository> /tmp/ftr-release-clean-3vbpry10/repo`; clone HEAD was asserted against the frozen SHA before executing checks.
- Runtime: Node `v26.13.0`, npm `11.20.0`.
- Git worktree was clean before and after validation; HEAD unchanged. No source files, test expectations or dependency lockfiles changed.
- Browser tests used local production builds at `127.0.0.1:4273` and `127.0.0.1:4274`, with the expected build mode set explicitly.

| Exact verification command | Exit | Measured wall time | Observed result |
| --- | --- | --- | --- |
| `npm ci` | 0 | 2.415 s | 98 packages added; 99 audited; 0 vulnerabilities (one install only) |
| `npx tsc -b` | 0 | 2.81 s | TypeScript exit 0 |
| `VITE_DEMO_ACCESS=false npm test` | 0 | 4.016 s | 242/242 tests in 12 files; Vitest 2.31 s |
| `VITE_DEMO_ACCESS=false npm run build` | 0 | 4.742 s | 1606 modules; Vite 2.00 s |
| `VITE_DEMO_ACCESS=true npm test` | 0 | 2.498 s | 242/242 tests in 12 files; Vitest 2.16 s |
| `VITE_DEMO_ACCESS=true npm run build -- --outDir dist-demo` | 0 | 4.278 s | 1606 modules; Vite 1.98 s |
| `VITE_DEMO_ACCESS=false PLAYWRIGHT_BASE_URL=http://127.0.0.1:4273 npm run test:e2e -- --output=/tmp/ftr-release-clean-3vbpry10/test-results-normal` | 0 | 25.087 s | 72/72 Chromium; Playwright 24.2 s |
| `VITE_DEMO_ACCESS=true PLAYWRIGHT_BASE_URL=http://127.0.0.1:4274 npm run test:e2e -- --output=/tmp/ftr-release-clean-3vbpry10/test-results-demo` | 0 | 27.334 s | 72/72 Chromium; Playwright 26.8 s |

Preview commands:

```sh
npm run preview -- --outDir dist --port 4273 --strictPort
npm run preview -- --outDir dist-demo --port 4274 --strictPort
```

Both temporary previews returned HTTP 200, served their respective production outputs, and were stopped after both e2e suites finished. Existing listeners on 5173, 4173 and 4174 retained their original process IDs.

Failed verification runs: **0**. No retries or source fixes were needed. `npm ci` ran exactly once. Browser tests ran sequentially with separate output folders; 4 Chromium workers per suite. Browser binaries were already available on the host; no browser installation was necessary. No Firefox/WebKit run was performed.

Warnings: npm reported that esbuild/fsevents install scripts were not covered by allowScripts; installation policy was unchanged. Playwright emitted the existing NO_COLOR/FORCE_COLOR warning. All commands passed without altering those settings.

All artifacts and sanitized logs for this validation are under this temporary directory. Nothing was committed, pushed or published.

## Release scope and remaining checks

This clean clone contains the frozen application commit. Subsequent release preparation changes documentation and local submission artifacts only. It does not change scoring, source code, test expectations, package manifests or lockfiles.

The existing GitHub main branch is not the frozen application version: remote main is b75f864, while the tested local application is 01302ea. There are 35 commits only in the local application history and one only in remote main. A clean clone of the public submission repository must be rechecked after the owner authorizes and prepares that repository.

The local browser walkthrough covers Chromium desktop and an emulated 375px viewport. A physical phone, public deployment, Firefox/WebKit and public repository access remain unchecked. Publication is not authorized by this report.

Privacy preparation remains outstanding: author emails are present in Git history and personal local paths remain in historical documentation. The audit found no confirmed credentials but does not clear those personal details for publication. Historical .impeccable design files are tracked; it is inaccurate to say the whole directory was never in Git. No history rewrite was performed.

Untracked source ZIP and five reference PNGs were moved from the project root into the ignored .impeccable/review/source-inputs directory. SHA-256 hashes were checked before and after the move; no files were deleted. CODEX_SPRINT.md remains in place to preserve existing document links. Moving or excluding it from a public export is separate from this frozen-code verification.

Root LICENSE and NOTICE are still absent. Skills and their existing attribution files were not modified.

## Documentation and presentation checks

`git diff --check` passed. Relative Markdown links in README and the submission documents resolve locally. A targeted comparison against `01302ea` found no changes in application source, tests, skills, public assets, scripts, package manifests, the dependency lockfile or TypeScript/Vite/Playwright configuration. No new commit was created during the verification and artifact-preparation stage; documentation and submission materials were committed later at the owner's request. That request did not authorize push or publication.

The pitch PDF has exactly 10 pages in 16:9. All pages were rendered and visually inspected; no clipping or overlap was observed. It contains real prepared examples of 100/57/75, the current pricing disclosure, fresh test counts and pending-publication placeholders. PDF author/creator metadata uses the project name, with no personal home path or email in the extracted text. The file is a review copy until real public links are authorized and verified.

## Backup video and discarded recordings

[Offline demo](Fix-the-Report-Demo.webm): exactly 120.00 seconds, 1280×800, 25 fps VP9/WebM, 2,699,829 bytes. It is silent, with no audio track. The [script](DEMO_SCRIPT.md) provides the narration separately. Recorded in a fresh browser context through real UI actions; no result fixtures, storage seeding or substituted DOM content were used.

The final exported frames at 0, 24, 30, 60, 78, 90 and 115 seconds were inspected. They show the cancelled amount 2300 and erroneous $3,680 together, SUMIF returning $1,200, genuine 100/100 with 20/50/30, seven checks and pricing with the demo and payment disclosures. The result survived reload and the next lesson opened.

Two earlier recordings were discarded. The first stopped at the 1:42 action because the recorder targeted a mobile-only Next lesson button at desktop width. The second completed but its inflated total was below the viewport at the key moment. The recording script was corrected and the final take verified both the edited cell and output inside the viewport. These were recorder/presentation issues, not application test failures or source fixes. The fresh clean-clone validation runs above still had zero failures.

Video SHA-256: `5301deb094c08216f3364b05f2e3ffc7b608a50d2a01a0fb6fe4ac9fe06fcda7`.

## Commit packaging checks

During the later documentation commit, unrestricted `git diff --cached --check` treated the generated PDF as text and reported trailing whitespace in PDF objects and cross-reference records. The PDF was not rewritten to satisfy a source-text formatting check. The Markdown-only staged check passed, and the PDF/video SHA-256 values matched their validated artifacts. Application code remained identical to the frozen commit. The new documentation commits use the verified GitHub account's noreply address; existing history and persistent Git identity settings were not rewritten.
