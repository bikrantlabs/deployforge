import { ProjectRepository } from "../repo/types";

export const createListProjectsService = (projectRepo: ProjectRepository) => ({
  listProjects(userId: string) {
    return projectRepo.listForUser(userId);
  },
});
