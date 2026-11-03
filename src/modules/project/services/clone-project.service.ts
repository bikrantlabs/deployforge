import { PoolClient } from "pg";
import { NotFoundError } from "src/shared/errors/app-error";
import { TransactionRunner } from "src/shared/infra/db";
import { ProjectRepository } from "../repo/types";
import { Project } from "../types";
import { CloneProjectToTempUsecase } from "../usecases/clone-project-to-temp.usecase";
import { CloneProjectToWorkspaceUsecase } from "../usecases/clone-project-to-workspace.usecase";
import { RemoveClonedProjectUsecase } from "../usecases/remove-cloned-project.usecase";

export type QueueDetectionAfterClone = (input: {
  jobId: string;
  project: Project;
  client: PoolClient;
}) => Promise<void>;

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
  cloneProjectToWorkspace: CloneProjectToWorkspaceUsecase;
  cloneProjectToTemp: CloneProjectToTempUsecase;
  removeClonedProject: RemoveClonedProjectUsecase;
  withTransaction?: TransactionRunner;
  queueDetection?: QueueDetectionAfterClone;
}): CloneProjectService => {
  const {
    projectRepo,
    cloneProjectToWorkspace,
    cloneProjectToTemp,
    removeClonedProject,
    withTransaction,
    queueDetection,
  } = deps;

  return {
    async cloneProject(input) {
      const project = await projectRepo.findByIdForUser({
        projectId: input.projectId,
        userId: input.userId,
      });
      if (!project) {
        throw new NotFoundError("Project");
      }

      const destinationPath = await cloneProjectToWorkspace(project);

      // The public clone endpoint intentionally omits jobId, so manual/API
      // cloning remains synchronous and does not enqueue detection.
      const jobId = input.jobId;
      if (jobId) {
        if (!queueDetection || !withTransaction) {
          throw new Error("Detection job dependencies are not configured");
        }

        await withTransaction((client) =>
          queueDetection({ jobId, project, client }),
        );
      }

      return {
        projectId: project.projectId,
        projectName: project.projectName,
        destinationPath,
      };
    },
    cloneProjectTemp(input) {
      return cloneProjectToTemp(input);
    },
    removeClonedProject(directoryPath) {
      return removeClonedProject(directoryPath);
    },
  };
};
