import { Worker as BullWorker, Job, Processor, WorkerOptions } from "bullmq";
import { config } from "src/shared/config/config";
import { JobName, JobPayloadType, QueueName } from "./queue-registry";
import { logger } from "src/shared/logger";
import { startEmailWorker } from "src/shared/workers/email.worker";

const connection = {
  url: config.REDIS_URL,
};

export type JobHandler<
  TQueueName extends QueueName,
  TJobName extends JobName<TQueueName>,
> = (
  payload: JobPayloadType<TQueueName, TJobName>,
  job: { id: string; attemptsMade: number; attempts: number },
) => Promise<void>;

/**
 *
 * @param queueName The name of the queue we're creating job for. `"auth:email" | "..." `See ./queue-registry.ts for all queue names
 * @param handlers The handler function for all jobs in that specific queue. For `"auth:email"`, handlers will be ```
 *  {
 *  "job-1": (payload, job) =>{},
 * "job-2": (payload, job) =>{},
 * }
 * ```
 *
 * The method will create workers for every job inside the queue `queueName`. The jobs are registered through `new TypedQueue().add()` method
 * in `./queue.ts`
 */
export function createWorker<TQueueName extends QueueName>(
  queueName: TQueueName,

  //
  handlers: {
    [TJobName in JobName<TQueueName>]?: JobHandler<TQueueName, TJobName>;
  },
  options?: Omit<WorkerOptions, "connection">,
) {
  const processor: Processor = async (job: Job) => {
    // Get the handler for provided job
    const handler = handlers[job.name as JobName<TQueueName>];

    if (!handler) {
      logger.error(
        { queue: queueName, jobName: job.name },
        "No handler registered for job",
      );
      throw new Error(`No handler for job ${job.name}`);
    }

    // eslint-disable-next-line
    await handler(job.data as any, {
      id: job.id!,
      attemptsMade: job.attemptsMade,
      attempts: job.opts.attempts ?? 1,
    });
  };

  const worker = new BullWorker(queueName, processor, {
    connection,
    ...options,
  });

  worker.on("completed", (job) => {
    logger.info(
      { jobId: job.id, queue: queueName, jobName: job.name },
      "Job completed",
    );
  });

  worker.on("failed", (job, err) => {
    logger.error(
      { jobId: job?.id, queue: queueName, jobName: job?.name, err },
      "Job failed",
    );
  });

  return worker;
}

export function startAllWorkers(additionalWorkers: (() => BullWorker)[] = []) {
  const workers = [
    startEmailWorker(),
    ...additionalWorkers.map((start) => start()),
  ];
  return workers;
}
