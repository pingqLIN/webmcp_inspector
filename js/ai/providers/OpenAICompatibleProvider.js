import OpenAIProvider from './OpenAIProvider.js';

export const LOCAL_PRESETS = Object.freeze({
  lmstudio: 'http://127.0.0.1:1234/v1',
  custom: 'http://127.0.0.1:8000/v1'
});

/**
 * OpenAI Chat Completions-compatible endpoint on the local machine.
 * Restrict to loopback only: page-origin WebMCP data is untrusted and must not
 * be allowed to redirect requests (or optional API credentials) to a LAN host.
 */
export default class OpenAICompatibleProvider extends OpenAIProvider {
  constructor(config = {}) {
    super(config);
    this.id = 'openaiCompatible';
    this.name = 'OpenAI-compatible (Local)';
  }

  getBaseUrl() {
    const raw = String(this.config.serverUrl || LOCAL_PRESETS.lmstudio).trim();
    let url;
    try {
      url = new URL(raw);
    } catch {
      throw new Error('Invalid local OpenAI-compatible URL');
    }
    if (!['http:', 'https:'].includes(url.protocol) ||
        !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
        url.username || url.password || url.search || url.hash ||
        !['/v1', '/v1/'].includes(url.pathname)) {
      throw new Error('OpenAI-compatible URL must be a loopback http(s) /v1 endpoint');
    }
    return url.origin + '/v1';
  }

  isConfigured() {
    try {
      this.getBaseUrl();
      return Boolean(String(this.config.model || '').trim());
    } catch {
      return false;
    }
  }

  async testConnection() {
    try {
      this.baseUrl = this.getBaseUrl();
      const response = await fetch(this.baseUrl + '/models', { headers: this.getAuthHeaders() });
      if (!response.ok) return { success: false, error: await this.readApiError(response) };
      const data = await response.json();
      if (!Array.isArray(data.data)) return { success: false, error: 'Invalid /v1/models response' };
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getModels() {
    try {
      this.baseUrl = this.getBaseUrl();
      return await super.getModels();
    } catch {
      return [];
    }
  }

  // A local endpoint may be reachable before a model has been selected.
  canQueryModels() {
    try { this.getBaseUrl(); return true; } catch { return false; }
  }

  getTokenParamForModel() {
    // Local model names must not trigger OpenAI cloud-family token rules.
    return 'max_tokens';
  }

  async sendMessage(messages, tools = []) {
    try {
      this.baseUrl = this.getBaseUrl();
      if (!this.isConfigured()) return { error: 'Choose a local model before sending a message' };
      return await super.sendMessage(messages, tools);
    } catch (error) {
      return { error: error.message };
    }
  }
}
