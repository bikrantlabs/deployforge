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
import { createDetectProjectConfigUsecase } from "./usecases/detect-project-config.usecase";
import { createFetchRepoDetailUsecase } from "./usecases/fetch-repo-detail.usecase";
import { createFindProjectByIdForUserUsecase } from "./usecases/find-project-by-id-for-user.usecase";
import { createFindProjectBySourceUrlUsecase } from "./usecases/find-project-by-source-url.usecase";
import { createListProjectsForUserUsecase } from "./usecases/list-projects-for-user.usecase";
import { createPersistProjectDetectionUsecase } from "./usecases/persist-project-detection.usecase";
import { createRemoveClonedProjectUsecase } from "./usecases/remove-cloned-project.usecase";
import { createResolveProjectWorkspaceUsecase } from "./usecases/resolve-project-workspace.usecase";

const pool = getPool();

export const projectRepo = createProjectRepository(pool);
const projectDetectionResultRepo = createProjectDetectionResultRepository();
export const repoDetailFetcher = new HttpRepoDetailFetcher(config.GITHUB_TOKEN);

const workspaceProvisioner = new WorkspaceProvisioner();
const repoCloner = new GitSourceCloner();
const projectConfigDetector = new RailpackConfigDetector(
  new SpawnCommandRunner(),
  config.RAILPACK_DETECTION_TIMEOUT_MS,
);

export const listProjectsForUser = createListProjectsForUserUsecase({
  projectRepo,
});
export const findProjectByIdForUser = createFindProjectByIdForUserUsecase({
  projectRepo,
});
export const findProjectBySourceUrl = createFindProjectBySourceUrlUsecase({
  projectRepo,
});
export const fetchRepoDetail = createFetchRepoDetailUsecase({
  repoDetailFetcher,
});
export const cloneProjectToWorkspace = createCloneProjectToWorkspaceUsecase({
  workspace: workspaceProvisioner,
  repoCloner,
});
export const cloneProjectToTemp = createCloneProjectToTempUsecase({
  repoCloner,
});
export const removeClonedProject = createRemoveClonedProjectUsecase();
export const detectProjectConfig = createDetectProjectConfigUsecase({
  detector: projectConfigDetector,
});
export const persistProjectDetection = createPersistProjectDetectionUsecase({
  projectDetectionResultRepo,
});
export const resolveProjectWorkspace = createResolveProjectWorkspaceUsecase({
  workspace: workspaceProvisioner,
});

export const listProjectsService = createListProjectsService({
  listProjectsForUser,
});

export const inspectProjectService = createInspectProjectService({
  findProjectBySourceUrl,
  fetchRepoDetail,
  cloneProjectToTemp,
  detectProjectConfig,
  removeClonedProject,
});
