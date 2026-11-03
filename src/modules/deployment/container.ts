import { generateUUID } from "src/shared/utils/uuid-generator";
import { getPool, withTransaction } from "src/shared/infra/db";
import {
  cloneProjectToTemp,
  cloneProjectToWorkspace,
  detectProjectConfig,
  findProjectByIdForUser,
  persistProjectDetection,
  projectRepo,
  removeClonedProject,
  repoDetailFetcher,
  resolveProjectWorkspace,
} from "src/modules/project/container";
import { createCloneProjectService } from "src/modules/project/services/clone-project.service";
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

const cloneProjectService = createCloneProjectService({
  findProjectByIdForUser,
  cloneProjectToWorkspace,
  cloneProjectToTemp,
  removeClonedProject,
  withTransaction,
  queueDetection: async ({ jobId, project, client }) => {
    const queued = await projectJobRepo.setStatus({
      jobId,
      status: "queued",
      currentStage: "detecting",
      client,
    });
    if (!queued) {
      throw new Error(`Unable to queue detection for project job ${jobId}`);
    }

    await outboxRepo.create(
      {
        outboxId: generateUUID(),
        jobId,
        topic: "detect.requested",
        payload: {
          jobId,
          projectId: project.projectId,
          userId: project.userId,
        },
        createdAt: new Date(),
      },
      client,
    );
  },
});

const detectProjectService = createDetectProjectService({
  findProjectByIdForUser,
  resolveProjectWorkspace,
  detectProjectConfig,
  persistProjectDetection,
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
  createCloneWorker({ projectJobRepo, cloneProjectService });
export const startDetectWorker = () =>
  createDetectWorker({ projectJobRepo, detectProjectService });

export {
  createProjectService,
  cloneProjectService,
  getProjectJobStatusService,
  detectProjectService,
};
