export type QueueRegistry = {
  auth_email: {
    "send-verification-email": {
      email: string;
      code: string;
    };
    "send-welcome-email": {
      email: string;
    };
  };
  clone: {
    "clone-project": {
      jobId: string;
      projectId: string;
      userId: string;
    };
  };
};

// QueueName will be direct keys of registry: "auth_email" | "..." | "..." and so on.
export type QueueName = keyof QueueRegistry;

/**
 * JobName will require QueueName as argument to retrieve all it's jobs
 *
 * `const job: JobName<"auth:email"> = "send-verification-email" | "send-welcome-email"`
 */
export type JobName<TQueueName extends QueueName> =
  keyof QueueRegistry[TQueueName];

/**
 * JobPayload type requires QueueName, and JobName to be able to retrieve it's payload
 *
 * `const jobPayload: JobPayloadType<"auth:email", JobName<"auth:email">> = {email, code} `
 */
export type JobPayloadType<
  TQueueName extends QueueName,
  TJobName extends JobName<TQueueName>,
> = QueueRegistry[TQueueName][TJobName];
