import { OutboxMessage, ProjectJobRepository } from "../repo/types";
import { getQueue } from "src/shared/infra/events/queue";

export const publishOutbox = async (
  message: OutboxMessage,
  projectJobRepo: ProjectJobRepository,
): Promise<void> => {
  if (
    message.topic !== "clone.requested" &&
    message.topic !== "detect.requested"
  ) {
    throw new Error(`Unsupported outbox topic: ${message.topic}`);
  }

  const { projectId, userId } = message.payload as {
    projectId?: unknown;
    userId?: unknown;
  };
  if (typeof projectId !== "string" || typeof userId !== "string") {
    throw new Error(`Invalid payload for outbox message ${message.id}`);
  }

  const state = await projectJobRepo.markQueued(message.jobId);
  if (state === "missing") {
    throw new Error(`Project job ${message.jobId} does not exist`);
  }
  if (state === "terminal") {
    return;
  }

  const options = {
    jobId: message.jobId,
    attempts: 3,
    backoff: { type: "exponential" as const, delay: 1_000 },
  };

  if (message.topic === "clone.requested") {
    await getQueue("clone").add(
      "clone-project",
      { jobId: message.jobId, projectId, userId },
      options,
    );
  } else {
    await getQueue("detect").add(
      "detect-project",
      { jobId: message.jobId, projectId, userId },
      options,
    );
  }
};
