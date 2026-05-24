/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    `);
  pgm.sql(`
      CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    `);
  pgm.sql(`
    CREATE TABLE refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id UUID NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      revoked_at TIMESTAMP,
      user_agent TEXT,
      ip_address TEXT,

      CONSTRAINT fk_user
        FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
    );
    `);
  pgm.sql(`
        CREATE TABLE api_keys(
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

            hash VARCHAR(255) UNIQUE NOT NULL,
            mask VARCHAR(20) NOT NULL,
            prefix VARCHAR(20) NOT NULL,
            name VARCHAR(255) NOT NULL,

            is_active BOOLEAN DEFAULT TRUE,
            last_used_at TIMESTAMP,
            expires_at TIMESTAMP,
            
            user_id UUID NOT NULL,

            CONSTRAINT fk_events FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,

            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );      
        `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS refresh_tokens;
    `);
  pgm.sql(`
    DROP TABLE IF EXISTS users;
    `);
  pgm.sql(`
    DROP EXTENSION IF EXISTS pgcrypto;
    `);
  pgm.sql(`
        DROP TABLE api_keys;
        `);
};
