import { PoolClient } from "pg";
import { ProjectDetectionRepository } from "./types";

export const createProjectDetectionRepository =
  (): ProjectDetectionRepository => ({
    async create(result, client: PoolClient) {
      await client.query(
        `INSERT INTO project_detection_results (id, project_id, detection)
         VALUES ($1, $2, $3)`,
        [result.detectionId, result.projectId, result.detection],
      );
    },
  });

export const projectDetectionRepo = createProjectDetectionRepository();
