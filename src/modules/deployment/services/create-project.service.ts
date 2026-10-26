import { generateUUID } from "src/shared/utils/uuid-generator";
import { ProjectNameAlreadyExistsError, InvalidCloneUrl } from "../errors";
import { HttpRepoDetailFetcher } from "../lib/repo-detail-fetcher";
import { ProjectRepository } from "../repo/types";
import { Project } from "../types";

export const createCreateProjectService = (deps: {
  repoDetailFetcher: HttpRepoDetailFetcher;
  projectRepo: ProjectRepository;
}) => {
  const { repoDetailFetcher, projectRepo } = deps;

  return {
    async createProject(input: {
      cloneUrl: string;
      projectName: string;
      userId: string;
    }): Promise<Project> {
      const existing = await projectRepo.findUniqueByName({
        userId: input.userId,
        projectName: input.projectName,
      });
      if (existing) {
        throw new ProjectNameAlreadyExistsError(input.projectName);
      }

      const repoDetail = await repoDetailFetcher.fetch(input.cloneUrl);
      if (!repoDetail) {
        throw new InvalidCloneUrl();
      }

      const project: Project = {
        projectId: generateUUID(),
        projectName: input.projectName,
        sourceUrl: input.cloneUrl,
        userId: input.userId,
      };
      await projectRepo.create(project);
      return project;
    },
  };
};
