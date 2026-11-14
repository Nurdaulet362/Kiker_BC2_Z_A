---
name: ponytail-lean-review
description: Apply Ponytail's reuse-first implementation and connected-code review workflow when simplifying an existing application, fixing a defect with a minimal complete change, or reviewing a change for correctness and unnecessary complexity.
---

# Ponytail lean review

This is a local adaptation of DietrichGebert/ponytail's implementation, review, and audit guidance. It runs through ordinary repository inspection and the project's existing checks; it does not install Ponytail plugins, commands, lifecycle hooks, or telemetry. Read [source notes](references/source-notes.md) for provenance, upstream boundaries, and the Fix the Report application map.

## Choose the scope

- For implementation, identify the requested observable behavior and the existing data flow before editing. Find every affected caller, test, export, fixture, and persisted representation; related repairs belong in the change.
- For a change review, inspect the named diff and its callers and dependencies, including untouched files. If no target is supplied, use uncommitted changes, or the last commit when clean.
- For a repository audit, map entry points, storage, input boundaries, and expected usage first. Focus depth where incorrect results or lost data would hurt users. Name any uninspected areas.

A review produces findings; apply fixes when the user's request also authorizes implementation. Judge performance against the application's documented limits, not imagined production scale.

## Prefer the first complete solution

Resolve the requirement with an existing project helper or component if one fits. Otherwise consider the standard library or browser platform, then an installed dependency, then a small direct implementation. Drop unrequested options and scaffolding. Keep established project layers and conventions; shorter code is useful only when a reader can still understand it.

Trace every caller before changing shared behavior. Preserve validation, failure reporting, persistence guarantees, and accessibility when moving or merging code. Similar-looking paths with different contracts do not automatically need an abstraction. For an intentional limitation that matters to maintenance, record the limit and a concrete trigger for revisiting it.

## Check the result

Prioritize incorrect behavior, unsafe input handling or data loss, failures at expected load, missing meaningful checks, performance, then unnecessary complexity.

Each defect needs a reproducible input or action and the resulting user-visible problem. Re-read the caller and the claimed failure path. Search dynamic references, configuration, and tests before declaring code unused. Respect a documented shortcut unless current requirements exceed its limit. Avoid speculative issues and stylistic preferences.

Use existing tests to verify the changed behavior. New parsing, monetary calculations, persistence, or bug fixes usually need a focused regression check that would fail for the defect; trivial presentation edits do not need a new test suite. Report commands actually run separately from checks only recommended.

For findings, provide severity, the file location, the concrete failure, its consequence, and the smallest effective fix. For implementation, state the behavior delivered and the relevant test result. Disclose material verification gaps without inventing generic caveats or claiming upstream benchmark gains for this project.
