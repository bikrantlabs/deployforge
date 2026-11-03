import { FindProjectBySourceUrlData, ProjectRepository } from "../repo/types";
import { Project } from "../types";

export type FindProjectBySourceUrlUsecase = (
  input: FindProjectBySourceUrlData,
) => Promise<Project | null>;

export const createFindProjectBySourceUrlUsecase = (deps: {
  projectRepo: ProjectRepository;
}): FindProjectBySourceUrlUsecase => {
  const { projectRepo } = deps;

  return (input) => projectRepo.findUniqueBySourceUrl(input);
};
