import { getPool } from "src/shared/infra/db";
import { Deployment, DeploymentStatus } from "src/modules/deployment/types";
import { ProjectDeploymentRepository, ProjectDeploymentStatus } from "./types";

// TODO: Enforce not null for image_ref in the database.
type DbDeploymentRow = {
  id: string;
  project_id: string;
  image_ref: string;
  status: DeploymentStatus | null;
  error_message: string | null;
  created_at: Date;
  started_at: Date | null;
  finished_at: Date | null;
};

function toDeployment(row: DbDeploymentRow): Deployment {
  return {
    deploymentId: row.id,
    projectId: row.project_id,
    status: row.status,
    imageRef: row.image_ref,
    errorMessage: row.error_message,
    createdAt: new Date(row.created_at),
    startedAt: row.started_at ? new Date(row.started_at) : null,
    finishedAt: row.finished_at ? new Date(row.finished_at) : null,
  };
}

const deploymentColumns = `
  d.id, d.project_id, d.status, d.image_ref, d.error_message,
  d.created_at, d.started_at, d.finished_at
`;

export const createProjectDeploymentRepository =
  (): ProjectDeploymentRepository => {
    const pool = getPool();

    return {
      async create(input, client) {
        await client.query(
          `INSERT INTO project_deployments (id, project_id, build_log_path, image_ref, status)
           VALUES ($1, $2, $3, $4, 'queued')`,
          [
            input.deploymentId,
            input.projectId,
            input.buildLogPath,
            input.imageRef,
          ],
        );
      },

      async markBuilding(deploymentId) {
        const { rowCount } = await pool.query(
          `UPDATE project_deployments
           SET status = 'building',
               started_at = COALESCE(started_at, now()),
               error_message = NULL,
               finished_at = NULL
           WHERE id = $1 AND status IN ('queued', 'building')`,
          [deploymentId],
        );
        return (rowCount ?? 0) > 0;
      },

      async failStale(staleBefore) {
        const { rows } = await pool.query<{ id: string }>(
          `UPDATE project_deployments
           SET status = 'failed',
               error_message = 'Deployment timed out before making progress',
               finished_at = now()
           WHERE (status = 'building' AND started_at < $1)
              OR (status = 'queued' AND created_at < $1)
           RETURNING id`,
          [staleBefore],
        );
        return rows.map((row) => row.id);
      },

      async listForUser(userId) {
        const { rows } = await pool.query<DbDeploymentRow>(
          `SELECT ${deploymentColumns}
           FROM project_deployments d
           JOIN projects p ON p.id = d.project_id
           WHERE p.user_id = $1
           ORDER BY d.created_at DESC`,
          [userId],
        );
        return rows.map(toDeployment);
      },

      async listForProject(input) {
        const { rows } = await pool.query<DbDeploymentRow>(
          `SELECT ${deploymentColumns}
           FROM project_deployments d
           JOIN projects p ON p.id = d.project_id
           WHERE p.user_id = $1 AND d.project_id = $2
           ORDER BY d.created_at DESC`,
          [input.userId, input.projectId],
        );
        return rows.map(toDeployment);
      },

      async findByIdForUser(input) {
        const { rows } = await pool.query<DbDeploymentRow>(
          `SELECT ${deploymentColumns}
           FROM project_deployments d
           JOIN projects p ON p.id = d.project_id
           WHERE p.user_id = $1 AND d.id = $2`,
          [input.userId, input.deploymentId],
        );
        const row = rows[0];
        return row ? toDeployment(row) : null;
      },

      async findForUser(input) {
        const { rows } = await pool.query<{
          build_log_path: string;
          status: string;
        }>(
          `SELECT d.build_log_path, d.status
           FROM project_deployments d
           JOIN projects p ON p.id = d.project_id
           WHERE d.id = $1 AND p.user_id = $2`,
          [input.deploymentId, input.userId],
        );
        const row = rows[0];
        if (!row) {
          return null;
        }

        return {
          buildLogPath: row.build_log_path,
          status: row.status as ProjectDeploymentStatus,
        };
      },

      async updateStatus(
        deploymentId,
        status,
        imageRef = null,
        errorMessage = null,
      ) {
        await pool.query(
          `UPDATE project_deployments
           SET status = $2, image_ref = $3, error_message = $4, finished_at = now()
           WHERE id = $1`,
          [deploymentId, status, imageRef, errorMessage],
        );
      },
    };
  };

export const projectDeploymentRepo = createProjectDeploymentRepository();
