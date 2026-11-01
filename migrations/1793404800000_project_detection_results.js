/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE project_detection_results (
      id UUID PRIMARY KEY,
      project_id UUID NOT NULL,
      detection JSONB NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),

      CONSTRAINT fk_project_detection_results_project
        FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE
    );

    CREATE INDEX project_detection_results_project_created_idx
      ON project_detection_results (project_id, created_at DESC);
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS project_detection_results;`);
};
