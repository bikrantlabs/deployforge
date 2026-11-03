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
import { DeploymentBuildError } from "../errors/app-error.js";
import {
  CommandResult,
  CommandRunner,
  CommandStream,
  CommandTimeoutError,
} from "../utils/command-runner.js";
import { createLogger } from "../logger.js";
import {
  ProjectConfigDetector,
  ProjectDetection,
} from "src/modules/project/project-detection.types.js";

export type RailpackBuildOptions = {
  name: string;
  envVariables: Record<string, string>;
};

export class Railpack implements ProjectConfigDetector {
  private readonly binary = "railpack";
  private readonly logger = createLogger("railpack");

  constructor(
    private readonly runner: CommandRunner,
    private readonly timeoutMs: number = 2 * 60 * 1000, // 2 minute
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

  async build(
    workspace: string,
    options: RailpackBuildOptions,
    onOutput: (chunk: string, stream: CommandStream) => void,
  ): Promise<CommandResult> {
    const imagePrefix = "deployforge_";
    const args = ["build", ".", "--name", imagePrefix + options.name];
    for (const [key, value] of Object.entries(options.envVariables)) {
      args.push("--env", `${key}=${value}`);
    }

    try {
      const result = await this.runner.run(this.binary, args, {
        cwd: workspace,
        env: {
          ...process.env,
          BUILDKIT_HOST:
            process.env.BUILDKIT_HOST ?? "docker-container://buildkit",
        },
        timeoutMs: this.timeoutMs,
        onOutput,
      });

      if (result.exitCode !== 0) {
        const logs = this.redactLogs(result.stdout, result.stderr, options);
        const detail = logs.stderr.trim() || logs.stdout.trim();
        throw this.buildError({
          message: `'${this.binary} build' failed with exit code ${result.exitCode}${detail ? `: ${detail.slice(-4000)}` : ""}`,
          exitCode: result.exitCode,
          retryable: result.exitCode === 75,
          logs,
        });
      }

      return result;
    } catch (cause) {
      if (cause instanceof DeploymentBuildError) {
        throw cause;
      }
      if ((cause as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
        throw new RailpackUnavailableError(
          `Railpack binary '${this.binary}' was not found. Install it and make sure it is on PATH.`,
          { cause },
        );
      }
      if (cause instanceof CommandTimeoutError) {
        throw this.buildError({
          message: `Railpack build exceeded its ${this.timeoutMs}ms timeout`,
          retryable: true,
          logs: this.redactLogs(cause.stdout, cause.stderr, options),
          timeout: true,
        });
      }
      throw this.buildError({
        message: `Railpack could not run the build for image '${options.name}'`,
        retryable: true,
        logs: this.redactLogs("", cause instanceof Error ? cause.message : String(cause), options),
      });
    }
  }

  private buildError(input: {
    message: string;
    retryable: boolean;
    logs: { stdout: string; stderr: string };
    exitCode?: number;
    timeout?: boolean;
  }): DeploymentBuildError {
    return new DeploymentBuildError(input);
  }

  private redactLogs(
    stdout: string,
    stderr: string,
    options: RailpackBuildOptions,
  ): { stdout: string; stderr: string } {
    return {
      stdout: this.redactText(stdout.slice(-12_000), options),
      stderr: this.redactText(stderr.slice(-12_000), options),
    };
  }

  private redactText(value: string, options: RailpackBuildOptions): string {
    let output = value;
    for (const secret of Object.values(options.envVariables)) {
      if (secret) {
        output = output.split(secret).join("[REDACTED]");
      }
    }
    return output;
  }
}
