import { PoolClient } from "pg";
import { ProjectJob } from "../types";
import { ProjectJobRepository } from "./types";

export const createProjectJobRepo = (): ProjectJobRepository => ({
  async createJob(job: ProjectJob, client: PoolClient) {
    await client.query(
      "INSERT INTO project_jobs (id, user_id, project_id, status, current_stage, message) VALUES($1, $2, $3, $4, $5, $6)",
      [
        job.jobId,
        job.userId,
        job.projectId,
        job.status,
        job.currentStage ?? null,
        job.message ?? null,
      ],
    );
  },
});
