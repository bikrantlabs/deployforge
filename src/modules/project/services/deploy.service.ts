import { withTransaction } from "src/shared/infra/db";
import { projectRepo } from "../repo/project.repo";
import { CommandOverrides, Project } from "../types";
import { projectDeploymentRepo } from "../repo/deployment.repo";
import { generateUUID } from "src/shared/utils/uuid-generator";
import { envVarsRepo } from "../repo/env-vars.repo";
import { buildLogPathFor } from "src/shared/lib/build-log-path";
import { Deployment } from "src/modules/deployment/types";
import { getQueue } from "src/shared/infra/events/queue";

export type DeployServiceInput = {
  project: Project;
  envVariables: Record<string, string>;
  commandOverrides?: CommandOverrides;
  pruneDevDependencies?: boolean;
};

export async function deployService(input: DeployServiceInput) {
  const { project, envVariables } = input;
  const existingProject = await projectRepo.findByIdForUser({
    projectId: project.projectId,
    userId: project.userId,
  });

  const commandOverrides =
    input.commandOverrides ??
    existingProject?.commandOverrides ??
    project.commandOverrides ??
    {};
  const pruneDevDependencies =
    input.pruneDevDependencies ??
    existingProject?.pruneDevDependencies ??
    project.pruneDevDependencies ??
    true;
  const _project = {
    ...(existingProject ?? project),
    commandOverrides,
    pruneDevDependencies,
  };

  // TODO: Convert the Deployment type into a class and handle creation of deployment entity with proper id and imageRef.
  const deployment: Deployment = {
    deploymentId: generateUUID(),
    projectId: _project.projectId,
    imageRef: "",
    status: "queued",
    createdAt: new Date(),
  };
  const imageRef = `deployforge_${_project.projectId}:${deployment.deploymentId}`;
  deployment.imageRef = imageRef;
  const buildLogPath = buildLogPathFor(deployment.deploymentId);

  // Everything that must be saved before we answer the client.
  await withTransaction(async (client) => {
    if (!existingProject) {
      await projectRepo.create(
        { ...project, commandOverrides, pruneDevDependencies },
        client,
      );
    } else {
      if (input.commandOverrides !== undefined) {
        await projectRepo.updateCommandOverrides(
          _project.projectId,
          _project.userId,
          commandOverrides,
          client,
        );
      }
      if (input.pruneDevDependencies !== undefined) {
        await projectRepo.updatePruneDevDependencies(
          _project.projectId,
          _project.userId,
          pruneDevDependencies,
          client,
        );
      }
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

  const queue = getQueue("project");

  await queue.add(
    "deploy",
    {
      jobId: deployment.deploymentId,
      projectId: _project.projectId,
      userId: _project.userId,
      project: _project,
      deployment: {
        deploymentId: deployment.deploymentId,
        projectId: deployment.projectId,
      },
      commandOverrides,
      pruneDevDependencies,
      imageRef,
    },
    { jobId: deployment.deploymentId },
  );

  return {
    project: _project,
    deployment,
  };
}
