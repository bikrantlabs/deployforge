import { generateUUID } from "src/shared/utils/uuid-generator";
import { HttpRepoDetailFetcher } from "src/shared/lib/repo-detail-fetcher";
import { GitSourceCloner } from "src/shared/lib/repo-cloner";
import { WorkspaceProvisioner } from "src/shared/lib/workspace-provisioner";
import { Railpack } from "src/shared/railpack/railpack";
import { SpawnCommandRunner } from "src/shared/utils/command-runner";
import { config } from "src/shared/config/config";
import { InvalidCloneUrl } from "../errors";
import { projectRepo } from "../repo/project.repo";
import { InspectProjectResult } from "../types";

const repoDetailFetcher = new HttpRepoDetailFetcher(
  config.GITHUB_TOKEN,
  config.GITLAB_TOKEN,
);
const repoCloner = new GitSourceCloner();
const workspace = new WorkspaceProvisioner();
const railpack = new Railpack(
  new SpawnCommandRunner(),
  config.RAILPACK_DETECTION_TIMEOUT_MS,
);

/** Clone into the normal workspace and inspect the checked-out source. */
export async function inspectProject(input: {
  cloneUrl: string;
  userId: string;
}): Promise<InspectProjectResult> {
  const repoDetail = await repoDetailFetcher.fetch(input.cloneUrl);
  if (!repoDetail) {
    throw new InvalidCloneUrl();
  }

  const existing = await projectRepo.findUniqueBySourceUrl({
    userId: input.userId,
    sourceUrl: repoDetail.sourceUrl,
  });

  const project = existing ?? {
    projectId: generateUUID(),
    projectName: repoDetail.repoName,
    userId: input.userId,
    sourceUrl: repoDetail.sourceUrl,
  };
  const destinationPath = await workspace.prepare(project);
  await repoCloner.clone(repoDetail.sourceUrl, destinationPath);
  const detection = await railpack.detect(destinationPath);

  return { project, detection, existing: existing !== null };
}
