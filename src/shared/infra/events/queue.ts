import { Queue as BullQueue, QueueOptions } from "bullmq";
import { config } from "src/shared/config/config";
import { JobName, JobPayloadType, QueueName } from "./queue-registry";
import { logger } from "src/shared/logger";

const connection: QueueOptions["connection"] = {
  url: config.REDIS_URL,
};

export class TypedQueue<TQueueName extends QueueName> {
  private bullQueue: BullQueue;

  constructor(
    public readonly name: TQueueName,
    options?: QueueOptions,
  ) {
    this.bullQueue = new BullQueue(name, { ...options, connection });
  }

  async add<TJobName extends JobName<TQueueName>>(
    jobName: TJobName,
    payload: JobPayloadType<TQueueName, TJobName>,
    options?: {
      jobId?: string;
      attempts?: number;
      backoff?: { type: "exponential" | "fixed"; delay: number };
      delay?: number;
    },
  ) {
    return this.bullQueue.add(jobName as string, payload, options);
  }

  getBullQueue() {
    return this.bullQueue;
  }
}

// Registry of all queues (singletons)
export const queues = {} as {
  [K in QueueName]: TypedQueue<K>;
};

// Initialize all queues
export function initQueues() {
  const queueNames: QueueName[] = ["auth_email", "clone"];
  const queueRegistry = queues as Record<QueueName, TypedQueue<QueueName>>;

  for (const name of queueNames) {
    queueRegistry[name] = new TypedQueue(name);
  }
}

// Helper to get a typed queue
export function getQueue<TQueueName extends QueueName>(
  name: TQueueName,
): TypedQueue<TQueueName> {
  const queue = queues[name];

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- The name might not have been added to initQueues()
  if (!queue) {
    logger.error(
      { queue: name },
      "Queue not found. Please initialize at queue.ts:initQueues()",
    );
    throw new Error(
      `Queue ${name} not found. Please initialize at queue.ts:initQueues()`,
    );
  }
  return queues[name];
}
