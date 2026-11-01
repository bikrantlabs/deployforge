import { createWorker } from "src/shared/infra/events/worker";
import { logger } from "src/shared/logger";
import { ProjectJobRepository } from "../repo/types";
import { CloneProjectService } from "../services/clone-project.service";

export const createCloneWorker = (deps: {
  projectJobRepo: ProjectJobRepository;
  cloneProjectService: CloneProjectService;
}) => {
  const { projectJobRepo, cloneProjectService } = deps;

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
        await cloneProjectService.cloneProject({
          jobId: payload.jobId,
          projectId: payload.projectId,
          userId: payload.userId,
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
