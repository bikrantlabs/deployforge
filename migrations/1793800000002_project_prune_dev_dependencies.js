/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE projects
      ADD COLUMN prune_dev_dependencies BOOLEAN NOT NULL DEFAULT TRUE;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.sql(`ALTER TABLE projects DROP COLUMN prune_dev_dependencies;`);
};
