import { access, lstat, mkdir, readlink, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createLogger } from "../logger";

const logger = createLogger("railpack-mise-cache");

export async function ensureMiseCacheLink(version: string): Promise<void> {
  const persistentDirectory = path.join(
    os.homedir(),
    ".local",
    "share",
    "railpack",
    "mise",
  );
  const binaryPath = path.join(persistentDirectory, `mise-${version}`);
  const railpackDirectory = "/tmp/railpack";
  const linkPath = path.join(railpackDirectory, "mise");

  try {
    await access(binaryPath);
  } catch {
    logger.warn(
      { binaryPath, version },
      "Cached Mise binary not found; Railpack may download it on first use",
    );
    return;
  }

  await mkdir(railpackDirectory, { recursive: true });

  try {
    const stats = await lstat(linkPath);
    if (stats.isSymbolicLink()) {
      const currentTarget = await readlink(linkPath);
      const resolvedTarget = path.resolve(railpackDirectory, currentTarget);
      if (resolvedTarget === persistentDirectory) {
        logger.info({ linkPath, persistentDirectory }, "Mise cache link ready");
        return;
      }
    }

    logger.warn(
      { linkPath },
      "Not replacing existing Railpack Mise path; check it before changing it",
    );
    return;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  await symlink(persistentDirectory, linkPath, "dir");
  logger.info(
    { linkPath, persistentDirectory },
    "Created persistent Mise cache link",
  );
}
