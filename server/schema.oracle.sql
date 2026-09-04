-- Oracle Autonomous Database schema for the AccountStore boundary.
-- Apply through an OCI migration job; the local memory adapter remains usable
-- when DB_CONNECT_STRING is absent.
CREATE TABLE users (
  id VARCHAR2(36) PRIMARY KEY,
  username VARCHAR2(24) UNIQUE NOT NULL,
  password_hash VARCHAR2(128) NOT NULL,
  password_salt VARCHAR2(64) NOT NULL,
  recovery_codes CLOB CHECK (recovery_codes IS JSON),
  created_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL
);
CREATE TABLE sessions (token_hash VARCHAR2(128) PRIMARY KEY, user_id VARCHAR2(36) REFERENCES users(id), expires_at TIMESTAMP NOT NULL);
CREATE TABLE campaigns (user_id VARCHAR2(36) PRIMARY KEY REFERENCES users(id), revision NUMBER(10) NOT NULL, save_json CLOB CHECK (save_json IS JSON), updated_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL);
CREATE TABLE preferences (user_id VARCHAR2(36) PRIMARY KEY REFERENCES users(id), preferences_json CLOB CHECK (preferences_json IS JSON), updated_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL);
CREATE TABLE achievements (user_id VARCHAR2(36) REFERENCES users(id), achievement_id VARCHAR2(80), unlocked_at TIMESTAMP DEFAULT SYSTIMESTAMP, PRIMARY KEY (user_id, achievement_id));
CREATE TABLE schema_migrations (version VARCHAR2(32) PRIMARY KEY, applied_at TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL);
