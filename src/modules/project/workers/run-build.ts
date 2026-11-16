import { buildLogPathFor } from "src/shared/lib/build-log-path";
import { logger } from "src/shared/logger";
import { createLogFileWriter } from "src/shared/utils/log-file-writer";
import { projectDeploymentRepo } from "../repo/deployment.repo";
import { logBus, doneChannel, LogChunk, logChannel } from "../services/log-bus";
import { Project, CommandOverrides } from "../types";
import { WorkspaceProvisioner } from "src/shared/lib/workspace-provisioner";
import { Railpack } from "src/shared/railpack/railpack";
import { config } from "src/shared/config/config";
import { SpawnCommandRunner } from "src/shared/utils/command-runner";
import { errorMessageFor } from "src/shared/utils/error-message";

const MAX_ERROR_MESSAGE_LENGTH = 2_000;

const railpack = new Railpack(
  new SpawnCommandRunner(),
  config.RAILPACK_BUILD_TIMEOUT_MS,
);
const workspace = new WorkspaceProvisioner();

export async function runBuild(input: {
  project: Project;
  deployment: { deploymentId: string; projectId: string };
  envVariables: Record<string, string>;
  commandOverrides: CommandOverrides;
  pruneDevDependencies: boolean;
  imageRef: string;
}) {
  const {
    project,
    deployment,
    envVariables,
    commandOverrides,
    pruneDevDependencies,
    imageRef,
  } = input;

  const destination = workspace.destinationFor(project);
  const buildLogPath = buildLogPathFor(deployment.deploymentId);
  let status: "built" | "failed" = "failed";
  let errorMessage: string | null = null;
  let logFile: Awaited<ReturnType<typeof createLogFileWriter>> | undefined;
  let onOutput: BuildOutputHandler | undefined;
  try {
    logFile = await createLogFileWriter(buildLogPath);
    onOutput = createBuildOutputHandler({
      deploymentId: deployment.deploymentId,
      envVariables,
      logFile,
    });
    await railpack.build(
      destination,
      {
        name: imageRef,
        envVariables,
        commandOverrides,
        pruneDevDependencies,
      },
      onOutput,
    );
    status = "built";
  } catch (err) {
    errorMessage = redactSecrets(errorMessageFor(err), envVariables).slice(
      0,
      MAX_ERROR_MESSAGE_LENGTH,
    );
    logger.error({ err, deployment, errorMessage }, "Railpack build failed");
  } finally {
    await onOutput?.flush().catch((err: unknown) => {
      logger.error(
        { err, buildLogPath },
        "Could not persist all build log lines",
      );
    });
    await logFile?.close().catch((err: unknown) => {
      logger.error({ err, buildLogPath }, "Could not finish build log");
    });
    await projectDeploymentRepo
      .updateStatus(
        deployment.deploymentId,
        status,
        status === "built" ? imageRef : null,
        status === "failed" ? errorMessage : null,
      )
      .catch((err: unknown) => {
        logger.error({ err, deployment }, "Could not update deployment status");
      });
    // Tell connected SSE clients to close.
    logBus.emit(doneChannel(deployment.deploymentId), status);
  }
}

type BuildOutputHandler = ((
  chunk: string,
  stream: "stdout" | "stderr",
) => void) & { flush: () => Promise<void> };

function redactSecrets(
  text: string,
  envVariables: Record<string, string>,
): string {
  let output = text;
  for (const secret of Object.values(envVariables)) {
    if (!secret) {
      continue;
    }
    output = output.split(secret).join("[REDACTED]");
  }
  return output;
}

function createBuildOutputHandler(opts: {
  deploymentId: string;
  envVariables: Record<string, string>;
  logFile: { write: (line: string) => Promise<void> };
}): BuildOutputHandler {
  const { deploymentId, envVariables, logFile } = opts;

  // Counts chunks for this deployment. Gives every chunk a stable position.
  let nextSeq = 0;
  let pendingWrite = Promise.resolve();

  const onOutput = ((chunk: string, stream: "stdout" | "stderr") => {
    // Hide secret values before the text goes anywhere.
    const output = redactSecrets(chunk, envVariables);

    const lines = output
      .split("\n")
      .map((line) => (line.endsWith("\r") ? line.slice(0, -1) : line))
      .filter((line) => line.trim());
    const logChunk: LogChunk = {
      seq: nextSeq++,
      time: new Date().toISOString(),
      stream,
      lines,
    };

    // Persist before publishing so replay can never miss a live chunk.
    pendingWrite = pendingWrite.then(async () => {
      await logFile.write(JSON.stringify(logChunk) + "\n");
      logBus.emit(logChannel(deploymentId), logChunk);
    });
  }) as BuildOutputHandler;

  onOutput.flush = () => pendingWrite;
  return onOutput;
}
