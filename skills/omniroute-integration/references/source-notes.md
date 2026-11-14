# OmniRoute source notes

Reviewed on **2026-11-14** through the connected GitHub tools. These are a dated source snapshot and original application recommendations, not a promise about future versions.

- Repository: [cheaper-inference/OmniRoute](https://github.com/cheaper-inference/OmniRoute).
- Default branch observed: `release/v3.8.54`.
- Default-branch head: [`368013961dced3fa32ebe8d0df1f2f6452d319de`](https://github.com/cheaper-inference/OmniRoute/commit/368013961dced3fa32ebe8d0df1f2f6452d319de), committed 2026-11-14 06:16:33 UTC. Reference files below were fetched at this exact revision.
- Package version: `3.8.54`; Node engine: `>=22.22.2 <23 || >=24.0.0 <27`. [package.json](https://github.com/cheaper-inference/OmniRoute/blob/368013961dced3fa32ebe8d0df1f2f6452d319de/package.json).
- License: MIT, copyright (c) 2026 diegosouzapw. Preserve the upstream notice when copying substantial upstream code. This skill copies no upstream implementation. [LICENSE](https://github.com/cheaper-inference/OmniRoute/blob/368013961dced3fa32ebe8d0df1f2f6452d319de/LICENSE).

## Verified contract

| Area | Observed source behavior | Integration consequence |
| --- | --- | --- |
| API base | Local default is `http://localhost:20128/v1`; dashboard is the root of the same origin. | Use the `/v1` root as a configurable server-side base URL; do not accidentally append `/v1` twice. |
| Simple completion | `POST /v1/chat/completions`, JSON `model` and `messages`, bearer authentication. | A native server-side fetch can be enough; a browser SDK or new package is not inherently needed. |
| Model discovery | `GET /v1/models`; capabilities differ by provider/model. | Check the deployed catalog and the selected route before depending on structured outputs or tools. |
| Authentication | Client API key enforcement is configurable; management operations use separate elevated authorization. | Give the application only inference access; keep the administrative surface private. |
| Timeout | `REQUEST_TIMEOUT_MS` defaults to 600000 ms; `STREAM_IDLE_TIMEOUT_MS` inherits it. More specific variables can override this baseline. | Set an interaction-appropriate application deadline. A streaming response-start timeout is not an end-to-end deadline. |
| Provider routing | A provider/model or combo selects eligible connections. `auto` is not a guarantee of an available provider or a free request. | Choose allowable providers and cost limits explicitly; retain application fallback behavior. |

Primary references:

- [API reference](https://github.com/cheaper-inference/OmniRoute/blob/368013961dced3fa32ebe8d0df1f2f6452d319de/docs/reference/API_REFERENCE.md): chat completions, model discovery, key permissions, and authentication.
- [OpenAI compatibility](https://github.com/cheaper-inference/OmniRoute/blob/368013961dced3fa32ebe8d0df1f2f6452d319de/docs/reference/OPENAI_COMPATIBILITY.md): provider-specific capability limits, error behavior, and client base URL.
- [Setup guide](https://github.com/cheaper-inference/OmniRoute/blob/368013961dced3fa32ebe8d0df1f2f6452d319de/docs/guides/SETUP_GUIDE.md): process setup, base URL, timeout layers, reverse proxy settings.
- [README](https://github.com/cheaper-inference/OmniRoute/blob/368013961dced3fa32ebe8d0df1f2f6452d319de/README.md): eligibility-dependent routing, own-account requirement, conditional free-tier claims, and installation lifecycle scripts.

## Security details that change setup decisions

The reviewed [.env.example](https://github.com/cheaper-inference/OmniRoute/blob/368013961dced3fa32ebe8d0df1f2f6452d319de/.env.example) sets `REQUIRE_API_KEY=false` and `INITIAL_PASSWORD=CHANGEME`. It leaves `JWT_SECRET`, `API_KEY_SECRET`, and `STORAGE_ENCRYPTION_KEY` blank. These template values are not a production configuration.

The [feature flag resolver](https://github.com/cheaper-inference/OmniRoute/blob/368013961dced3fa32ebe8d0df1f2f6452d319de/src/shared/utils/featureFlags.ts) resolves database override before environment before default. `isRequireApiKeyEnabled()` fails closed on resolution errors. The [client API policy](https://github.com/cheaper-inference/OmniRoute/blob/368013961dced3fa32ebe8d0df1f2f6452d319de/src/server/authz/policies/clientApi.ts) can admit anonymous calls when enforcement is disabled. Confirm effective enforcement and reject unauthorized calls in a deployed setup.

The [authorization guide](https://github.com/cheaper-inference/OmniRoute/blob/368013961dced3fa32ebe8d0df1f2f6452d319de/docs/architecture/AUTHZ_GUIDE.md) separates client and management credentials. Do not give a learner-facing application a management-scoped key.

The [security policy](https://github.com/cheaper-inference/OmniRoute/blob/368013961dced3fa32ebe8d0df1f2f6452d319de/SECURITY.md) documents AES-256-GCM protection for sensitive stored values and plaintext passthrough when `STORAGE_ENCRYPTION_KEY` is absent. Do not describe credentials as encrypted merely because the gateway supports encryption.

Prefer a bearer header to tokenized URL compatibility aliases, because URLs can enter browser history, proxy logs, and telemetry. Provider keys belong in the gateway's protected configuration; an application uses its own OmniRoute inference key.

## Applied example: Fix the Report

At review, the existing app's `README.md`, `PRODUCT.md`, and `package.json` describe a static React + TypeScript + Vite simulation with browser persistence. Formula execution, independent business-rule calculations, and 30 assessment checks are deterministic. Prepared examples are labelled; the optional written handoff is saved without automated grading. No live AI feature is part of this product contract.

**Decision:** do not install or run OmniRoute, add a provider dependency, or replace scoring with generated judgments. Applying the skill now means retaining the deterministic calculation and honest explanation of prepared examples. This preserves static hosting, guest access, and local progress without introducing a new failure or cost path.

If optional coaching becomes an actual product requirement, the recommended design is:

```text
Learner requests coaching
  → same-origin application server endpoint
  → validated, minimized exercise context
  → authenticated private OmniRoute /v1/chat/completions
  → allowed provider/model
  → validated advice or prepared-hint fallback
```

Keep the existing evaluator responsible for expected values, check results, and scores. Present generated coaching as optional advice. Keep credentials and model selection on the server, set a short explicit request deadline and cost budget, and prevent unavailable coaching from blocking submission or losing progress. The endpoint, budget, and coaching feature above are a design recommendation, not existing app functionality.

No installer, gateway process, provider login, credential access, or inference request was executed during this review.
