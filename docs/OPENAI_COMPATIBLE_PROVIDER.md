# OpenAI-compatible local provider

This optional provider connects the WebMCP Inspector side panel to a locally running
OpenAI Chat Completions-compatible API. It does **not** replace OpenAI, Gemini,
Anthropic, or Ollama. The original default provider remains unchanged.

## Supported profiles

| Setting | LM Studio preset | Custom local endpoint |
| --- | --- | --- |
| Server URL | `http://127.0.0.1:1234/v1` | `http://127.0.0.1:<port>/v1` |
| Authentication | Optional, depending on server configuration | Optional |
| Model discovery | `GET /v1/models` | `GET /v1/models` |
| Chat + tool use | `POST /v1/chat/completions` | Same |

1. Start the local model server (in LM Studio, use the Developer / Local Server panel).
2. Open the extension side panel → Settings → AI Providers → OpenAI-compatible (Local) → Configure.
3. Choose **LM Studio** or **Custom**. Set the loopback URL ending in `/v1`.
4. Click **Test Connection**, **Refresh Models**, select a model, then **Save + Set Default**.
5. Use AI Chat on a WebMCP-enabled page. The model must support OpenAI-style tool/function calling for AI-assisted execution.

If the model list includes unloaded models, selecting a model does not guarantee
it is loaded or supports Tool Calling. LM Studio may load it on demand depending on its settings.

## Scope and security

- HTTP(S) connections are permitted only to the local loopback hosts
  `127.0.0.1`, `localhost`, and `[::1]`, with a `/v1` API root.
- LAN hosts, DNS hostnames other than `localhost`, embedded credentials, URL queries,
  and alternate API paths are rejected. This is intentional for the first contribution.
- An optional API Key is stored in Chrome `storage.local` by the existing SettingsManager
  and excluded from settings export. Chrome extension storage is **not encrypted**.
- Unlike Ollama, this provider uses the OpenAI-compatible API, not `/api/chat` or `/api/tags`.
- The extension does not install or start LM Studio and does not download models.
- WebMCP tool descriptions and outputs are untrusted; pre-existing confirmation
  and tool safety checks remain in effect.
- Browser extension-to-local-server requests may require the server to permit the
  extension origin. Native Node/curl API success does not prove browser CORS succeeds.
  Configure allowed origins as narrowly as your server permits.

## Compatibility notes

Only the core OpenAI-compatible subset is assumed: `/models`,
`/chat/completions`, non-streaming replies, and OpenAI-style `tools`/
`tool_calls`. Vendor-specific endpoints (including LM Studio's `/api/v0/models`),
special reasoning fields, alternate token parameters, and arbitrary remote servers are
out of scope. `max_tokens` is sent for local models rather than inferring GPT cloud
rules from model IDs. Full interoperability depends on each server and model.

## Test commands

```sh
npm test
npm run build
curl http://127.0.0.1:1234/v1/models
node scripts/verify-openai-compatible.mjs
node scripts/verify-openai-compatible.mjs --chat --model <loaded-tool-capable-model-id>
```

After building, load `dist/` as an unpacked Chrome extension. Verify
connection/model refresh and a real multi-turn WebMCP tool invocation from the
side panel. Document browser results before opening an upstream PR.
