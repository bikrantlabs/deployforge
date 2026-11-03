import { InvalidCloneUrl } from "../errors";
import { InspectProjectResult } from "../types";
import { CloneProjectToTempUsecase } from "../usecases/clone-project-to-temp.usecase";
import { DetectProjectConfigUsecase } from "../usecases/detect-project-config.usecase";
import { FetchRepoDetailUsecase } from "../usecases/fetch-repo-detail.usecase";
import { FindProjectBySourceUrlUsecase } from "../usecases/find-project-by-source-url.usecase";
import { RemoveClonedProjectUsecase } from "../usecases/remove-cloned-project.usecase";
import { generateUUID } from "src/shared/utils/uuid-generator";

export type InspectProjectService = {
  inspectProject(input: {
    cloneUrl: string;
    userId: string;
  }): Promise<InspectProjectResult>;
};

export const createInspectProjectService = (deps: {
  findProjectBySourceUrl: FindProjectBySourceUrlUsecase;
  fetchRepoDetail: FetchRepoDetailUsecase;
  cloneProjectToTemp: CloneProjectToTempUsecase;
  detectProjectConfig: DetectProjectConfigUsecase;
  removeClonedProject: RemoveClonedProjectUsecase;
}): InspectProjectService => {
  const {
    findProjectBySourceUrl,
    fetchRepoDetail,
    cloneProjectToTemp,
    detectProjectConfig,
    removeClonedProject,
  } = deps;

  return {
    async inspectProject(input) {
      const existing = await findProjectBySourceUrl({
        userId: input.userId,
        sourceUrl: input.cloneUrl,
      });

      const repoDetail = await fetchRepoDetail(input.cloneUrl);

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
        const detection = await detectProjectConfig(destination);

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
