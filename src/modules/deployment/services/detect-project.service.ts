import { NotFoundError } from "src/shared/errors/app-error";
import { ProjectConfigDetector } from "../types";
import { WorkspaceProvisioner } from "../lib/workspace-provisioner";
import { createLogger } from "src/shared/logger";
import {
  ProjectDetectionResultRepository,
  ProjectJobRepository,
  ProjectRepository,
  TransactionRunner,
} from "../repo/types";
import { generateUUID } from "src/shared/utils/uuid-generator";

const logger = createLogger("detect-project");

export const createDetectProjectService = (deps: {
  projectRepo: ProjectRepository;
  projectDetectionResultRepo: ProjectDetectionResultRepository;
  projectJobRepo: ProjectJobRepository;
  withTransaction: TransactionRunner;
  workspace: Pick<WorkspaceProvisioner, "destinationFor">;
  detector: ProjectConfigDetector;
}) => {
  const {
    projectRepo,
    projectDetectionResultRepo,
    projectJobRepo,
    withTransaction,
    workspace,
    detector,
  } = deps;

  return {
    async detectProject(input: {
      projectId: string;
      userId: string;
      jobId?: string;
    }) {
      const lookupStartedAt = Date.now();
      logger.info({ projectId: input.projectId }, "Detection request received");
      const project = await projectRepo.findByIdForUser(input);
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
        await projectDetectionResultRepo.create(
          {
            detectionId: generateUUID(),
            projectId: project.projectId,
            detection,
          },
          client,
        );

        if (input.jobId) {
          const completed = await projectJobRepo.setStatus({
            jobId: input.jobId,
            status: "completed",
            currentStage: "detecting",
            client,
          });
          if (!completed) {
            throw new Error(`Unable to complete project job ${input.jobId}`);
          }
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
