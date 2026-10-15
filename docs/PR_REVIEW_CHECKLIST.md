# Upstream review checklist (no PR created)

**Proposed title:** `feat: add optional local OpenAI-compatible provider with LM Studio preset`

## Scope

- Add a fifth optional Provider without removing/changing the four existing Provider choices.
- Reuse the existing OpenAI Chat Completions and Tool Calling implementation.
- Preset LM Studio loopback `/v1` URL and allow custom loopback-only `/v1`.
- Allow optional API token, stored in existing local secrets storage.
- Include model enumeration, Settings UI, documentation, tests, and build packaging.
- Do not change manifest permission patterns, original default, or extension branding.

## Required review before upstream PR

- [x] Unit test suite and build pass (38/38 tests).
- [x] Local LM Studio API + Function Calling + Tool Result second turn pass (Gemma 4 E4B).
- [ ] Existing cloud provider and Ollama settings remain intact.
- [ ] Existing stored credentials are not exported or logged.
- [ ] Real Chrome side panel opens, connects, refreshes models and saves settings.
- [ ] Browser-to-LM-Studio fetch/CORS tested with extension origin.
- [ ] Real WebMCP Tool Calling and a **second turn** with Tool Result validated.
- [ ] Invalid non-loopback target, URL credentials and query parameters rejected.
- [ ] Changes rebased onto latest upstream main without unrelated personal defaults.
- [ ] Review code, documentation, copyright attribution and Chrome Store implications.
- [ ] Author approves before PR creation.

## Known limitations

- Only loopback server hosts accepted; remote OpenAI-compatible services are out of scope.
- LM Studio preset is a URL/profile convenience, not a bespoke feature-complete adapter.
- Vendor-specific `/api/v0/models` metadata is not displayed.
- Some providers use nonstandard token/tool fields and may not interoperate.
- CORS and true Chrome runtime acceptance are separate from Node unit tests.
- No changes to account secrets or system-wide LM Studio security settings are intended.

Review the **diff from upstream/main**, not the pre-existing personal
`feat/lmstudio-provider-20261015` branch. This review branch intentionally
keeps Ollama and leaves the default provider as Gemini.
