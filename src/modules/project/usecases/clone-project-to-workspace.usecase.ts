import { GitSourceCloner } from "src/shared/lib/repo-cloner";
import { WorkspaceProvisioner } from "src/shared/lib/workspace-provisioner";
import { Project } from "../types";

export type CloneProjectToWorkspaceUsecase = (
  project: Project,
) => Promise<string>;

export const createCloneProjectToWorkspaceUsecase = (deps: {
  workspace: WorkspaceProvisioner;
  repoCloner: GitSourceCloner;
}): CloneProjectToWorkspaceUsecase => {
  const { workspace, repoCloner } = deps;

  return async (project) => {
    const destinationPath = await workspace.prepare(project);
    await repoCloner.clone(project.sourceUrl, destinationPath);
    return destinationPath;
  };
};
