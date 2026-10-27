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
import { logger } from "src/shared/logger";

const repoDetailFetcher = new HttpRepoDetailFetcher(config.GITHUB_TOKEN);
const pool = getPool();
const projectRepo = createProjectRepository(pool);
const projectJobRepo = createProjectJobRepo();
const outboxRepo = createOutboxRepo(pool);
const outboxRelay = createOutboxRelay({
  outboxRepo,
  publish: async (message) => {
    logger.info({ message }, "Outbox message ready for publishing");
  },
});

const workspaceProvisioner = new WorkspaceProvisioner();
const repoCloner = new GitSourceCloner();

const createProjectService = createCreateProjectService({
  repoDetailFetcher,
  projectRepo,
  projectJobRepo,
  outboxRepo,
  withTransaction,
});

const cloneProjectService = createCloneProjectService({
  projectRepo,
  workspace: workspaceProvisioner,
  repoCloner,
});

export const startOutboxRelay = () => outboxRelay.start();

export { createProjectService, cloneProjectService };
