import { execFile } from "node:child_process";
import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { Project } from "../types";

const execFileAsync = promisify(execFile);

const CLONE_TIMEOUT_MS = 5 * 60 * 1000; // 5 Minute max timeout
const MAX_OUTPUT_BYTES = 16 * 1024 * 1024; // only clone 16MB repository for now
const STDERR_EXCERPT = 500;

export class SourceCloneError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "SourceCloneError";
  }
}

export class GitSourceCloner {
  async clone(project: Project, destination: string): Promise<void> {
    await this.clearDestination(destination);

    try {
      await execFileAsync(
        "git",
        ["clone", "--depth=1", "--", project.sourceUrl, destination],
        {
          timeout: CLONE_TIMEOUT_MS,
          maxBuffer: MAX_OUTPUT_BYTES,
          // Without this an unreachable or private repo blocks the request on an
          // interactive credential prompt until the timeout fires.
          env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
        },
      );
    } catch (error) {
      const stderr = (error as { stderr?: string }).stderr?.trim();
      const detail = stderr ? `: ${stderr.slice(0, STDERR_EXCERPT)}` : "";
      throw new SourceCloneError(
        `Failed to clone ${project.sourceUrl}${detail}`,
        {
          cause: error,
        },
      );
    }
  }

  // A project reuses its workspace across requests, and git refuses to clone
  // into a non-empty directory. Emptying it (rather than removing it) keeps the
  // path the provisioner handed back valid, and makes the endpoint idempotent.
  private async clearDestination(destination: string): Promise<void> {
    let entries: string[];
    try {
      entries = await readdir(destination);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return;
      }
      throw error;
    }

    await Promise.all(
      entries.map((entry) =>
        rm(path.join(destination, entry), { recursive: true, force: true }),
      ),
    );
  }
}
