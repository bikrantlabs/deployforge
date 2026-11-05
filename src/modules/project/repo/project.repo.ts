import { Pool, PoolClient } from "pg";
import { getPool } from "src/shared/infra/db";
import {
  CreateProjectData,
  FindProjectByNameData,
  FindProjectBySourceUrlData,
  ProjectRepository,
} from "./types";
import { DbProject } from "src/shared/db.types";
import { Project } from "../types";
import { ProjectNameAlreadyExistsError } from "../errors";
import { decryptBytes, encryptBytes } from "../services/encryption.service";
import { config } from "src/shared/config/config";
import { randomBytes } from "node:crypto";

function toPublicProject(project: DbProject): Project {
  return {
    projectId: project.id,
    projectName: project.name,
    sourceUrl: project.source_url,
    userId: project.user_id,
    commandOverrides: project.command_overrides,
    pruneDevDependencies: project.prune_dev_dependencies,
  };
}

export const createProjectRepository = (pool: Pool): ProjectRepository => {
  return {
    async listForUser(userId: string): Promise<Project[]> {
      const { rows } = await pool.query<DbProject>(
        "SELECT * FROM projects WHERE user_id = $1",
        [userId],
      );
      return rows.map(toPublicProject);
    },

    async create(data: CreateProjectData, client: PoolClient) {
      try {
        const label = `project-key|${data.projectId}`;
        const newProjectKey = randomBytes(32);
        const encryptedKey = encryptBytes(
          config.MASTER_KEY,
          newProjectKey,
          label,
        );
        await client.query(
          "INSERT INTO projects(id, name, source_url, user_id, encrypted_project_key, command_overrides, prune_dev_dependencies) VALUES($1, $2, $3, $4, $5, $6, $7)",
          [
            data.projectId,
            data.projectName,
            data.sourceUrl,
            data.userId,
            encryptedKey,
            data.commandOverrides ?? {},
            data.pruneDevDependencies ?? true,
          ],
        );
      } catch (error) {
        if ((error as { code?: string }).code === "23505") {
          throw new ProjectNameAlreadyExistsError(data.projectName);
        }
        throw error;
      }
    },

    async findUniqueByName(
      data: FindProjectByNameData,
    ): Promise<Project | null> {
      const { rows } = await pool.query<DbProject>(
        "SELECT * FROM projects WHERE user_id = $1 AND name = $2",
        [data.userId, data.projectName],
      );
      if (!rows[0]) {
        return null;
      }
      return toPublicProject(rows[0]);
    },

    async findUniqueBySourceUrl(
      data: FindProjectBySourceUrlData,
    ): Promise<Project | null> {
      const { rows } = await pool.query<DbProject>(
        "SELECT * FROM projects WHERE user_id = $1 AND source_url = $2",
        [data.userId, data.sourceUrl],
      );
      if (!rows[0]) {
        return null;
      }
      return toPublicProject(rows[0]);
    },

    async findByIdForUser(data) {
      const { rows } = await pool.query<DbProject>(
        "SELECT * FROM projects WHERE user_id = $1 AND id = $2",
        [data.userId, data.projectId],
      );
      if (!rows[0]) {
        return null;
      }
      return toPublicProject(rows[0]);
    },

    async deleteByIdForUser(data) {
      const { rowCount } = await pool.query(
        "DELETE FROM projects WHERE id = $1 AND user_id = $2",
        [data.projectId, data.userId],
      );
      return (rowCount ?? 0) > 0;
    },

    async getDecryptedKey(
      projectId: string,
      client: PoolClient,
    ): Promise<Buffer> {
      const label = `project-key|${projectId}`;

      // FOR UPDATE locks the row from being updated by other transactions until this transactions finishes
      const { rows } = await client.query<{ encrypted_project_key: Buffer }>(
        "SELECT encrypted_project_key FROM projects WHERE id = $1 FOR UPDATE",
        [projectId],
      );
      if (!rows[0]?.encrypted_project_key) {
        throw new Error(
          `Encryption Key doesn't exist for project ${projectId}.`,
        );
      }

      return decryptBytes(
        config.MASTER_KEY,
        rows[0].encrypted_project_key,
        label,
      );
    },

    async updateCommandOverrides(projectId, userId, commandOverrides, client) {
      await client.query(
        "UPDATE projects SET command_overrides = $3 WHERE id = $1 AND user_id = $2",
        [projectId, userId, commandOverrides],
      );
    },

    async updatePruneDevDependencies(
      projectId,
      userId,
      pruneDevDependencies,
      client,
    ) {
      await client.query(
        "UPDATE projects SET prune_dev_dependencies = $3 WHERE id = $1 AND user_id = $2",
        [projectId, userId, pruneDevDependencies],
      );
    },
  };
};

export const projectRepo = createProjectRepository(getPool());
