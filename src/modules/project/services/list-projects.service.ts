import { projectRepo } from "../repo/project.repo";

export function listProjects(userId: string) {
  return projectRepo.listForUser(userId);
}
