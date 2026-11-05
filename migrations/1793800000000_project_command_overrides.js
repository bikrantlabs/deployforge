/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE projects
      ADD COLUMN command_overrides JSONB NOT NULL DEFAULT '{}'::jsonb;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.sql(`ALTER TABLE projects DROP COLUMN command_overrides;`);
};
