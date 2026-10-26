import { NotFoundError } from "src/shared/errors/app-error";
import { ProjectRepository } from "../repo/types";
import { WorkspaceProvisioner } from "../lib/workspace-provisioner";
import { GitSourceCloner } from "../lib/repo-cloner";

export const createCloneProjectService = (deps: {
  projectRepo: ProjectRepository;
  workspace: WorkspaceProvisioner;
  repoCloner: GitSourceCloner;
}) => {
  const { projectRepo, workspace, repoCloner } = deps;

  return {
    async cloneProject(input: {
      projectId: string;
      userId: string;
    }): Promise<{
      projectId: string;
      projectName: string;
      destinationPath: string;
    }> {
      const project = await projectRepo.findByIdForUser(input);
      if (!project) {
        throw new NotFoundError("Project");
      }

      const destinationPath = await workspace.prepare(project);
      await repoCloner.clone(project, destinationPath);

      return {
        projectId: project.projectId,
        projectName: project.projectName,
        destinationPath,
      };
    },
  };
};
