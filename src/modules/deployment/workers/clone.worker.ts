import { createWorker } from "src/shared/infra/events/worker";
import { logger } from "src/shared/logger";
import { ProjectJobRepository } from "../repo/types";

export const createCloneWorker = (deps: {
  projectJobRepo: ProjectJobRepository;
  cloneProjectService: {
    cloneProject(input: {
      projectId: string;
      userId: string;
    }): Promise<unknown>;
  };
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
          `Unable to claim project job ${payload.jobId} (status: ${status ?? "missing"})`,
        );
      }

      try {
        await cloneProjectService.cloneProject({
          projectId: payload.projectId,
          userId: payload.userId,
        });

        const completed = await projectJobRepo.setStatus({
          jobId: payload.jobId,
          status: "completed",
          currentStage: "cloning",
        });
        if (!completed) {
          throw new Error(`Unable to complete project job ${payload.jobId}`);
        }

        // TODO:
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
