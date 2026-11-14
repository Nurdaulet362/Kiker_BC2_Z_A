# Repository-derived skills

Created on 2026-11-14 for the owner's request to turn four GitHub sources into reusable skills and apply them to Fix the Report. These are local adaptations; they are not official plugins from the upstream authors.

| Source | Portable skill | Application in this project |
| --- | --- | --- |
| [Marketing-for-Founders](https://github.com/EdoStra/Marketing-for-Founders) | [founder-marketing-playbook](skills/founder-marketing-playbook/SKILL.md) | Clarified sales-operations assessment preparation on the homepage; added concrete takeaways, three relevant FAQ disclosures and a final start/continue action. No invented customers, hiring guarantees or unvalidated paid offer |
| [Ponytail](https://github.com/DietrichGebert/ponytail) | [ponytail-lean-review](skills/ponytail-lean-review/SKILL.md) | Traced formula execution, workers, scoring, submission snapshots and route persistence. Found and fixed draft loss when browser storage is blocked and the user changes exercises; reused one small session-storage helper for both routes |
| [Agent Skills](https://github.com/agentskills/agentskills) | [agent-skills-packaging](skills/agent-skills-packaging/SKILL.md) | Packaged all four capabilities with scoped metadata, relative references, pinned provenance and a supplemental package checker. Checked the helper on valid and invalid packages |
| [OmniRoute](https://github.com/cheaper-inference/OmniRoute) | [omniroute-integration](skills/omniroute-integration/SKILL.md) | Evaluated the gateway against the product contract. Retained deterministic local calculations; documented when optional server-side coaching could justify a gateway. No gateway, provider connection or billable model call was started |

## Versions and provenance

| Source | Inspected revision | Upstream license |
| --- | --- | --- |
| Marketing-for-Founders | `590152fcfb88d1e0c9f4d975392b13c1fc339a1f` | CC BY-SA 4.0 |
| Ponytail | `96608e078b2d5ea607c5c3b8b5a54d1c1fba6846` | MIT |
| Agent Skills | `83021e2be457a9b6679148719c1f6074f0ad975e` | Apache-2.0 code; CC-BY-4.0 documentation |
| OmniRoute | `368013961dced3fa32ebe8d0df1f2f6452d319de` (`3.8.54`) | MIT |

Each package's `references/source-notes.md` records what was actually read, source links, attribution and the boundary between upstream facts and this project's interpretation. Source licenses apply to their respective materials; the marketing skill's adaptation is explicitly CC BY-SA 4.0. The app does not bundle upstream runtimes or install their lifecycle hooks.

## Where they are installed

The four skill folders are installed under the owner's `~/.codex/skills/` and copied into this repository's `skills/` directory for portability and review. Their content was read and applied during this implementation. Newly installed entries may require a Codex discovery refresh or new chat before appearing in the picker; picker visibility was not assumed.

Example prompts:

- `Use $founder-marketing-playbook to improve the next role-specific landing page.`
- `Use $ponytail-lean-review to review this change and its persistence paths.`
- `Use $agent-skills-packaging to package this repository's workflow as a skill.`
- `Use $omniroute-integration to assess optional coaching without changing checked scores.`

On another machine, copy only the desired skill folders to that agent's documented discovery location after inspecting any existing same-name folders. The website itself runs without these developer skills installed.

## Validation

All four packages passed the installed Codex `skill-creator` quick validator and the supplemental package checker. The checker requires Python 3.9+ and PyYAML; it validates metadata and local references without executing a skill's code. Its own checks included a valid package and failures for a mismatched directory, empty description, missing reference and reference outside the package.

To repeat the supplemental check in an isolated Python environment:

```sh
python3 -m venv /tmp/fix-report-skills-check
/tmp/fix-report-skills-check/bin/python -m pip install PyYAML==6.0.3
/tmp/fix-report-skills-check/bin/python skills/agent-skills-packaging/scripts/validate_package.py skills/founder-marketing-playbook skills/ponytail-lean-review skills/agent-skills-packaging skills/omniroute-integration
```

Syntax validation and a source review are not evidence of marketing conversion lift. The homepage changes are informed hypotheses. A real user study is still needed to measure comprehension, activation and learning.
