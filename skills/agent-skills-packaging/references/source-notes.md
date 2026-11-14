# Agent Skills source notes

- Source: [agentskills/agentskills](https://github.com/agentskills/agentskills).
- Inspected 2026-11-14 at commit `83021e2be457a9b6679148719c1f6074f0ad975e` (2026-11-04).
- Read the [README](https://github.com/agentskills/agentskills/blob/83021e2be457a9b6679148719c1f6074f0ad975e/README.md), [specification](https://agentskills.io/specification), and [reference validator](https://github.com/agentskills/agentskills/blob/83021e2be457a9b6679148719c1f6074f0ad975e/skills-ref/src/skills_ref/validator.py).
- Upstream code is Apache-2.0; documentation is CC-BY-4.0, as stated in its README. These local instructions and checker are original adaptations of the public format, not copied upstream implementation. Attribution is retained here; no upstream code, brands or client logos are bundled.

The repository specifies the folder/frontmatter format and offers a Python reference library. It is not a frontend framework or an AI runtime. Its relevant application is to make the four repository-derived skills discoverable, portable and verifiable.

The current upstream reference validator accepts normalized Unicode lower-case names, while some Codex host validators accept only ASCII. This package chooses the common ASCII subset for new names. The upstream format permits `compatibility`; the installed host quick validator currently does not. The four packages in this project avoid that optional field and describe requirements in the body.

The supplemental checker intentionally checks a practical subset plus package integrity: mapping frontmatter, supported fields, name/folder agreement, bounded descriptions, optional field types, a nonempty body, and local Markdown references. Its regular expression does not parse every possible Markdown construct. It does not execute bundled scripts or contact external links. Syntax validation does not imply behavioral quality, safe third-party code, or client installation success.
