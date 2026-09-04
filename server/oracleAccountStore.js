import crypto from 'node:crypto';
import oracledb from 'oracledb';
import { hashPassword, sanitizeCampaignPayload } from './accountStore.js';

try { oracledb.fetchAsString = [oracledb.CLOB]; } catch {}

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

/**
 * Thin-mode Oracle Autonomous Database adapter. It implements the same
 * boundary as AccountStore, keeping the browser REST contract unchanged while
 * moving campaign state and sessions out of process memory.
 */
export class OracleAccountStore {
  constructor(options = {}) {
    this.sessionSecret = options.sessionSecret || process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
    this.filePath = null;
    this.oracleConfigured = true;
    this.oracleEnabled = true;
    this.persistenceMode = 'oracle';
    this.pool = null;
    this.poolOptions = {
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING,
      poolMin: 0,
      poolMax: Math.max(1, Math.min(16, Number(process.env.DB_POOL_MAX) || 4)),
      poolIncrement: 1,
      poolTimeout: 60,
      stmtCacheSize: 20
    };
    this.ready = this.initialize();
  }

  async initialize() {
    this.pool = await oracledb.createPool(this.poolOptions);
    return true;
  }

  async withConnection(callback) {
    await this.ready;
    const connection = await this.pool.getConnection();
    try { return await callback(connection); }
    catch (error) {
      try { await connection.rollback(); } catch {}
      throw error;
    }
    finally { await connection.close(); }
  }

  cleanUsername(username) {
    const clean = String(username || '').trim().toLowerCase();
    if (!/^[a-z0-9_ -]{3,24}$/.test(clean)) throw new Error('Username must be 3–24 letters, numbers, spaces or underscores.');
    return clean;
  }

  cleanPassword(password) {
    if (typeof password !== 'string' || password.length < 8) throw new Error('Password must be at least 8 characters.');
    return password;
  }

  publicUser(user) { return user ? { id: user.id, username: user.username, createdAt: user.createdAt } : null; }

  makeToken() {
    const raw = crypto.randomBytes(32).toString('hex');
    const signature = crypto.createHmac('sha256', this.sessionSecret).update(raw).digest('hex');
    return `${raw}.${signature}`;
  }

  tokenHash(token) { return crypto.createHash('sha256').update(String(token || '')).digest('hex'); }

  verifyToken(token) {
    if (typeof token !== 'string') return false;
    const separator = token.indexOf('.');
    if (separator < 1) return false;
    const rawToken = token.slice(0, separator);
    const signature = token.slice(separator + 1);
    const expected = crypto.createHmac('sha256', this.sessionSecret).update(rawToken).digest('hex');
    if (!/^[a-f0-9]+$/i.test(signature) || signature.length !== expected.length) return false;
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    return signatureBuffer.length === expectedBuffer.length
      && crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  }

  async register(username, password) {
    const clean = this.cleanUsername(username);
    this.cleanPassword(password);
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = await hashPassword(password, salt);
    const recoveryCodes = Array.from({ length: 6 }, () => crypto.randomBytes(5).toString('hex').toUpperCase());
    const user = { id: crypto.randomUUID(), username: clean, salt, passwordHash, recoveryCodes, createdAt: new Date().toISOString() };
    const token = await this.withConnection(async connection => {
      try {
        await connection.execute(
          `INSERT INTO users (id, username, password_hash, password_salt, recovery_codes, created_at)
           VALUES (:id, :username, :passwordHash, :salt, :recoveryCodes, SYSTIMESTAMP)`,
          { id: user.id, username: user.username, passwordHash, salt, recoveryCodes: JSON.stringify(recoveryCodes) },
          { autoCommit: false }
        );
      } catch (error) {
        if (error?.errorNum === 1) throw new Error('That username is already taken.');
        throw error;
      }
      const session = await this.createSession(user, connection);
      await connection.commit();
      return session.token;
    });
    return { user: this.publicUser(user), recoveryCodes, token };
  }

  async findUser(username, connection) {
    const result = await connection.execute(
      `SELECT id AS "id", username AS "username", password_hash AS "passwordHash", password_salt AS "salt",
              recovery_codes AS "recoveryCodes", created_at AS "createdAt"
       FROM users WHERE username = :username`,
      { username: String(username || '').trim().toLowerCase() },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const row = result.rows?.[0];
    if (!row) return null;
    return {
      id: row.id,
      username: row.username,
      passwordHash: row.passwordHash,
      salt: row.salt,
      recoveryCodes: typeof row.recoveryCodes === 'string' ? JSON.parse(row.recoveryCodes || '[]') : [],
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt)
    };
  }

