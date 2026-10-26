import express, { Router } from "express";
import helmet from "helmet";
import cors from "cors";
import { config } from "./shared/config/config";
import { logger } from "./shared/logger";
import { authRouter } from "./modules/auth/auth.router";
import { deploymentRouter } from "./modules/deployment/deployment.router";
import { errorHandler } from "./shared/errors/error-handler";

export function createApp() {
  const app = express();

  // Security Headers
  app.use(helmet());
  app.use(express.json());

  // CORS
  app.use(
    cors({
      origin: config.CORS_ORIGIN,
      credentials: true, // allow cookies
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  // Request logging
  app.use((req, _res, next) => {
    logger.debug(
      { method: req.method, url: req.url, ip: req.ip },
      "Incoming Request",
    );
    next();
  });

  app.use(
    `${config.API_PREFIX}/`,
    Router().get("/health", (_req, res) => {
      console.log(config.NODE_ENV);
      logger.info("Health Check");
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    }),
  );

  app.use(`${config.API_PREFIX}/auth`, authRouter);
  app.use(`${config.API_PREFIX}/deployments`, deploymentRouter);

  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Route not found" },
    });
  });
  // TODO: Use error handler middleware
  app.use(errorHandler);
  return app;
}
