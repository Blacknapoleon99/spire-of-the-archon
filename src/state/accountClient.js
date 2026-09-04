/** Small account client. It is intentionally transport-only so a future OCI
 * deployment can sit behind the same REST contract without changing gameplay. */
export class AccountClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    this.session = null;
  }

  async request(path, options = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || `Request failed (${response.status})`);
    return body;
  }

  async me() {
    try { this.session = await this.request('/api/auth/me'); return this.session; }
    catch { this.session = null; return null; }
  }

  async register(username, password) { const result = await this.request('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) }); this.session = result; return result; }
  async login(username, password) { const result = await this.request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }); this.session = result; return result; }
  async recovery(username, recoveryCode, password) { const result = await this.request('/api/auth/recovery', { method: 'POST', body: JSON.stringify({ username, recoveryCode, password }) }); this.session = result; return result; }
  async logout() { const result = await this.request('/api/auth/logout', { method: 'POST' }); this.session = null; return result; }
  async deleteAccount(password) { const result = await this.request('/api/auth/account', { method: 'DELETE', body: JSON.stringify({ password }) }); this.session = null; return result; }
  getSave() { return this.request('/api/campaign'); }
  saveCampaign(payload, revision) { return this.request('/api/campaign', { method: 'PUT', body: JSON.stringify({ payload, revision }) }); }
}

const defaultApiOrigin = typeof window !== 'undefined' && window.location.port === '5173' ? 'http://localhost:3000' : '';
export const accountClient = new AccountClient(import.meta.env?.VITE_API_ORIGIN || defaultApiOrigin);
