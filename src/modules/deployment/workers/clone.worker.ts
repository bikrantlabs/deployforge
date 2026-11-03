import { createWorker } from "src/shared/infra/events/worker";
import { TransactionRunner } from "src/shared/infra/db";
import { logger } from "src/shared/logger";
import { generateUUID } from "src/shared/utils/uuid-generator";
import { CloneProjectUsecase } from "src/modules/project/usecases/clone-project.usecase";
import { OutboxRepository, ProjectJobRepository } from "../repo/types";

export const createCloneWorker = (deps: {
  projectJobRepo: ProjectJobRepository;
  cloneProject: CloneProjectUsecase;
  outboxRepo: OutboxRepository;
  withTransaction: TransactionRunner;
}) => {
  const { projectJobRepo, cloneProject, outboxRepo, withTransaction } = deps;

  return createWorker("clone", {
    "clone-project": async (payload, job) => {
      // BullMQ serializes delivery for a stable job ID; reclaim running rows so
      // a stalled job can recover after its previous worker process crashed.
      const claimed = await projectJobRepo.claimQueued(payload.jobId);
      if (!claimed) {
        const status = await projectJobRepo.getStatus(payload.jobId);
        if (
          status === "running" ||
          status === "queued" ||
          status === "completed" ||
          status === "failed" ||
          status === "canceled"
        ) {
          logger.info(
            { jobId: payload.jobId, status },
            "Skipping duplicate clone job",
          );
          return;
        }
        throw new Error(
          `Unable to claim project job ${payload.jobId} (status: ${String(status)})`,
        );
      }

      try {
        const project = await cloneProject({
          projectId: payload.projectId,
          userId: payload.userId,
        });

        await withTransaction(async (client) => {
          const queued = await projectJobRepo.setStatus({
            jobId: payload.jobId,
            status: "queued",
            currentStage: "detecting",
            client,
          });
          if (!queued) {
            throw new Error(
              `Unable to queue detection for project job ${payload.jobId}`,
            );
          }

          await outboxRepo.create(
            {
              outboxId: generateUUID(),
              jobId: payload.jobId,
              topic: "detect.requested",
              payload: {
                jobId: payload.jobId,
                projectId: project.projectId,
                userId: payload.userId,
              },
              createdAt: new Date(),
            },
            client,
          );
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const hasRetriesLeft = job.attemptsMade + 1 < job.attempts;
        const updated = await projectJobRepo.setStatus({
          jobId: payload.jobId,
          status: hasRetriesLeft ? "queued" : "failed",
          currentStage: "cloning",
          message: hasRetriesLeft ? null : errorMessage,
        });
        if (!updated) {
          logger.error(
            { jobId: payload.jobId, error },
            "Could not persist clone job failure state",
          );
        }
        throw error;
      }
    },
  });
};
