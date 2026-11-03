import { rm } from "node:fs/promises";
import path from "node:path";
import { isProtectedPath } from "src/shared/utils/path-utils";

export type RemoveClonedProjectUsecase = (
  directoryPath: string,
) => Promise<void>;

export const createRemoveClonedProjectUsecase =
  (): RemoveClonedProjectUsecase => async (directoryPath) => {
    const resolved = path.resolve(directoryPath);

    if (isProtectedPath(resolved)) {
      throw new Error("Deletion is not allowed for this path.");
    }

    await rm(resolved, { recursive: true, force: true });
  };
