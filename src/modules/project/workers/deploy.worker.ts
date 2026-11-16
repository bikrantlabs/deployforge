import { createWorker } from "src/shared/infra/events/worker";
import { withTransaction } from "src/shared/infra/db";
import { logger } from "src/shared/logger";
import { errorMessageFor } from "src/shared/utils/error-message";
import { projectRepo } from "../repo/project.repo";
import { projectDeploymentRepo } from "../repo/deployment.repo";
import { envVarsRepo } from "../repo/env-vars.repo";
import { runBuild } from "./run-build";

export const startDeployWorker = () =>
  createWorker("project", {
    deploy: async (payload) => {
      const deploymentId = payload.deployment.deploymentId;
      logger.info(
        {
          jobId: payload.jobId,
          deploymentId,
          projectId: payload.projectId,
        },
        "Starting deploy build job",
      );

      // Claim the deployment before doing any work. A stale deployment may
      // already have been failed by the reaper, in which case we skip it.
      const started = await projectDeploymentRepo.markBuilding(deploymentId);
      if (!started) {
        logger.info(
          { jobId: payload.jobId, deploymentId },
          "Skipping deploy job: deployment is no longer queued or building",
        );
        return;
      }

      let envVariables: Record<string, string>;
      try {
        // Secrets never travel through Redis: load and decrypt them at build time.
        const encryptionKey = await withTransaction((client) =>
          projectRepo.getDecryptedKey(payload.projectId, client),
        );
        envVariables =
          (await envVarsRepo.load({
            projectId: payload.projectId,
            projectEncrpytionKey: encryptionKey,
          })) ?? {};
      } catch (error) {
        const message = errorMessageFor(error);
        await projectDeploymentRepo
          .updateStatus(deploymentId, "failed", null, message)
          .catch((updateError: unknown) => {
            logger.error(
              { err: updateError, deploymentId },
              "Could not mark deployment as failed",
            );
          });
        throw error;
      }

      await runBuild({
        project: payload.project,
        deployment: payload.deployment,
        envVariables,
        commandOverrides: payload.commandOverrides,
        pruneDevDependencies: payload.pruneDevDependencies,
        imageRef: payload.imageRef,
      });
    },
  });
