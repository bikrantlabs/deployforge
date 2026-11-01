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
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { isProtectedPath, tempCloneRoot } from "src/shared/utils/path-utils";

export type CloneProjectService = {
  cloneProject(input: {
    projectId: string;
    userId: string;
    jobId?: string;
  }): Promise<{
    projectId: string;
    projectName: string;
    destinationPath: string;
  }>;
  /**
   * Clones the project into a temporary location under /tmp/.deployforge/
   * and returns the full directory path as a string.
   * Path: /tmp/.deployforge/:userId/:repoName
   */
  cloneProjectTemp(input: {
    repoName: string;
    userId: string;
    sourceUrl: string;
  }): Promise<string>;
  /**
   * Deletes a previously cloned temporary project directory.
   * Prevents deletion of any path that falls inside the main .deployforge
   * workspace (~/.deployforge) or any other path under /tmp (except the
   * managed /tmp/.deployforge temp clones).
   */
  removeClonedProject(directoryPath: string): Promise<void>;
};

export const createCloneProjectService = (deps: {
  projectRepo: ProjectRepository;
  projectJobRepo?: ProjectJobRepository;
  outboxRepo?: OutboxRepository;
  withTransaction?: TransactionRunner;
  workspace: WorkspaceProvisioner;
  repoCloner: GitSourceCloner;
}): CloneProjectService => {
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
      await repoCloner.clone(project.sourceUrl, destinationPath);

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
    async cloneProjectTemp(input: {
      repoName: string;
      userId: string;
      sourceUrl: string;
    }): Promise<string> {
      const tempRoot = tempCloneRoot();
      const destination = path.resolve(tempRoot, input.userId, input.repoName);

      // Guard against userId/repoName containing path traversal segments.
      if (!destination.startsWith(tempRoot + "/")) {
        throw new Error("Invalid temporary clone destination.");
      }

      await mkdir(destination, { recursive: true });
      await repoCloner.clone(input.sourceUrl, destination);

      return destination;
    },
    async removeClonedProject(directoryPath: string): Promise<void> {
      const resolved = path.resolve(directoryPath);

      if (isProtectedPath(resolved)) {
        throw new Error("Deletion is not allowed for this path.");
      }

      await rm(resolved, { recursive: true, force: true });
    },
  };
};
