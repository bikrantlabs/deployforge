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
    ALTER TYPE project_job_stage ADD VALUE 'detecting';
    ALTER TYPE project_job_topic ADD VALUE 'detect.requested';
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`
    DELETE FROM outbox WHERE topic = 'detect.requested';
    UPDATE project_jobs SET current_stage = 'cloning'
    WHERE current_stage = 'detecting';

    ALTER TABLE project_jobs
      ALTER COLUMN current_stage TYPE TEXT USING current_stage::TEXT;
    ALTER TYPE project_job_stage RENAME TO project_job_stage_old;
    CREATE TYPE project_job_stage AS ENUM ('cloning', 'building', 'deploying');
    ALTER TABLE project_jobs
      ALTER COLUMN current_stage TYPE project_job_stage
      USING current_stage::project_job_stage;
    DROP TYPE project_job_stage_old;

    ALTER TABLE outbox ALTER COLUMN topic TYPE TEXT USING topic::TEXT;
    ALTER TYPE project_job_topic RENAME TO project_job_topic_old;
    CREATE TYPE project_job_topic AS ENUM (
      'clone.requested',
      'build.requested',
      'deploy.requested',
      'deploy.completed',
      'build.completed'
    );
    ALTER TABLE outbox
      ALTER COLUMN topic TYPE project_job_topic
      USING topic::project_job_topic;
    DROP TYPE project_job_topic_old;
  `);
};
