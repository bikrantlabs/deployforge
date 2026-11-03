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
    -- Each project gets its own encryption key. It is encrypted by the MASTER_KEY.
    ALTER TABLE projects ADD COLUMN encrypted_project_key BYTEA;

    CREATE TABLE env_vars (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,                -- e.g. "DATABASE_URL" (stored as plain text)
      encrypted_value BYTEA NOT NULL,    -- the value, encrypted with the project's key
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT uq_env_vars_project_name UNIQUE (project_id, name)
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
    ALTER TABLE projects DROP COLUMN encrypted_project_key;

    DROP TABLE env_vars;
    `);
};
