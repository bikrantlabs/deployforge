import {
  extractFailureMessage,
  parseRailpackInfo,
  toLogs,
  toProjectDetection,
} from "./railpack-info-response.js";
import {
  DetectionError,
  RailpackUnavailableError,
  UnsupportedProjectError,
} from "./errors.js";
import { CommandRunner, CommandTimeoutError } from "../utils/command-runner.js";
import {
  ProjectConfigDetector,
  ProjectDetection,
} from "src/modules/deployment/types.js";
import { createLogger } from "../logger.js";

export class RailpackConfigDetector implements ProjectConfigDetector {
  private readonly binary: string = "railpack";
  private readonly logger = createLogger("railpack-detector");
  constructor(
    private readonly runner: CommandRunner,
    private readonly timeoutMs: number = 120_000,
  ) {}
  async detect(workspace: string): Promise<ProjectDetection> {
    let stdout: string;
    let stderr: string;
    let exitCode: number;
    const startedAt = Date.now();

    this.logger.info({ workspace }, "Starting Railpack project detection");

    try {
      const result = await this.runner.run(
        this.binary,
        ["info", workspace, "--format", "json"],
        {
          timeoutMs: this.timeoutMs,
          onOutput: (chunk, stream) => {
            if (stream === "stderr" && chunk.trim()) {
              this.logger.info(
                { workspace, output: chunk.trim().slice(0, 2000) },
                "Railpack output",
              );
            }
          },
        },
      );
      ({ stdout, stderr, exitCode } = result);
      this.logger.info(
        {
          workspace,
          durationMs: Date.now() - startedAt,
          exitCode,
          stdoutBytes: Buffer.byteLength(stdout),
          stderrBytes: Buffer.byteLength(stderr),
        },
        "Railpack command completed",
      );
    } catch (cause) {
      this.logger.error(
        { err: cause, workspace, durationMs: Date.now() - startedAt },
        "Railpack command failed",
      );
      if ((cause as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
        throw new RailpackUnavailableError(
          `Railpack binary '${this.binary}' was not found. Install it and make sure it is on PATH.`,
          { cause },
        );
      }
      if (cause instanceof CommandTimeoutError) {
        throw new DetectionError(
          `Railpack project detection exceeded its ${this.timeoutMs}ms timeout`,
          { cause },
        );
      }
      throw new DetectionError(
        `Failed to run '${this.binary} info' for '${workspace}'`,
        { cause },
      );
    }

    if (exitCode !== 0) {
      const detail = stderr.trim() || stdout.trim();
      this.logger.error(
        {
          workspace,
          exitCode,
          durationMs: Date.now() - startedAt,
          output: detail.slice(0, 4000),
        },
        "Railpack exited with a non-zero status",
      );
      throw new DetectionError(
        `'${this.binary} info' failed with exit code ${exitCode}${detail ? `: ${detail}` : ""}`,
      );
    }

    const response = parseRailpackInfo(stdout);

    if (response.success === false) {
      throw new UnsupportedProjectError(
        `Railpack could not detect a supported project in '${workspace}': ${extractFailureMessage(response)}`,
        { logs: toLogs(response.logs) },
      );
    }

    return toProjectDetection(response);
  }
}
