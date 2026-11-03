import { createWorker } from "src/shared/infra/events/worker";
import { logger } from "src/shared/logger";
import { ProjectJobRepository } from "../repo/types";
import { DetectProjectService } from "src/modules/project/services/detect-project.service";

export const createDetectWorker = (deps: {
  projectJobRepo: ProjectJobRepository;
  detectProjectService: DetectProjectService;
}) => {
  const { projectJobRepo, detectProjectService } = deps;

  return createWorker("detect", {
    "detect-project": async (payload, job) => {
      const claimed = await projectJobRepo.claimQueued(
        payload.jobId,
        "detecting",
      );
      if (!claimed) {
        const status = await projectJobRepo.getStatus(payload.jobId);
        if (
          status === "queued" ||
          status === "running" ||
          status === "completed" ||
          status === "failed" ||
          status === "canceled"
        ) {
          logger.info(
            { jobId: payload.jobId, status },
            "Skipping duplicate detection job",
          );
          return;
        }
        throw new Error(
          `Unable to claim project job ${payload.jobId} (status: ${String(status)})`,
        );
      }

      try {
        await detectProjectService.detectProject({
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
          currentStage: "detecting",
          message: hasRetriesLeft ? null : errorMessage,
        });
        if (!updated) {
          logger.error(
            { jobId: payload.jobId, error },
            "Could not persist detection job failure state",
          );
        }
        throw error;
      }
    },
  });
};
