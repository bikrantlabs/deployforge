import { HttpRepoDetailFetcher } from "src/shared/lib/repo-detail-fetcher";
import { generateUUID } from "src/shared/utils/uuid-generator";
import { InvalidCloneUrl } from "../errors";
import { ProjectConfigDetector } from "../project-detection.types";
import { ProjectRepository } from "../repo/types";
import { InspectProjectResult } from "../types";
import { CloneProjectToTempUsecase } from "../usecases/clone-project-to-temp.usecase";
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
  cloneProjectToTemp: CloneProjectToTempUsecase;
  detector: ProjectConfigDetector;
  removeClonedProject: RemoveClonedProjectUsecase;
}): InspectProjectService => {
  const {
    projectRepo,
    repoDetailFetcher,
    cloneProjectToTemp,
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

      const destination = await cloneProjectToTemp({
        repoName: repoDetail.repoName,
        sourceUrl: input.cloneUrl,
        userId: input.userId,
      });

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
