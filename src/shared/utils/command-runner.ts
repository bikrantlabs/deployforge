import { spawn } from "node:child_process";

export type CommandStream = "stdout" | "stderr";

export type CommandResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type CommandRunOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  onOutput?: (data: string, stream: CommandStream) => void;
};

export class CommandTimeoutError extends Error {
  constructor(command: string, timeoutMs: number) {
    super(`Command '${command}' exceeded timeout of ${timeoutMs}ms`);
    this.name = "CommandTimeoutError";
  }
}

/**
 * Port for running external commands.
 */
export const COMMAND_RUNNER = Symbol("COMMAND_RUNNER");
export type CommandRunner = {
  run(
    command: string,
    args: string[],
    options?: CommandRunOptions,
  ): Promise<CommandResult>;
};

/**
 * CommandRunner adapter backed by node:child_process.spawn.
 *
 * Rejects with the original spawn error (e.g. ENOENT when the binary is not
 * installed); callers decide how to translate that into their own error types.
 */
export class SpawnCommandRunner implements CommandRunner {
  run(
    command: string,
    args: string[],
    options: CommandRunOptions = {},
  ): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: options.cwd,
        env: options.env,
        stdio: ["ignore", "pipe", "pipe"],
        detached: process.platform !== "win32",
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data: Buffer) => {
        const chunk = data.toString();
        stdout += chunk;
        options.onOutput?.(chunk, "stdout");
      });

      child.stderr.on("data", (data: Buffer) => {
        const chunk = data.toString();
        stderr += chunk;
        options.onOutput?.(chunk, "stderr");
      });

      let forceKillTimeout: NodeJS.Timeout | undefined;
      const timeout = options.timeoutMs
        ? setTimeout(() => {
            const kill = (signal: NodeJS.Signals) => {
              if (child.pid && process.platform !== "win32") {
                try {
                  process.kill(-child.pid, signal);
                  return;
                } catch (error) {
                  if ((error as NodeJS.ErrnoException).code !== "ESRCH") {
                    throw error;
                  }
                }
              }
              child.kill(signal);
            };

            kill("SIGTERM");
            forceKillTimeout = setTimeout(() => kill("SIGKILL"), 5_000);
            reject(new CommandTimeoutError(command, options.timeoutMs!));
          }, options.timeoutMs)
        : undefined;

      child.on("error", (error) => {
        if (timeout) clearTimeout(timeout);
        if (forceKillTimeout) clearTimeout(forceKillTimeout);
        reject(error);
      });
      child.on("close", (code) => {
        if (timeout) clearTimeout(timeout);
        if (forceKillTimeout) clearTimeout(forceKillTimeout);
        resolve({
          exitCode: code ?? -1,
          stdout,
          stderr,
        });
      });
    });
  }
}
