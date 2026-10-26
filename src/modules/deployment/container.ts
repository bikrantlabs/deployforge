import { getPool } from "src/shared/infra/db";
import { HttpRepoDetailFetcher } from "./lib/repo-detail-fetcher";
import { createProjectRepository } from "./repo/project.repo";
import { createCreateProjectService } from "./services/create-project.service";
import { createCloneProjectService } from "./services/clone-project.service";
import { WorkspaceProvisioner } from "./lib/workspace-provisioner";
import { GitSourceCloner } from "./lib/repo-cloner";
import { config } from "src/shared/config/config";

const repoDetailFetcher = new HttpRepoDetailFetcher(config.GITHUB_TOKEN);
const projectRepo = createProjectRepository(getPool());

const workspaceProvisioner = new WorkspaceProvisioner();
const repoCloner = new GitSourceCloner();

const createProjectService = createCreateProjectService({
  repoDetailFetcher,
  projectRepo,
});

const cloneProjectService = createCloneProjectService({
  projectRepo,
  workspace: workspaceProvisioner,
  repoCloner,
});

export { createProjectService, cloneProjectService };
