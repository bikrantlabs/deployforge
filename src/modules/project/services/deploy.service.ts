import path from "node:path";
import { withTransaction } from "src/shared/infra/db";
import { projectRepo } from "../repo/project.repo";
import { Project } from "../types";
import { Railpack } from "src/shared/railpack/railpack";
import { SpawnCommandRunner } from "src/shared/utils/command-runner";
import { config } from "src/shared/config/config";
import { WorkspaceProvisioner } from "src/shared/lib/workspace-provisioner";
import { createLogger } from "src/shared/logger";
import { createLogFileWriter } from "src/shared/utils/log-file-writer";

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
  if (!existingProject) {
    withTransaction(async (client) => {
      await projectRepo.create(project, client);
    });
  }

  const destination = workspace.destinationFor(_project);
  const buildLogPath = path.join(
    path.dirname(destination),
    `${path.basename(destination)}.build.log`,
  );

  const logFile = await createLogFileWriter(buildLogPath);
  logger.info({ buildLogPath }, "Writing Railpack output to file");

  let res;
  try {
    res = await railpack.build(
      destination,
      { name: _project.projectName, envVariables },
      createBuildOutputHandler({ destination, envVariables, logFile }),
    );
  } finally {
    await logFile.close().catch((error: unknown) => {
      logger.error({ err: error, buildLogPath }, "Could not finish build log");
    });
  }

  return {
    project: _project,
    res,
    buildLogPath,
  };
}

type OutputStream = "stdout" | "stderr"; // match whatever type Railpack.build uses for `stream`

function createBuildOutputHandler(opts: {
  destination: string;
  envVariables: Record<string, string>;
  logFile: { write: (line: string) => void };
}) {
  const { destination, envVariables, logFile } = opts;
  const secrets = Object.values(envVariables).filter(Boolean);

  return (chunk: string, stream: OutputStream) => {
    let output = chunk;
    for (const secret of secrets) {
      output = output.split(secret).join("[REDACTED]");
    }
    if (!output.trim()) {
      return;
    }

    logger.info(
      {
        workspace: destination,
        stream,
        output: output.trim().slice(0, 2000),
      },
      "Railpack build output",
    );
    logFile.write(
      `[${new Date().toISOString()}] [${stream}] ${output}${output.endsWith("\n") ? "" : "\n"}`,
    );
  };
}
