import { Pool, PoolClient } from "pg";
import {
  CreateProjectData,
  FindProjectByNameData,
  ProjectRepository,
} from "./types";
import { DbProject } from "src/shared/db.types";
import { Project } from "../types";
import { ProjectNameAlreadyExistsError } from "../errors";

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
    async create(data: CreateProjectData, client: PoolClient) {
      try {
        await client.query(
          "INSERT INTO projects(id, name, source_url, user_id) VALUES($1, $2, $3, $4)",
          [data.projectId, data.projectName, data.sourceUrl, data.userId],
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
  };
};
