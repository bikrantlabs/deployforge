import { PoolClient } from "pg";
import { NotFoundError } from "src/shared/errors/app-error";
import { TransactionRunner } from "src/shared/infra/db";
import { WorkspaceProvisioner } from "src/shared/lib/workspace-provisioner";
import { createLogger } from "src/shared/logger";
import { generateUUID } from "src/shared/utils/uuid-generator";
import {
  ProjectConfigDetector,
  ProjectDetection,
} from "../project-detection.types";
import {
  ProjectDetectionRepository,
  ProjectRepository,
} from "../repo/types";
import { Project } from "../types";

const logger = createLogger("detect-project");

export type CompleteDetectionJob = (input: {
  jobId: string;
  project: Project;
  detectionId: string;
  detection: ProjectDetection;
  client: PoolClient;
}) => Promise<void>;

export type DetectProjectService = {
  detectProject(input: {
    projectId: string;
    userId: string;
    jobId?: string;
  }): Promise<{
    projectId: string;
    projectName: string;
    detection: ProjectDetection;
  }>;
};

export const createDetectProjectService = (deps: {
  projectRepo: ProjectRepository;
  projectDetectionResultRepo: ProjectDetectionRepository;
  workspace: Pick<WorkspaceProvisioner, "destinationFor">;
  detector: ProjectConfigDetector;
  withTransaction: TransactionRunner;
  completeDetectionJob?: CompleteDetectionJob;
}): DetectProjectService => {
  const {
    projectRepo,
    projectDetectionResultRepo,
    workspace,
    detector,
    withTransaction,
    completeDetectionJob,
  } = deps;

  return {
    async detectProject(input) {
      const lookupStartedAt = Date.now();
      logger.info({ projectId: input.projectId }, "Detection request received");
      const project = await projectRepo.findByIdForUser({
        projectId: input.projectId,
        userId: input.userId,
      });
      logger.info(
        {
          projectId: input.projectId,
          durationMs: Date.now() - lookupStartedAt,
          found: Boolean(project),
        },
        "Detection project lookup completed",
      );
      if (!project) {
        throw new NotFoundError("Project");
      }

      const destinationPath = workspace.destinationFor(project);
      logger.info(
        { projectId: project.projectId },
        "Starting project analysis",
      );
      const detection = await detector.detect(destinationPath);

      await withTransaction(async (client) => {
        const detectionId = generateUUID();
        await projectDetectionResultRepo.create(
          {
            detectionId,
            projectId: project.projectId,
            detection,
          },
          client,
        );

        if (input.jobId) {
          if (!completeDetectionJob) {
            throw new Error("Detection job dependencies are not configured");
          }

          await completeDetectionJob({
            jobId: input.jobId,
            project,
            detectionId,
            detection,
            client,
          });
        }
      });

      return {
        projectId: project.projectId,
        projectName: project.projectName,
        detection,
      };
    },
  };
};
