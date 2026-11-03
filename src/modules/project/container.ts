import { config } from "src/shared/config/config";
import { getPool } from "src/shared/infra/db";
import { GitSourceCloner } from "src/shared/lib/repo-cloner";
import { HttpRepoDetailFetcher } from "src/shared/lib/repo-detail-fetcher";
import { WorkspaceProvisioner } from "src/shared/lib/workspace-provisioner";
import { RailpackConfigDetector } from "src/shared/railpack/railpack-config-detector";
import { SpawnCommandRunner } from "src/shared/utils/command-runner";
import { createProjectDetectionResultRepository } from "./repo/project-detection-result.repo";
import { createProjectRepository } from "./repo/project.repo";
import { createInspectProjectService } from "./services/inspect-project.service";
import { createListProjectsService } from "./services/list-projects.service";
import { createCloneProjectToTempUsecase } from "./usecases/clone-project-to-temp.usecase";
import { createCloneProjectToWorkspaceUsecase } from "./usecases/clone-project-to-workspace.usecase";
import { createRemoveClonedProjectUsecase } from "./usecases/remove-cloned-project.usecase";

const pool = getPool();

export const projectRepo = createProjectRepository(pool);
export const projectDetectionResultRepo =
  createProjectDetectionResultRepository();
export const repoDetailFetcher = new HttpRepoDetailFetcher(config.GITHUB_TOKEN);
export const workspaceProvisioner = new WorkspaceProvisioner();
export const projectConfigDetector = new RailpackConfigDetector(
  new SpawnCommandRunner(),
  config.RAILPACK_DETECTION_TIMEOUT_MS,
);

const repoCloner = new GitSourceCloner();

export const cloneProjectToWorkspace = createCloneProjectToWorkspaceUsecase({
  workspace: workspaceProvisioner,
  repoCloner,
});
export const cloneProjectToTemp = createCloneProjectToTempUsecase({
  repoCloner,
});
export const removeClonedProject = createRemoveClonedProjectUsecase();

export const listProjectsService = createListProjectsService({
  projectRepo,
});

export const inspectProjectService = createInspectProjectService({
  projectRepo,
  repoDetailFetcher,
  cloneProjectToTemp,
  detector: projectConfigDetector,
  removeClonedProject,
});
