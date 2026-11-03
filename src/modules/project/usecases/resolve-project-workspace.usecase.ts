import { WorkspaceProvisioner } from "src/shared/lib/workspace-provisioner";
import { Project } from "../types";

export type ResolveProjectWorkspaceUsecase = (
  project: Pick<Project, "userId" | "projectName">,
) => string;

export const createResolveProjectWorkspaceUsecase = (deps: {
  workspace: WorkspaceProvisioner;
}): ResolveProjectWorkspaceUsecase => {
  const { workspace } = deps;

  return (project) => workspace.destinationFor(project);
};
