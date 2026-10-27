import { logger } from "src/shared/logger";
import { OutboxMessage, OutboxRepository } from "../repo/types";

const DEFAULT_POLL_INTERVAL_MS = 1_000;
const DEFAULT_BATCH_SIZE = 100;

export const createOutboxRelay = (deps: {
  outboxRepo: OutboxRepository;
  publish: (message: OutboxMessage) => Promise<void>; // e.g. queue.add(...)
  pollIntervalMs?: number;
  batchSize?: number;
}) => {
  const {
    outboxRepo,
    publish,
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
    batchSize = DEFAULT_BATCH_SIZE,
  } = deps;

  let stopped = true;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const poll = async () => {
    try {
      const messages = await outboxRepo.listUnsent(batchSize);

      for (const message of messages) {
        if (stopped) {
          break;
        }
        try {
          // Keep this sequential: only mark a message sent after its publish succeeds.
          // eslint-disable-next-line no-await-in-loop
          await publish(message); // 1. enqueue first
          // eslint-disable-next-line no-await-in-loop
          await outboxRepo.markSent(message.id); // 2. then mark sent
        } catch (error) {
          // row stays unsent and is retried on the next tick
          logger.error(
            { error, messageId: message.id },
            "Failed to relay outbox message",
          );
        }
      }

      if (messages.length > 0) {
        logger.info({ count: messages.length }, "Relayed outbox messages");
      }
    } catch (error) {
      logger.error({ error }, "Failed to read unsent outbox messages");
    } finally {
      if (!stopped) {
        timer = setTimeout(() => void poll(), pollIntervalMs);
      }
    }
  };

  const stop = () => {
    stopped = true;
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  return {
    start() {
      if (!stopped) {
        return stop;
      }

      stopped = false;
      void poll();
      return stop;
    },
    stop,
  };
};
