import { generateUUID } from "src/shared/utils/uuid-generator";
import { InvalidCloneUrl } from "../errors";
import { HttpRepoDetailFetcher } from "../lib/repo-detail-fetcher";
import { ProjectRepository } from "../repo/types";
import { Project } from "../types";
import { CloneProjectService } from "./clone-project.service";
import { DetectProjectService } from "./detect-project.service";
import { ProjectDetection } from "../project-detection.types";

export const createInspectProjectService = (deps: {
  repoDetailFetcher: HttpRepoDetailFetcher;
  projectRepo: ProjectRepository;
  detectProjectService: DetectProjectService;
  cloneProjectService: CloneProjectService;
}) => {
  const {
    repoDetailFetcher,
    projectRepo,
    detectProjectService,
    cloneProjectService,
  } = deps;

  return {
    async inspectProject(input: { cloneUrl: string; userId: string }): Promise<{
      project: Project;
      detection: ProjectDetection;
      existing: boolean;
    }> {
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

      const destination = await cloneProjectService.cloneProjectTemp({
        repoName: repoDetail.repoName,
        sourceUrl: input.cloneUrl,
        userId: input.userId,
      });

      const projectDetection =
        await detectProjectService.detectTemp(destination);

      // TODO: Get the .env.example file from repo's root folder and send it as detectedEnv
      // as Record<string, string>
      // const detectedRequiredEnv = await detectEnvVariables(destination);

      await cloneProjectService.removeClonedProject(destination);

      return {
        project,
        detection: projectDetection,
        existing: !!existing,
      };
    },
  };
};
