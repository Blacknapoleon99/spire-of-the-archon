import crypto from 'crypto';
import fs from 'node:fs';
import path from 'node:path';
import { CLASS_IDS } from '../src/shared/gameData.js';

export const hashPassword = (password, salt) => new Promise((resolve, reject) => {
  crypto.scrypt(password, salt, 64, (err, derived) => err ? reject(err) : resolve(derived.toString('hex')));
});

/**
 * Account persistence boundary. The memory adapter keeps local development
 * usable; production can install `oracledb` and set DB_CONNECT_STRING to use
 * the same API against Oracle Autonomous Database without changing routes.
 */
export class AccountStore {
  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.filePath = process.env.ACCOUNT_STORE_FILE || path.join(process.cwd(), '.data', 'accounts.json');
    this.sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
    this.oracleConfigured = Boolean(process.env.DB_CONNECT_STRING && process.env.DB_USERNAME && process.env.DB_PASSWORD);
    this.oracleEnabled = false; // A real oracledb adapter is opt-in and not silently emulated.
    this.persistenceMode = this.oracleConfigured ? 'oracle-pending' : 'file';
    this.loadFromDisk();
  }

  loadFromDisk() {
    try {
      if (!fs.existsSync(this.filePath)) return;
      const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      for (const user of Array.isArray(parsed?.users) ? parsed.users : []) {
        if (user?.username && user?.id && user?.passwordHash && user?.salt) {
          if (user.campaign) user.campaign = migrateCampaign(user.campaign);
          this.users.set(user.username, user);
        }
      }
    } catch (error) {
      console.warn(`[AccountStore] Could not load ${this.filePath}:`, error.message);
    }
  }

  flushToDisk() {
    if (this.persistenceMode === 'oracle') return;
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      const tempPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify({ schemaVersion: 1, users: [...this.users.values()] }, null, 2), { mode: 0o600 });
      fs.renameSync(tempPath, this.filePath);
    } catch (error) {
      console.warn(`[AccountStore] Could not persist ${this.filePath}:`, error.message);
    }
  }

  async register(username, password) {
    const clean = String(username || '').trim().toLowerCase();
    if (!/^[a-z0-9_ -]{3,24}$/.test(clean)) throw new Error('Username must be 3–24 letters, numbers, spaces or underscores.');
    if (typeof password !== 'string' || password.length < 8) throw new Error('Password must be at least 8 characters.');
    if (this.users.has(clean)) throw new Error('That username is already taken.');
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = await hashPassword(password, salt);
    const recoveryCodes = Array.from({ length: 6 }, () => crypto.randomBytes(5).toString('hex').toUpperCase());
    const user = { id: crypto.randomUUID(), username: clean, salt, passwordHash, recoveryCodes, campaign: null, createdAt: new Date().toISOString() };
    this.users.set(clean, user);
    this.flushToDisk();
    const session = this.createSession(user);
    return { user: this.publicUser(user), recoveryCodes, token: session.token };
  }

  async login(username, password) {
    const user = this.users.get(String(username || '').trim().toLowerCase());
    if (!user) throw new Error('Invalid username or password.');
    const candidate = await hashPassword(password, user.salt);
    const ok = crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(user.passwordHash, 'hex'));
    if (!ok) throw new Error('Invalid username or password.');
    return this.createSession(user);
  }

  async resetWithRecovery(username, recoveryCode, password) {
    const user = this.users.get(String(username || '').trim().toLowerCase());
    if (!user || typeof recoveryCode !== 'string' || !user.recoveryCodes.includes(recoveryCode.trim().toUpperCase())) throw new Error('Invalid recovery code.');
    if (typeof password !== 'string' || password.length < 8) throw new Error('Password must be at least 8 characters.');
    const salt = crypto.randomBytes(16).toString('hex');
    user.salt = salt;
    user.passwordHash = await hashPassword(password, salt);
    user.recoveryCodes = user.recoveryCodes.filter(code => code !== recoveryCode.trim().toUpperCase());
    this.flushToDisk();
    return this.createSession(user);
  }

  createSession(user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const signature = crypto.createHmac('sha256', this.sessionSecret).update(rawToken).digest('hex');
    const token = `${rawToken}.${signature}`;
    this.sessions.set(token, { userId: user.id, username: user.username, expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30 });
    return { token, user: this.publicUser(user) };
  }

  getBySession(token) {
    if (typeof token !== 'string') return null;
    const separator = token.indexOf('.');
    if (separator < 1) return null;
    const rawToken = token.slice(0, separator);
    const signature = token.slice(separator + 1);
    const expected = crypto.createHmac('sha256', this.sessionSecret).update(rawToken).digest('hex');
    if (!/^[a-f0-9]+$/i.test(signature) || signature.length !== expected.length) return null;
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;
    const session = this.sessions.get(token);
    if (!session || session.expiresAt < Date.now()) { if (token) this.sessions.delete(token); return null; }
    return [...this.users.values()].find(user => user.id === session.userId) || null;
  }

  destroySession(token) { if (token) this.sessions.delete(token); }
  publicUser(user) { return user ? { id: user.id, username: user.username, createdAt: user.createdAt } : null; }
  getCampaign(user) {
    if (!user?.campaign) return null;
    user.campaign = migrateCampaign(user.campaign);
    return user.campaign;
  }

  async deleteAccount(username, password) {
    const user = this.users.get(String(username || '').trim().toLowerCase());
    if (!user) throw new Error('Invalid username or password.');
    const candidate = await hashPassword(password, user.salt);
    if (!crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(user.passwordHash, 'hex'))) throw new Error('Invalid username or password.');
    this.users.delete(user.username);
    for (const [token, session] of this.sessions) if (session.userId === user.id) this.sessions.delete(token);
    this.flushToDisk();
  }
  saveCampaign(user, payload, revision = 0) {
    if (!user) throw new Error('Authentication required.');
    const current = user.campaign;
    if (current && Number(revision) !== Number(current.revision)) throw new Error('Campaign changed elsewhere; reload before saving.');
    user.campaign = { schemaVersion: 3, contentVersion: '2.0.0', revision: Number(revision) + 1, updatedAt: new Date().toISOString(), payload: sanitizeCampaignPayload(payload) };
    this.flushToDisk();
    return user.campaign;
  }
}

