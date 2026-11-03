import { getPool, withTransaction } from "src/shared/infra/db";
import {
  cloneProject,
  projectConfigDetector,
  projectDetectionResultRepo,
  projectRepo,
  repoDetailFetcher,
  workspaceProvisioner,
} from "src/modules/project/container";
import { createDetectProjectService } from "src/modules/project/services/detect-project.service";
import { createCreateProjectService } from "./services/create-project.service";
import { createGetProjectJobStatusService } from "./services/get-project-job-status.service";
import { createOutboxRelay } from "./services/outbox-relay.service";
import { publishOutbox } from "./services/publish-outbox";
import { createOutboxRepo } from "./repo/outbox.repo";
import { createProjectJobRepo } from "./repo/project-job.repo";
import { createCloneWorker } from "./workers/clone.worker";
import { createDetectWorker } from "./workers/detect.worker";

const pool = getPool();
const projectJobRepo = createProjectJobRepo(pool);
const outboxRepo = createOutboxRepo(pool);
const outboxRelay = createOutboxRelay({
  outboxRepo,
  publish: (message) => publishOutbox(message, projectJobRepo),
});

const createProjectService = createCreateProjectService({
  repoDetailFetcher,
  projectRepo,
  projectJobRepo,
  outboxRepo,
  withTransaction,
});

const getProjectJobStatusService = createGetProjectJobStatusService({
  projectJobRepo,
});

const detectProjectService = createDetectProjectService({
  projectRepo,
  projectDetectionResultRepo,
  workspace: workspaceProvisioner,
  detector: projectConfigDetector,
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
  createProjectService,
  getProjectJobStatusService,
  detectProjectService,
};
