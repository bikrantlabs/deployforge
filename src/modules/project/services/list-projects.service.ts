import { ProjectRepository } from "../repo/types";
import { Project } from "../types";

export type ListProjectsService = {
  listProjects(userId: string): Promise<Project[]>;
};

export const createListProjectsService = (deps: {
  projectRepo: ProjectRepository;
}): ListProjectsService => {
  const { projectRepo } = deps;

  return {
    listProjects(userId) {
      return projectRepo.listForUser(userId);
    },
  };
};
