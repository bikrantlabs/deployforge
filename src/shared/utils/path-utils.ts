import os from "node:os";
import path from "node:path";

/**
 * Resolves a path against the user's home directory expanded .deployforge workspace.
 * The main workspace root is ~/.deployforge.
 */
export function mainWorkspaceRoot(): string {
  return path.resolve(os.homedir(), ".deployforge");
}

/**
 * Determines whether a path is protected from deletion.
 * - Anything under the main workspace (~/.deployforge) is protected.
 * - Anything under /tmp is protected UNLESS it is under /tmp/.deployforge
 *   (the managed temporary clone location).
 */
export function isProtectedPath(filePath: string): boolean {
  const resolved = path.resolve(filePath);
  const normalized = resolved.replace(/\\/g, "/");

  const mainRoot = mainWorkspaceRoot().replace(/\\/g, "/");
  if (normalized === mainRoot || normalized.startsWith(mainRoot + "/")) {
    return true;
  }

  if (
    normalized === "/tmp/.deployforge" ||
    normalized.startsWith("/tmp/.deployforge/")
  ) {
    return false;
  }

  if (normalized.startsWith("/tmp/")) {
    return true;
  }

  return false;
}

/**
 * Returns the managed temporary clone root directory.
 */
export function tempCloneRoot(): string {
  return "/tmp/.deployforge";
}