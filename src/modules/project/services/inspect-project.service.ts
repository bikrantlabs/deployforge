import { mkdir } from "node:fs/promises";
import path from "node:path";
import { HttpRepoDetailFetcher } from "src/shared/lib/repo-detail-fetcher";
import { GitSourceCloner } from "src/shared/lib/repo-cloner";
import { tempCloneRoot } from "src/shared/utils/path-utils";
import { generateUUID } from "src/shared/utils/uuid-generator";
import { InvalidCloneUrl } from "../errors";
import { ProjectConfigDetector } from "../project-detection.types";
import { ProjectRepository } from "../repo/types";
import { InspectProjectResult } from "../types";
import { RemoveClonedProjectUsecase } from "../usecases/remove-cloned-project.usecase";

export type InspectProjectService = {
  inspectProject(input: {
    cloneUrl: string;
    userId: string;
  }): Promise<InspectProjectResult>;
};

export const createInspectProjectService = (deps: {
  projectRepo: ProjectRepository;
  repoDetailFetcher: HttpRepoDetailFetcher;
  repoCloner: GitSourceCloner;
  detector: ProjectConfigDetector;
  removeClonedProject: RemoveClonedProjectUsecase;
}): InspectProjectService => {
  const {
    projectRepo,
    repoDetailFetcher,
    repoCloner,
    detector,
    removeClonedProject,
  } = deps;

  return {
    async inspectProject(input) {
      const existing = await projectRepo.findUniqueBySourceUrl({
        userId: input.userId,
        sourceUrl: input.cloneUrl,
      });

      const repoDetail = await repoDetailFetcher.fetch(input.cloneUrl);

      if (!repoDetail) {
        throw new InvalidCloneUrl();
      }

      const project = existing ?? {
        projectId: generateUUID(),
        projectName: repoDetail.repoName,
        userId: input.userId,
        sourceUrl: input.cloneUrl,
      };

      const tempRoot = tempCloneRoot();
      const destination = path.resolve(
        tempRoot,
        input.userId,
        repoDetail.repoName,
      );

      // Guard against userId/repoName containing path traversal segments.
      if (!destination.startsWith(tempRoot + "/")) {
        throw new Error("Invalid temporary clone destination.");
      }

      await mkdir(destination, { recursive: true });
      await repoCloner.clone(input.cloneUrl, destination);

      try {
        const detection = await detector.detect(destination);

        // TODO: Get the .env.example file from repo's root folder and send it as detectedEnv
        // as Record<string, string>
        // const detectedRequiredEnv = await detectEnvVariables(destination);

        return {
          project,
          detection,
          existing: !!existing,
        };
      } finally {
        await removeClonedProject(destination);
      }
    },
  };
};
