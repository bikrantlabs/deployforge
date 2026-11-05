import { NotFoundError } from "src/shared/errors/app-error";
import { projectRepo } from "src/modules/project/repo/project.repo";
import { projectDeploymentRepo } from "src/modules/project/repo/deployment.repo";

export function listDeployments(userId: string) {
  return projectDeploymentRepo.listForUser(userId);
}

export async function listProjectDeployments(input: {
  projectId: string;
  userId: string;
}) {
  const project = await projectRepo.findByIdForUser(input);
  if (!project) {
    throw new NotFoundError("Project");
  }

  return projectDeploymentRepo.listForProject(input);
}
