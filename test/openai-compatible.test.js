import assert from 'node:assert/strict';
import test from 'node:test';

import OpenAIProvider from '../js/ai/providers/OpenAIProvider.js';
import OpenAICompatibleProvider from '../js/ai/providers/OpenAICompatibleProvider.js';
import { DEFAULT_SETTINGS } from '../js/settings/SettingsManager.js';

const TOOL = {
  id: 'standard|localhost|top|describe_color|0',
  name: 'describe_color',
  description: 'Describe an RGB color',
  inputSchema: {
    type: 'object',
    properties: { red: { type: 'integer' }, green: { type: 'integer' }, blue: { type: 'integer' } },
    required: ['red', 'green', 'blue']
  },
  executable: true
};

test('local provider retains all upstream defaults and is disabled until selected', () => {
  for (const name of ['gemini', 'openai', 'anthropic', 'ollama']) {
    assert.ok(DEFAULT_SETTINGS.ai.providers[name], name);
  }
  assert.equal(DEFAULT_SETTINGS.ai.defaultProvider, 'gemini');
  assert.equal(DEFAULT_SETTINGS.ai.providers.openaiCompatible.enabled, false);
  assert.equal(DEFAULT_SETTINGS.ai.providers.openaiCompatible.config.preset, 'lmstudio');
});

test('local OpenAI-compatible provider only accepts loopback /v1 endpoints', () => {
  for (const url of [
    'http://127.0.0.1:1234/v1', 'http://localhost:8000/v1/',
    'https://127.0.0.1:443/v1', 'http://[::1]:1234/v1'
  ]) {
    const provider = new OpenAICompatibleProvider({ serverUrl: url, model: 'test-model' });
    assert.equal(provider.isConfigured(), true, url);
    assert.match(provider.getBaseUrl(), /\/v1$/);
  }
  for (const url of [
    'https://api.openai.com/v1', 'http://example.com/v1', 'http://192.168.1.2:1234/v1',
    'http://0.0.0.0:1234/v1', 'http://127.0.0.2:1234/v1',
    'file:///etc/passwd', 'http://127.0.0.1:1234/admin',
    'http://127.0.0.1:1234/v1?token=abc', 'http://u:p@localhost:1234/v1',
    'http://localhost.evil.example/v1'
  ]) {
    const provider = new OpenAICompatibleProvider({ serverUrl: url, model: 'test-model' });
    assert.equal(provider.isConfigured(), false, url);
    assert.throws(() => provider.getBaseUrl(), /loopback|Invalid/i, url);
  }
});

test('local connection check works without a key and does not require selected model', async () => {
  const provider = new OpenAICompatibleProvider({ serverUrl: 'http://127.0.0.1:1234/v1' });
  const oldFetch = globalThis.fetch;
  let last;
  globalThis.fetch = async (url, options) => {
    last = { url, options };
    return { ok: true, json: async () => ({ object: 'list', data: [{ id: 'local-model' }] }) };
  };
  try {
    assert.deepEqual(await provider.testConnection(), { success: true });
    assert.equal(last.url, 'http://127.0.0.1:1234/v1/models');
    assert.equal(last.options.headers.Authorization, undefined);
    const models = await provider.getModels();
    assert.equal(models[0].id, 'local-model');
  } finally {
    globalThis.fetch = oldFetch;
  }
});

test('local optional API key is sent only to the validated local endpoint', async () => {
  const provider = new OpenAICompatibleProvider({ serverUrl: 'http://localhost:8000/v1', apiKey: 'local-dev-key', model: 'local-model' });
  const oldFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url, options };
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'OK' } }] }) };
  };
  try {
    assert.equal((await provider.sendMessage([{ role: 'user', content: 'Hi' }])).text, 'OK');
    assert.equal(captured.options.headers.Authorization, 'Bearer local-dev-key');
    assert.equal(captured.url, 'http://localhost:8000/v1/chat/completions');
  } finally {
    globalThis.fetch = oldFetch;
  }
});

test('local function calling preserves tool identity and follow-up tool results', async () => {
  const provider = new OpenAICompatibleProvider({
    serverUrl: 'http://127.0.0.1:1234/v1', model: 'gpt-oss-20b', temperature: 0.2, maxTokens: 128
  });
  const oldFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    requests.push({ url, options, body });
    return { ok: true, json: async () => requests.length === 1
      ? { choices: [{ message: { content: null, tool_calls: [{
          id: 'call_1', type: 'function', function: { name: 'describe_color', arguments: '{"red":255,"green":0,"blue":0}' }
        }] } }] }
      : { choices: [{ message: { content: 'red' } }] }
    };
  };
  try {
    const first = await provider.sendMessage([{ role: 'user', content: 'What color is this?' }], [TOOL]);
    assert.equal(first.toolCalls[0].toolId, TOOL.id);
    assert.equal(requests[0].body.max_tokens, 128);
    assert.equal(requests[0].body.max_completion_tokens, undefined);
    assert.equal(requests[0].options.headers.Authorization, undefined);
    const second = await provider.sendMessage([
      { role: 'user', content: 'What color is this?' },
      first.assistantMessage,
      { role: 'tool', toolCallId: first.toolCalls[0].id, providerName: first.toolCalls[0].providerName, content: { color: 'red' } }
    ], [TOOL]);
    assert.equal(second.text, 'red');
    assert.equal(requests[1].body.messages[1].tool_calls[0].id, 'call_1');
    assert.equal(requests[1].body.messages[2].tool_call_id, 'call_1');
  } finally {
    globalThis.fetch = oldFetch;
  }
});

test('cloud OpenAI provider still requires API key and keeps its base URL', () => {
  const provider = new OpenAIProvider({ model: 'gpt-4o', apiKey: '' });
  assert.equal(provider.isConfigured(), false);
  assert.equal(provider.baseUrl, 'https://api.openai.com/v1');
  assert.deepEqual(provider.getAuthHeaders(), {});
  provider.config.apiKey = 'test';
  assert.deepEqual(provider.getAuthHeaders(), { Authorization: 'Bearer test' });
});
