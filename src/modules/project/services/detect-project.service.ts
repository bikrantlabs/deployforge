import { PoolClient } from "pg";
import { NotFoundError } from "src/shared/errors/app-error";
import { TransactionRunner } from "src/shared/infra/db";
import { createLogger } from "src/shared/logger";
import { ProjectDetection } from "../project-detection.types";
import { Project } from "../types";
import { DetectProjectConfigUsecase } from "../usecases/detect-project-config.usecase";
import { FindProjectByIdForUserUsecase } from "../usecases/find-project-by-id-for-user.usecase";
import { PersistProjectDetectionUsecase } from "../usecases/persist-project-detection.usecase";
import { ResolveProjectWorkspaceUsecase } from "../usecases/resolve-project-workspace.usecase";

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
  detectTemp(destinationPath: string): Promise<ProjectDetection>;
};

export const createDetectProjectService = (deps: {
  findProjectByIdForUser: FindProjectByIdForUserUsecase;
  resolveProjectWorkspace: ResolveProjectWorkspaceUsecase;
  detectProjectConfig: DetectProjectConfigUsecase;
  persistProjectDetection: PersistProjectDetectionUsecase;
  withTransaction: TransactionRunner;
  completeDetectionJob?: CompleteDetectionJob;
}): DetectProjectService => {
  const {
    findProjectByIdForUser,
    resolveProjectWorkspace,
    detectProjectConfig,
    persistProjectDetection,
    withTransaction,
    completeDetectionJob,
  } = deps;

  return {
    async detectProject(input) {
      const lookupStartedAt = Date.now();
      logger.info({ projectId: input.projectId }, "Detection request received");
      const project = await findProjectByIdForUser({
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

      const destinationPath = resolveProjectWorkspace(project);
      logger.info(
        { projectId: project.projectId },
        "Starting project analysis",
      );
      const detection = await detectProjectConfig(destinationPath);

      await withTransaction(async (client) => {
        const { detectionId } = await persistProjectDetection({
          projectId: project.projectId,
          detection,
          client,
        });

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
    detectTemp(destinationPath) {
      return detectProjectConfig(destinationPath);
    },
  };
};
