import { Pool, PoolClient } from "pg";
import { ProjectJob } from "../types";
import { ProjectJobRepository, ProjectJobStatusView } from "./types";

export const createProjectJobRepo = (pool: Pool): ProjectJobRepository => ({
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

  async findStatusForUser({ jobId, userId }) {
    const { rows } = await pool.query<{
      id: string;
      project_id: string;
      status: ProjectJob["status"];
      current_stage: ProjectJob["currentStage"];
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, project_id, status, current_stage, created_at, updated_at
       FROM project_jobs
       WHERE id = $1 AND user_id = $2`,
      [jobId, userId],
    );
    const row = rows[0];
    if (!row) {
      return null;
    }
    const result: ProjectJobStatusView = {
      jobId: row.id,
      projectId: row.project_id,
      status: row.status,
      currentStage: row.current_stage,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    return result;
  },

  async markQueued(jobId) {
    const updated = await pool.query(
      `UPDATE project_jobs
       SET status = 'queued', updated_at = NOW()
       WHERE id = $1 AND status IS NULL
       RETURNING id`,
      [jobId],
    );
    if (updated.rowCount) {
      return "queued";
    }

    const existing = await pool.query<{ status: ProjectJob["status"] }>(
      "SELECT status FROM project_jobs WHERE id = $1",
      [jobId],
    );
    const existingStatus = existing.rows[0]?.status;
    if (existingStatus === undefined) {
      return "missing";
    }
    return existingStatus === "queued" ? "queued" : "terminal";
  },

  async claimQueued(jobId) {
    const { rowCount } = await pool.query(
      `UPDATE project_jobs
       SET status = 'running', current_stage = 'cloning', message = NULL, updated_at = NOW()
       WHERE id = $1 AND status IN ('queued', 'running')
       RETURNING id`,
      [jobId],
    );
    return Boolean(rowCount);
  },

  async getStatus(jobId) {
    const { rows } = await pool.query<{ status: ProjectJob["status"] }>(
      "SELECT status FROM project_jobs WHERE id = $1",
      [jobId],
    );
    return rows[0]?.status ?? null;
  },

  async setStatus({ jobId, status, currentStage, message }) {
    const { rowCount } = await pool.query(
      `UPDATE project_jobs
       SET status = $2, current_stage = $3, message = $4, updated_at = NOW()
       WHERE id = $1 AND status = 'running'`,
      [jobId, status ?? null, currentStage ?? null, message ?? null],
    );
    return Boolean(rowCount);
  },
});