  async login(username, password) {
    return this.withConnection(async connection => {
      const user = await this.findUser(username, connection);
      if (!user) throw new Error('Invalid username or password.');
      const candidate = await hashPassword(password, user.salt);
      const ok = candidate.length === user.passwordHash.length && crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(user.passwordHash, 'hex'));
      if (!ok) throw new Error('Invalid username or password.');
      const session = await this.createSession(user, connection);
      return { token: session.token, user: this.publicUser(user) };
    });
  }

  async resetWithRecovery(username, recoveryCode, password) {
    this.cleanPassword(password);
    return this.withConnection(async connection => {
      const user = await this.findUser(username, connection);
      const code = String(recoveryCode || '').trim().toUpperCase();
      if (!user || !user.recoveryCodes.includes(code)) throw new Error('Invalid recovery code.');
      const salt = crypto.randomBytes(16).toString('hex');
      user.salt = salt;
      user.passwordHash = await hashPassword(password, salt);
      user.recoveryCodes = user.recoveryCodes.filter(value => value !== code);
      await connection.execute(
        `UPDATE users SET password_hash = :passwordHash, password_salt = :salt, recovery_codes = :recoveryCodes WHERE id = :id`,
        { id: user.id, passwordHash: user.passwordHash, salt, recoveryCodes: JSON.stringify(user.recoveryCodes) },
        { autoCommit: false }
      );
      const session = await this.createSession(user, connection);
      await connection.commit();
      return { token: session.token, user: this.publicUser(user) };
    });
  }

  async createSession(user, connection = null) {
    const token = this.makeToken();
    const run = async conn => {
      await conn.execute(
        `INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (:tokenHash, :userId, SYSTIMESTAMP + INTERVAL '30' DAY)`,
        { tokenHash: this.tokenHash(token), userId: user.id },
        { autoCommit: !connection }
      );
    };
    if (connection) await run(connection); else await this.withConnection(run);
    return { token, user: this.publicUser(user) };
  }

  async getBySession(token) {
    if (!this.verifyToken(token)) return null;
    return this.withConnection(async connection => {
      const result = await connection.execute(
        `SELECT u.id AS "id", u.username AS "username", u.created_at AS "createdAt"
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = :tokenHash AND s.expires_at > SYSTIMESTAMP`,
        { tokenHash: this.tokenHash(token) },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const row = result.rows?.[0];
      return row ? { id: row.id, username: row.username, createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt) } : null;
    });
  }

  async destroySession(token) {
    if (!token) return;
    await this.withConnection(connection => connection.execute(`DELETE FROM sessions WHERE token_hash = :tokenHash`, { tokenHash: this.tokenHash(token) }, { autoCommit: true }));
  }

  async getCampaign(user) {
    if (!user) return null;
    return this.withConnection(async connection => {
      const result = await connection.execute(`SELECT revision, save_json AS "saveJson", updated_at AS "updatedAt" FROM campaigns WHERE user_id = :userId`, { userId: user.id }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      const row = result.rows?.[0];
      if (!row) return null;
      const revision = Number(row.REVISION ?? row.revision) || 0;
      return { schemaVersion: 3, contentVersion: '2.0.0', revision, updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt), payload: JSON.parse(row.saveJson || '{}') };
    });
  }

  async saveCampaign(user, payload, revision = 0) {
    if (!user) throw new Error('Authentication required.');
    const safePayload = sanitizeCampaignPayload(payload);
    return this.withConnection(async connection => {
      const currentResult = await connection.execute(`SELECT revision FROM campaigns WHERE user_id = :userId FOR UPDATE`, { userId: user.id }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      const current = currentResult.rows?.[0] ? Number(currentResult.rows[0].REVISION ?? currentResult.rows[0].revision) : null;
      if (current !== null && Number(revision) !== current) throw new Error('Campaign changed elsewhere; reload before saving.');
      const nextRevision = (current ?? (Number(revision) || 0)) + 1;
      if (current === null) {
        await connection.execute(`INSERT INTO campaigns (user_id, revision, save_json, updated_at) VALUES (:userId, :revision, :saveJson, SYSTIMESTAMP)`, { userId: user.id, revision: nextRevision, saveJson: JSON.stringify(safePayload) }, { autoCommit: false });
      } else {
        await connection.execute(`UPDATE campaigns SET revision = :revision, save_json = :saveJson, updated_at = SYSTIMESTAMP WHERE user_id = :userId`, { userId: user.id, revision: nextRevision, saveJson: JSON.stringify(safePayload) }, { autoCommit: false });
      }
      await connection.commit();
      return { schemaVersion: 3, contentVersion: '2.0.0', revision: nextRevision, updatedAt: new Date().toISOString(), payload: safePayload };
    });
  }

  async deleteAccount(username, password) {
    return this.withConnection(async connection => {
      const user = await this.findUser(username, connection);
      if (!user) throw new Error('Invalid username or password.');
      const candidate = await hashPassword(password, user.salt);
      if (candidate.length !== user.passwordHash.length || !crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(user.passwordHash, 'hex'))) throw new Error('Invalid username or password.');
      await connection.execute(`DELETE FROM sessions WHERE user_id = :userId`, { userId: user.id }, { autoCommit: false });
      await connection.execute(`DELETE FROM campaigns WHERE user_id = :userId`, { userId: user.id }, { autoCommit: false });
      await connection.execute(`DELETE FROM preferences WHERE user_id = :userId`, { userId: user.id }, { autoCommit: false });
      await connection.execute(`DELETE FROM achievements WHERE user_id = :userId`, { userId: user.id }, { autoCommit: false });
      await connection.execute(`DELETE FROM users WHERE id = :userId`, { userId: user.id }, { autoCommit: false });
      await connection.commit();
    });
  }
}
