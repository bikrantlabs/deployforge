import { NotFoundError } from "src/shared/errors/app-error";
import { GitSourceCloner } from "src/shared/lib/repo-cloner";
import { WorkspaceProvisioner } from "src/shared/lib/workspace-provisioner";
import { ProjectRepository } from "../repo/types";

export type CloneProjectUsecase = (input: {
  projectId: string;
  userId: string;
}) => Promise<{
  projectId: string;
  projectName: string;
  destinationPath: string;
}>;

export const createCloneProjectUsecase = (deps: {
  projectRepo: ProjectRepository;
  workspace: WorkspaceProvisioner;
  repoCloner: GitSourceCloner;
}): CloneProjectUsecase => {
  const { projectRepo, workspace, repoCloner } = deps;

  return async (input) => {
    const project = await projectRepo.findByIdForUser({
      projectId: input.projectId,
      userId: input.userId,
    });
    if (!project) {
      throw new NotFoundError("Project");
    }

    const destinationPath = await workspace.prepare(project);
    await repoCloner.clone(project.sourceUrl, destinationPath);

    return {
      projectId: project.projectId,
      projectName: project.projectName,
      destinationPath,
    };
  };
};
