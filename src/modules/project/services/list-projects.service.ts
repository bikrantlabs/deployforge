import { Project } from "../types";
import { ListProjectsForUserUsecase } from "../usecases/list-projects-for-user.usecase";

export type ListProjectsService = {
  listProjects(userId: string): Promise<Project[]>;
};

export const createListProjectsService = (deps: {
  listProjectsForUser: ListProjectsForUserUsecase;
}): ListProjectsService => {
  const { listProjectsForUser } = deps;

  return {
    listProjects(userId) {
      return listProjectsForUser(userId);
    },
  };
};
