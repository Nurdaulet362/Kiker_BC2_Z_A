---
name: omniroute-integration
description: Assess and integrate OmniRoute for an application that needs real model calls, including server-side credentials, bounded requests, provider routing, and graceful fallback. Use when OmniRoute is requested or a model gateway is an actual architectural choice; ordinary static websites do not require it.
---

# OmniRoute Integration

Use OmniRoute as an optional model gateway, with a clear product reason and an explicit failure path. This skill is original integration guidance informed by the upstream project; it is not an upstream skill or an installation of its runtime.

Read [source-notes.md](references/source-notes.md) before implementation for the reviewed revision, API contract, setup pitfalls, and source links. Recheck the deployed version's docs before relying on version-sensitive settings.

## Decide whether a gateway belongs

Inspect the application's product contract, current data flow, deployment target, and tests. Identify the actual model-backed feature and why routing multiple providers, centralizing credentials, or managing model availability would help it. Compare this with a direct server-side provider call when the requirement is simple.

For static content, spreadsheet calculation, fixed scoring, or prepared examples, keep those paths local or deterministic. Do not add a gateway package, dormant adapter, artificial AI label, or new backend merely to demonstrate that this skill was used. A documented decision that no runtime integration is needed is a valid application.

If model help is useful, separate optional generated advice from authoritative business calculations and saved results. Define the benefit and acceptance criteria before adding infrastructure.

## Integrate a real feature

- Put the model call behind an application-owned server endpoint. A Vite build is static; its development proxy is not a production secret boundary. Keep the gateway bearer key and provider credentials out of browser code, `VITE_*` variables, local storage, logs, and downloadable reports.
- Treat the server endpoint as a bounded feature, not an arbitrary proxy: validate request size and shape, select the model/server prompt on the server, apply appropriate access and rate limits, and avoid exposing gateway management endpoints. Do not accept arbitrary upstream URLs from the browser.
- Use a configured `/v1` base URL, an inference-scoped OmniRoute key in `Authorization: Bearer …`, and `POST /chat/completions` for a simple text feature. Choose an allowed connected model or configured combo; `auto` is meaningful only when eligible connections exist. Check model capabilities before relying on tools or structured output.
- Send only data the feature needs. Render model output as untrusted text or validated structured data. Keep learner text separate from instructions; never execute returned code or let generated advice rewrite checked scores.
- Set an application deadline and cancel the outbound request when it expires. Choose the budget for the user interaction instead of inheriting the gateway's long default. Bound output tokens, response size, concurrency, and any retries. Do not retry authentication/policy errors; avoid layered retry loops that multiply gateway fallback attempts.
- Keep provider fallback within the configured privacy, capability, and cost constraints. A gateway fallback can still fail or incur cost. On timeout, malformed output, quota exhaustion, or unavailability, preserve the user's work and show a prepared hint or a clear optional-feature error.
- Record sanitized status, latency, selected route, and available usage metadata when useful. Avoid recording raw learner notes and secret headers by default.

## Operate only within the task's scope

Creating or reviewing an integration skill does not authorize starting a gateway, linking provider accounts, changing developer-tool routing, installing trust certificates, opening a tunnel, or making billable requests. Follow the user's existing authorization for any requested runtime work; do not invent an approval requirement for local design or mocked verification.

When runtime setup is in scope, pin the reviewed package/image version and use the appropriate runtime requirements. Prefer ordinary provider APIs that the account may use. The gateway's advertised free tiers do not grant tokens or account access.

Before exposing a gateway beyond loopback, verify actual bind settings, dashboard authentication, and effective inference-key enforcement. At the reviewed revision the environment template contains `REQUIRE_API_KEY=false` and `INITIAL_PASSWORD=CHANGEME`; a database feature-flag override takes precedence over the environment value. Use unique server secrets, protect the persistent data directory, and configure storage encryption when retaining provider credentials. Test unauthorized inference access rather than assuming an environment setting is enough.

## Verify the boundary

Use mocked responses first: valid output, malformed output, deadline expiry, authentication failure, rate limit, unavailable model, and exhausted fallback. Verify that secrets stay server-side and that optional AI failure leaves deterministic results and progress intact. For a real authorized deployment, check its authenticated model catalog and a minimal allowed request; report any live calls or costs actually incurred.

For a browser-only site with no model feature, report the architectural decision and the relevant existing checks. Do not claim a running gateway, live inference, or savings that were not measured.
