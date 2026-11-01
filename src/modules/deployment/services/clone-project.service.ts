import { NotFoundError } from "src/shared/errors/app-error";
import { WorkspaceProvisioner } from "../lib/workspace-provisioner";
import { GitSourceCloner } from "../lib/repo-cloner";
import {
  OutboxRepository,
  ProjectJobRepository,
  ProjectRepository,
  TransactionRunner,
} from "../repo/types";
import { Outbox } from "../types";
import { generateUUID } from "src/shared/utils/uuid-generator";

export const createCloneProjectService = (deps: {
  projectRepo: ProjectRepository;
  projectJobRepo?: ProjectJobRepository;
  outboxRepo?: OutboxRepository;
  withTransaction?: TransactionRunner;
  workspace: WorkspaceProvisioner;
  repoCloner: GitSourceCloner;
}) => {
  const {
    projectRepo,
    projectJobRepo,
    outboxRepo,
    withTransaction,
    workspace,
    repoCloner,
  } = deps;

  return {
    async cloneProject(input: {
      projectId: string;
      userId: string;
      jobId?: string;
    }): Promise<{
      projectId: string;
      projectName: string;
      destinationPath: string;
    }> {
      const project = await projectRepo.findByIdForUser(input);
      if (!project) {
        throw new NotFoundError("Project");
      }

      const destinationPath = await workspace.prepare(project);
      await repoCloner.clone(project, destinationPath);

      // The public clone endpoint intentionally omits jobId, so manual/API
      // cloning remains synchronous and does not enqueue detection.
      const jobId = input.jobId;
      if (jobId) {
        if (!projectJobRepo || !outboxRepo || !withTransaction) {
          throw new Error("Detection job dependencies are not configured");
        }

        const outbox: Outbox = {
          outboxId: generateUUID(),
          jobId,
          topic: "detect.requested",
          payload: {
            jobId,
            projectId: project.projectId,
            userId: project.userId,
          },
          createdAt: new Date(),
        };

        await withTransaction(async (client) => {
          const queued = await projectJobRepo.setStatus({
            jobId,
            status: "queued",
            currentStage: "detecting",
            client,
          });
          if (!queued) {
            throw new Error(
              `Unable to queue detection for project job ${jobId}`,
            );
          }
          await outboxRepo.create(outbox, client);
        });
      }

      return {
        projectId: project.projectId,
        projectName: project.projectName,
        destinationPath,
      };
    },
  };
};
