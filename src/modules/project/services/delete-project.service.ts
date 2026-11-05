import { NotFoundError } from "src/shared/errors/app-error";
import { WorkspaceProvisioner } from "src/shared/lib/workspace-provisioner";
import { createLogger } from "src/shared/logger";
import { projectRepo } from "../repo/project.repo";

const workspace = new WorkspaceProvisioner();
const logger = createLogger("delete-project");

export async function deleteProject(input: {
  projectId: string;
  userId: string;
}) {
  const project = await projectRepo.findByIdForUser(input);
  if (!project) {
    throw new NotFoundError("Project");
  }

  await projectRepo.deleteByIdForUser(input);

  try {
    await workspace.remove(project);
  } catch (error) {
    // The project is already gone from the database; a stale clone shouldn't
    // fail the request.
    logger.warn(
      { err: error, projectId: project.projectId },
      "Failed to remove project workspace",
    );
  }
}
