import { FindProjectByIdData, ProjectRepository } from "../repo/types";
import { Project } from "../types";

export type FindProjectByIdForUserUsecase = (
  input: FindProjectByIdData,
) => Promise<Project | null>;

export const createFindProjectByIdForUserUsecase = (deps: {
  projectRepo: ProjectRepository;
}): FindProjectByIdForUserUsecase => {
  const { projectRepo } = deps;

  return (input) => projectRepo.findByIdForUser(input);
};
