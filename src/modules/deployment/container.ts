import { getPool, withTransaction } from "src/shared/infra/db";
import { config } from "src/shared/config/config";
import { WorkspaceProvisioner } from "src/shared/lib/workspace-provisioner";
import { projectRepo } from "src/modules/project/repo/project.repo";
import { projectDetectionRepo } from "src/modules/project/repo/project-detection.repo";
import { cloneProject } from "src/modules/project/usecases/clone-project.usecase";
import { Railpack } from "src/shared/railpack/railpack";
import { SpawnCommandRunner } from "src/shared/utils/command-runner";
import { createDetectProjectService } from "src/modules/project/services/detect-project.service";
import { createGetProjectJobStatusService } from "./services/get-project-job-status.service";
import { createOutboxRelay } from "./services/outbox-relay.service";
import { publishOutbox } from "./services/publish-outbox";
import { createOutboxRepo } from "./repo/outbox.repo";
import { createProjectJobRepo } from "./repo/project-job.repo";
import { createCloneWorker } from "./workers/clone.worker";
import { createDetectWorker } from "./workers/detect.worker";

const pool = getPool();
const workspaceProvisioner = new WorkspaceProvisioner();
const railpack = new Railpack(
  new SpawnCommandRunner(),
  config.RAILPACK_DETECTION_TIMEOUT_MS,
);
const projectJobRepo = createProjectJobRepo(pool);
const outboxRepo = createOutboxRepo(pool);
const outboxRelay = createOutboxRelay({
  outboxRepo,
  publish: (message) => publishOutbox(message, projectJobRepo),
});

const getProjectJobStatusService = createGetProjectJobStatusService({
  projectJobRepo,
});

const detectProjectService = createDetectProjectService({
  projectRepo,
  projectDetectionResultRepo: projectDetectionRepo,
  workspace: workspaceProvisioner,
  detector: railpack,
  withTransaction,
  completeDetectionJob: async ({ jobId, client }) => {
    const completed = await projectJobRepo.setStatus({
      jobId,
      status: "completed",
      currentStage: "detecting",
      client,
    });
    if (!completed) {
      throw new Error(`Unable to complete project job ${jobId}`);
    }
  },
});

export const startOutboxRelay = () => outboxRelay.start();
export const startCloneWorker = () =>
  createCloneWorker({
    projectJobRepo,
    cloneProject,
    outboxRepo,
    withTransaction,
  });
export const startDetectWorker = () =>
  createDetectWorker({ projectJobRepo, detectProjectService });

export {
  getProjectJobStatusService,
  detectProjectService,
};
