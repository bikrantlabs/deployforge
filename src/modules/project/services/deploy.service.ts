import { withTransaction } from "src/shared/infra/db";
import { projectRepo } from "../repo/project.repo";
import { Project } from "../types";
import { Railpack } from "src/shared/railpack/railpack";
import { SpawnCommandRunner } from "src/shared/utils/command-runner";
import { config } from "src/shared/config/config";
import { WorkspaceProvisioner } from "src/shared/lib/workspace-provisioner";
import { createLogger } from "src/shared/logger";
import { createLogFileWriter } from "src/shared/utils/log-file-writer";
import { projectDeploymentRepo } from "../repo/deployment.repo";
import { generateUUID } from "src/shared/utils/uuid-generator";
import { doneChannel, logBus, logChannel, LogLine } from "./log-bus";
import { envVarsRepo } from "../repo/env-vars.repo";
import { buildLogPathFor } from "src/shared/lib/build-log-path";

const railpack = new Railpack(
  new SpawnCommandRunner(),
  config.RAILPACK_BUILD_TIMEOUT_MS,
);
const workspace = new WorkspaceProvisioner();
const logger = createLogger("deploy-service");

export async function deployService(input: {
  project: Project;
  envVariables: Record<string, string>;
}) {
  const { project, envVariables } = input;
  const existingProject = await projectRepo.findByIdForUser({
    projectId: project.projectId,
    userId: project.userId,
  });

  const _project = existingProject ?? project;
  const deployment = {
    deploymentId: generateUUID(),
    projectId: _project.projectId,
  };
  const buildLogPath = buildLogPathFor(deployment.deploymentId);
  // Everything that must be saved before we answer the client.
  await withTransaction(async (client) => {
    if (!existingProject) {
      await projectRepo.create(project, client);
    }
    // Always create a deployment row
    const encryptionKey = await projectRepo.getDecryptedKey(
      _project.projectId,
      client,
    );
    await projectDeploymentRepo.create({ ...deployment, buildLogPath }, client);
    await envVarsRepo.create(
      {
        projectId: _project.projectId,
        projectEncryptionKey: encryptionKey,
        envVariables,
      },
      client,
    );
  });

  void runBuild({ project: _project, deployment, envVariables }).catch(
    (err) => {
      logger.error({ err, deployment }, "Background build crashed");
    },
  );

  return {
    project: _project,
    deployment,
  };
}

async function runBuild(input: {
  project: Project;
  deployment: { deploymentId: string; projectId: string };
  envVariables: Record<string, string>;
}) {
  const { project, deployment, envVariables } = input;

  const destination = workspace.destinationFor(project);
  const buildLogPath = buildLogPathFor(deployment.deploymentId);
  let status: "built" | "failed" = "failed";
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
      { name: project.projectName, envVariables },
      onOutput,
    );
    status = "built";
  } catch (err) {
    logger.error({ err, deployment }, "Railpack build failed");
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
      .updateStatus(deployment.deploymentId, status)
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

function createBuildOutputHandler(opts: {
  deploymentId: string;
  envVariables: Record<string, string>;
  logFile: { write: (line: string) => Promise<void> };
}): BuildOutputHandler {
  const { deploymentId, envVariables, logFile } = opts;
  const secrets = Object.values(envVariables).filter(Boolean);

  // Counts lines for this deployment. Gives every line a stable position.
  let nextSeq = 0;
  let pendingWrite = Promise.resolve();

  const onOutput = ((chunk: string, stream: "stdout" | "stderr") => {
    // Hide secret values before the text goes anywhere.
    let output = chunk;
    for (const secret of secrets) {
      output = output.split(secret).join("[REDACTED]");
    }

    // A chunk can hold several lines, so split it: one seq per line.
    for (const text of output.split("\n")) {
      if (text.trim()) {
        const line: LogLine = {
          seq: nextSeq++,
          time: new Date().toISOString(),
          stream,
          text,
        };

        // Persist before publishing so replay can never miss a live line.
        pendingWrite = pendingWrite.then(async () => {
          await logFile.write(JSON.stringify(line) + "\n");
          logBus.emit(logChannel(deploymentId), line);
        });
      }
    }
  }) as BuildOutputHandler;

  onOutput.flush = () => pendingWrite;
  return onOutput;
}
