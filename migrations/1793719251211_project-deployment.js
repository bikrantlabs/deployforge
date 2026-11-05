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

    CREATE TYPE project_deployments_status AS ENUM (
    'queued','building','built','failed','live','cancelled'
    );

    CREATE TABLE project_deployments (
      id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

      status         project_deployments_status,


      build_log_path  TEXT NOT NULL,
      image_ref       TEXT,                       -- image name/tag Railpack produced, set on success
      error_message   TEXT,                       -- short failure reason, set on failure

      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      started_at      TIMESTAMPTZ,                -- when status became 'building'
      finished_at     TIMESTAMPTZ                 -- when it reached built/failed/cancelled
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
      DROP TYPE IF EXISTS project_deployments_status;
      DROP TABLE IF EXISTS project_deployments;
    `);
};
