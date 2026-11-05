import { NotFoundError } from "src/shared/errors/app-error";
import { projectRepo } from "../repo/project.repo";

export async function getProject(input: {
  projectId: string;
  userId: string;
}) {
  const project = await projectRepo.findByIdForUser(input);
  if (!project) {
    throw new NotFoundError("Project");
  }
  return project;
}
