import { NotFoundError } from "src/shared/errors/app-error";
import { projectRepo } from "src/modules/project/repo/project.repo";
import { projectDeploymentRepo } from "src/modules/project/repo/deployment.repo";

async function getDeployment(input: { deploymentId: string; userId: string }) {
  const deployment = await projectDeploymentRepo.findByIdForUser(input);
  if (!deployment) {
    throw new NotFoundError("Deployment");
  }

  return deployment;
}

function listDeployments(userId: string) {
  return projectDeploymentRepo.listForUser(userId);
}

async function listProjectDeployments(input: {
  projectId: string;
  userId: string;
}) {
  const project = await projectRepo.findByIdForUser(input);
  if (!project) {
    throw new NotFoundError("Project");
  }

  return projectDeploymentRepo.listForProject(input);
}

export const deploymentQueryService = {
  getDeployment,
  listDeployments,
  listProjectDeployments,
};
