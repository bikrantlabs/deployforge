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
    CREATE TYPE project_job_status AS ENUM (
      'queued',
      'running',
      'completed',
      'failed',
      'canceled'
    );

    CREATE TYPE project_job_stage AS ENUM (
      'cloning',
      'building',
      'deploying'
    );

    CREATE TYPE project_job_topic AS ENUM (
      'clone.requested',
      'build.requested',
      'deploy.requested',
      'deploy.completed',
      'build.completed'
    );

    CREATE TABLE project_jobs (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL,
      project_id UUID NOT NULL,
      status project_job_status,
      current_stage project_job_stage,
      message TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

      CONSTRAINT fk_project_jobs_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
      CONSTRAINT fk_project_jobs_project
        FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE
    );

    CREATE TABLE outbox (
      id UUID PRIMARY KEY,
      job_id UUID NOT NULL,
      topic project_job_topic NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      sent_at TIMESTAMP,

      CONSTRAINT fk_outbox_project_job
        FOREIGN KEY (job_id)
        REFERENCES project_jobs(id)
        ON DELETE CASCADE,
      CONSTRAINT uq_outbox_job_topic
        UNIQUE (job_id, topic)
    );

    CREATE INDEX outbox_unsent_idx
      ON outbox (created_at)
      WHERE sent_at IS NULL;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS outbox;
    DROP TABLE IF EXISTS project_jobs;
    DROP TYPE IF EXISTS project_job_topic;
    DROP TYPE IF EXISTS project_job_stage;
    DROP TYPE IF EXISTS project_job_status;
  `);
};
