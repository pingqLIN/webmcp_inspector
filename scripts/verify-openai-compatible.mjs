#!/usr/bin/env node
/**
 * Optional smoke test against a running loopback OpenAI-compatible server.
 * Defaults to checking /v1/models only. --chat additionally verifies tool use.
 * Does not write extension settings or start/download models.
 */
import OpenAICompatibleProvider from '../js/ai/providers/OpenAICompatibleProvider.js';

const args = process.argv.slice(2);
const modelPos = args.indexOf('--model');
const model = modelPos >= 0 ? args[modelPos + 1] : process.env.LOCAL_OPENAI_MODEL || '';
const serverUrl = process.env.LOCAL_OPENAI_BASE_URL || 'http://127.0.0.1:1234/v1';
const apiKey = process.env.LOCAL_OPENAI_API_KEY || '';

const provider = new OpenAICompatibleProvider({
  serverUrl, apiKey, model, temperature: 0.2, maxTokens: 128
});
const status = await provider.testConnection();
if (!status.success) throw new Error('Connection failed: ' + status.error);
const models = await provider.getModels();
console.log(JSON.stringify({ connection: 'PASS', endpoint: provider.getBaseUrl(), models: models.map(m => m.id) }, null, 2));

if (args.includes('--chat')) {
  if (!model) throw new Error('Specify a loaded tool-capable model with --model <model-id> or LOCAL_OPENAI_MODEL');
  const tool = {
    id: 'test|localhost|top|describe_color|0',
    name: 'describe_color',
    description: 'Describe a color by RGB components. Always use this tool.',
    executable: true,
    inputSchema: {
      type: 'object',
      properties: { red: { type: 'integer' }, green: { type: 'integer' }, blue: { type: 'integer' } },
      required: ['red', 'green', 'blue']
    }
  };
  const user = { role: 'user', content: 'Call describe_color for pure red (255, 0, 0), then respond.' };
  const first = await provider.sendMessage([user], [tool]);
  if (first.error) throw new Error('Chat failed: ' + first.error);
  const call = first.toolCalls?.[0];
  if (!call) throw new Error('Model did not return an OpenAI-style function call. Verify model tool-use capability.');
  if (call.toolId !== tool.id) throw new Error('Tool identity mismatch: ' + call.toolId);
  console.log(JSON.stringify({ toolCall: 'PASS', name: call.name, args: call.args }, null, 2));
  const second = await provider.sendMessage([
    user, first.assistantMessage,
    { role: 'tool', toolCallId: call.id, providerName: call.providerName, content: { observedColor: 'red', success: true } }
  ], [tool]);
  if (second.error) throw new Error('Follow-up failed: ' + second.error);
  console.log(JSON.stringify({ toolResultFollowup: 'PASS', response: second.text, additionalToolCalls: second.toolCalls?.length || 0 }, null, 2));
}
