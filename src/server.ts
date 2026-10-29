import { createApp } from "./app";
import { registerAuthEventListener } from "./modules/auth/events/auth-events.listeners";
import { config } from "./shared/config/config";
import { connectRedis } from "./shared/infra/cache";
import { connectDB } from "./shared/infra/db";
import { initQueues } from "./shared/infra/events/queue";
import { startAllWorkers } from "./shared/infra/events/worker";
import { logger } from "./shared/logger";
import { ensureMiseCacheLink } from "./shared/railpack/ensure-mise-cache-link";
import {
  startOutboxRelay,
  startCloneWorker,
} from "./modules/deployment/container";

async function start() {
  try {
    console.error(
      "===== FRESH CODE RUNNING at " + new Date().toISOString() + " =====",
    );
    await ensureMiseCacheLink(config.RAILPACK_MISE_VERSION);
    await connectDB();
    await connectRedis();

    initQueues();
    const workers = startAllWorkers([startCloneWorker]);
    registerAuthEventListener();
    const stopOutboxRelay = startOutboxRelay();

    const app = createApp();

    const server = app.listen(config.PORT, () => {
      logger.info({ port: config.PORT }, "Server started");
      console.log("SERVER REALLY STARTED");
    });

    async function shutdown(signal: string) {
      logger.info({ signal }, "Shutdown signal received");
      stopOutboxRelay();

      server.close(async () => {
        logger.info("HTTP server closed");
        try {
          await Promise.all(workers.map((worker) => worker.close()));
          // await disconnectDatabase();
          // await disconnectRedis();
          logger.info("Graceful shutdown complete");
          process.exit(0);
        } catch (err) {
          logger.error({ err }, "Error during shutdown");
          process.exit(1);
        }
      });

      // Force exit after 30s if graceful shutdown hangs
      setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
      }, 30_000);
    }

    process.on("SIGTERM", () => {
      shutdown("SIGTERM");
    });
    process.on("SIGINT", () => {
      shutdown("SIGINT");
    });

    // Catch unhandled rejections — log and exit (let your process manager restart)
    process.on("unhandledRejection", (reason) => {
      logger.fatal({ reason }, "Unhandled promise rejection");
      process.exit(1);
    });

    process.on("uncaughtException", (err) => {
      logger.fatal({ err }, "Uncaught exception");
      process.exit(1);
    });
  } catch (error) {
    console.log(error);
    logger.fatal({ error }, "Failed to start server");
    process.exit(1);
  }
}
start();
