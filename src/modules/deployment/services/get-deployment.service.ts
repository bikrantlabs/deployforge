import { NotFoundError } from "src/shared/errors/app-error";
import { projectDeploymentRepo } from "src/modules/project/repo/deployment.repo";

export async function getDeployment(input: {
  deploymentId: string;
  userId: string;
}) {
  const deployment = await projectDeploymentRepo.findByIdForUser(input);
  if (!deployment) {
    throw new NotFoundError("Deployment");
  }

  return deployment;
}
