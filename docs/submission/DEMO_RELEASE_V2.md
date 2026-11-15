# Demo release v2 — verification record

This public summary transcribes the completed deployment checks from **15 November 2026, 08:12 Asia/Almaty (UTC+5)**. It is a historical release record, not a fresh run made for the README update or a live CI status.

- **Demo:** https://fix-the-report-zimran-n362.decent-chair-7924.chatgpt.site
- **Public source:** https://github.com/Nurdaulet362/Kiker_BC2_Z_A
- **Source commit:** [`ace8eb9aa224b239e18d772dd4010dff11ff595d`](https://github.com/Nurdaulet362/Kiker_BC2_Z_A/commit/ace8eb9aa224b239e18d772dd4010dff11ff595d)
- **Deployment:** version 2, succeeded; demo access enabled at build time.
- **Hosting commit:** `2c79744cb2c0b37810595c1624a79b0e554640cb` — a deployment artifact commit, distinct from the GitHub source commit.

## What was released

The source commit adds pitch v2, its speaker notes, a pilot protocol, an empty results template, evidence and economic assumptions, a preparation plan and jury Q&A. Application source, dependencies and tests are unchanged from `a45a002`.

The public demo was rebuilt from a fresh, unauthenticated clone of GitHub `main` at `ace8eb9`. This deployment includes the preceding audit fixes; it supersedes the initial public deployment described in [PUBLIC_RELEASE.md](PUBLIC_RELEASE.md). The URL stayed the same. No payment, interest form or Supabase feature was added.

## Completed checks

The recorded environment used Node.js **26.13.0**. `VITE_DEMO_ACCESS=true` was set for the demo checks.

| Check | Result |
| --- | --- |
| Fresh anonymous HTTPS clone and source-code comparison with `a45a002` | Passed |
| `npm ci` | Exit 0 |
| `npx tsc -b` | Exit 0 |
| `npm test` | **310 / 310**, 14 files |
| `npm run build -- --outDir dist-demo` | Exit 0 |
| Chromium e2e against local production preview | **91 / 91**; no failed, skipped or flaky tests |
| Chromium e2e against the public demo | **91 / 91**; no failed, skipped or flaky tests |
| Published asset comparison with the clean build | **24 / 24 exact SHA-256 matches**, including HTML |
| Final source comparison | Local HEAD and GitHub `main` matched `ace8eb9` at release completion |

The local e2e command took approximately 33.5 seconds; the public e2e command took approximately 54.8 seconds. These are command durations, not product performance benchmarks.

The deployment artifact contains `release-provenance.json`, recording the source commit and built-file hashes. That provenance file is additional to the 24 application build files that were compared.

## Intermediate failures and resolution

1. A whitespace check found an extra blank line in the pitch Markdown. It was removed before push; the corrected commit passed the repeated whitespace check.
2. The first asset comparison using Python `urllib` received HTTP 403 / Cloudflare 1010. The public browser path worked. A fresh Chromium context fetched the same-origin files normally: all 24 returned HTTP 200 and matched the clean build byte for byte. Hosting protection settings were not changed.
3. The demo build, both browser suites and deployment succeeded on their first recorded attempts. Application behavior was not modified to make the checks pass.

## Scope and limits

- This release rechecked **demo mode**. Normal mode was not rerun at this stage; its earlier results are in [AUDIT_FIXES_REPORT.md](../AUDIT_FIXES_REPORT.md).
- Chromium was tested. Firefox, WebKit and physical phones were not verified in this release.
- The checks establish deployment consistency and covered application behavior. They do not establish user demand, learning impact or paid retention.
- No user-study or interest-form results exist at this point. Prepared screenshots are demonstrations, not participant results.
- Later documentation changes do not imply a new application deployment. To reproduce the release, check out the source commit above and use the [build instructions](../BUILD_MODES.md).

Raw command logs, Playwright JSON and asset manifests were retained locally as release evidence. They are not included in this public summary; local paths, account-specific hosting identifiers and credentials are intentionally omitted.
