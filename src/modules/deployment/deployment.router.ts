import { Router } from "express";
import { asyncHandler } from "src/shared/errors/error-handler";
import { deploymentController } from "./deployment.controller";
import { authenticate } from "src/shared/middlewares/auth.middleware";
import { validate } from "src/shared/middlewares/validation.middleware";
import { getProjectJobStatusRequestSchema } from "./dto/get-project-job-status.request";
import { getDeploymentLogsRequestSchema } from "./dto/get-deployment-logs.request";
import { getDeploymentRequestSchema } from "./dto/get-deployment.request";

export const deploymentRouter = Router();

deploymentRouter.get(
  "/",
  authenticate,
  asyncHandler(deploymentController.listDeployments),
);

deploymentRouter.get(
  "/:deploymentId",
  authenticate,
  validate(getDeploymentRequestSchema),
  asyncHandler(deploymentController.getDeployment),
);

deploymentRouter.get(
  "/jobs/:jobId",
  authenticate,
  validate(getProjectJobStatusRequestSchema),
  asyncHandler(deploymentController.getProjectJobStatus),
);

deploymentRouter.get(
  "/:deploymentId/logs",
  authenticate,
  validate(getDeploymentLogsRequestSchema),
  asyncHandler(deploymentController.getDeploymentLogs),
);
