import { getPool, withTransaction } from "src/shared/infra/db";
import { HttpRepoDetailFetcher } from "./lib/repo-detail-fetcher";
import { createProjectRepository } from "./repo/project.repo";
import { createProjectJobRepo } from "./repo/project-job.repo";
import { createOutboxRepo } from "./repo/outbox.repo";
import { createOutboxRelay } from "./services/outbox-relay.service";
import { createCreateProjectService } from "./services/create-project.service";
import { createCloneProjectService } from "./services/clone-project.service";
import { WorkspaceProvisioner } from "./lib/workspace-provisioner";
import { GitSourceCloner } from "./lib/repo-cloner";
import { config } from "src/shared/config/config";
import { publishOutbox } from "./services/publish-outbox";
import { createCloneWorker } from "./workers/clone.worker";
import { createGetProjectJobStatusService } from "./services/get-project-job-status.service";
import { createDetectProjectService } from "./services/detect-project.service";
import { RailpackConfigDetector } from "src/shared/railpack/railpack-config-detector";
import { SpawnCommandRunner } from "src/shared/utils/command-runner";
import { createListProjectsService } from "./services/list-projects.service";

const repoDetailFetcher = new HttpRepoDetailFetcher(config.GITHUB_TOKEN);
const pool = getPool();
const projectRepo = createProjectRepository(pool);
const projectJobRepo = createProjectJobRepo(pool);
const outboxRepo = createOutboxRepo(pool);
const outboxRelay = createOutboxRelay({
  outboxRepo,
  publish: (message) => publishOutbox(message, projectJobRepo),
});

const workspaceProvisioner = new WorkspaceProvisioner();
const repoCloner = new GitSourceCloner();
const projectConfigDetector = new RailpackConfigDetector(
  new SpawnCommandRunner(),
  config.RAILPACK_DETECTION_TIMEOUT_MS,
);

const createProjectService = createCreateProjectService({
  repoDetailFetcher,
  projectRepo,
  projectJobRepo,
  outboxRepo,
  withTransaction,
});

const listProjectsService = createListProjectsService(projectRepo);

const cloneProjectService = createCloneProjectService({
  projectRepo,
  workspace: workspaceProvisioner,
  repoCloner,
});

const getProjectJobStatusService = createGetProjectJobStatusService({
  projectJobRepo,
});

const detectProjectService = createDetectProjectService({
  projectRepo,
  workspace: workspaceProvisioner,
  detector: projectConfigDetector,
});

export const startOutboxRelay = () => outboxRelay.start();
export const startCloneWorker = () =>
  createCloneWorker({ projectJobRepo, cloneProjectService });

export {
  createProjectService,
  listProjectsService,
  cloneProjectService,
  getProjectJobStatusService,
  detectProjectService,
};
