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
          "INSERT INTO projects(id, name, source_url, user_id, encrypted_project_key) VALUES($1, $2, $3, $4, $5)",
          [
            data.projectId,
            data.projectName,
            data.sourceUrl,
            data.userId,
            encryptedKey,
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

    async getDecryptedKey(
      projectId: string,
      client: PoolClient,
    ): Promise<Buffer | null> {
      const label = `project-key|${projectId}`;

      // FOR UPDATE locks the row from being updated by other transactions until this transactions finishes
      const { rows } = await client.query<{ encrypted_project_key: Buffer }>(
        "SELECT encrypted_project_key FROM projects WHERE id = $1 FOR UPDATE",
        [projectId],
      );
      if (rows[0]?.encrypted_project_key) {
        return decryptBytes(
          config.MASTER_KEY,
          rows[0].encrypted_project_key,
          label,
        );
      }

      return null;
    },
  };
};

export const projectRepo = createProjectRepository(getPool());
