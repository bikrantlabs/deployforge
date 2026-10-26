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
		CREATE TABLE projects (
			id UUID PRIMARY KEY,
			user_id UUID NOT NULL,
			name TEXT NOT NULL,
			source_url TEXT NOT NULL,

			CONSTRAINT fk_projects_user
				FOREIGN KEY (user_id)
				REFERENCES users(id)
				ON DELETE CASCADE,
			CONSTRAINT uq_projects_user_name
				UNIQUE (user_id, name)
		);
	`);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS projects;`);
};