export function sanitizeCampaignPayload(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Campaign payload must be an object.');
  const result = JSON.parse(JSON.stringify(payload));
  result.floor = Math.max(1, Math.min(15, Number(result.floor) || 1));
  result.level = Math.max(1, Math.min(15, Number(result.level) || 1));
  result.xp = Math.max(0, Math.min(9999999, Number(result.xp) || 0));
  if (result.wizardClass && !CLASS_IDS.includes(result.wizardClass)) delete result.wizardClass;
  if (result.talents && typeof result.talents === 'object') {
    result.talents = Object.fromEntries(Object.entries(result.talents)
      .slice(0, 24)
      .map(([key, value]) => [String(key).slice(0, 48), Boolean(value)]));
  }
  result.talentPoints = Math.max(0, Math.min(32, Number(result.talentPoints) || 0));
  if (result.attributes && typeof result.attributes === 'object') {
    for (const key of ['vitality', 'arcana', 'focus', 'haste', 'mastery']) {
      result.attributes[key] = Math.max(0, Math.min(999, Number(result.attributes[key]) || 0));
    }
  }
  if (Array.isArray(result.bag)) result.bag = result.bag.slice(0, 24);
  if (result.equipment && typeof result.equipment === 'object') {
    result.equipment = Object.fromEntries(Object.entries(result.equipment).slice(0, 8));
  }
  if (result.settings && typeof result.settings === 'object') {
    result.settings = Object.fromEntries(Object.entries(result.settings).slice(0, 32));
  }
  return result;
}

function migrateCampaign(campaign) {
  if (!campaign || typeof campaign !== 'object') return null;
  const revision = Math.max(0, Number(campaign.revision) || 0);
  return {
    ...campaign,
    schemaVersion: Math.max(3, Number(campaign.schemaVersion) || 1),
    contentVersion: campaign.contentVersion || '2.0.0',
    revision,
    payload: campaign.payload ? sanitizeCampaignPayload(campaign.payload) : null
  };
}
