import { ProjectRepository } from "../repo/types";
import { Project } from "../types";

export type ListProjectsForUserUsecase = (userId: string) => Promise<Project[]>;

export const createListProjectsForUserUsecase = (deps: {
  projectRepo: ProjectRepository;
}): ListProjectsForUserUsecase => {
  const { projectRepo } = deps;

  return (userId) => projectRepo.listForUser(userId);
};
