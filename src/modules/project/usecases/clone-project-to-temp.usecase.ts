import { mkdir } from "node:fs/promises";
import path from "node:path";
import { GitSourceCloner } from "src/shared/lib/repo-cloner";
import { tempCloneRoot } from "src/shared/utils/path-utils";

export type CloneProjectToTempUsecase = (input: {
  repoName: string;
  userId: string;
  sourceUrl: string;
}) => Promise<string>;

export const createCloneProjectToTempUsecase = (deps: {
  repoCloner: GitSourceCloner;
}): CloneProjectToTempUsecase => {
  const { repoCloner } = deps;

  return async (input) => {
    const tempRoot = tempCloneRoot();
    const destination = path.resolve(tempRoot, input.userId, input.repoName);

    // Guard against userId/repoName containing path traversal segments.
    if (!destination.startsWith(tempRoot + "/")) {
      throw new Error("Invalid temporary clone destination.");
    }

    await mkdir(destination, { recursive: true });
    await repoCloner.clone(input.sourceUrl, destination);

    return destination;
  };
};
