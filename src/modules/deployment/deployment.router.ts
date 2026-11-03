import { Router } from "express";
import { asyncHandler } from "src/shared/errors/error-handler";
import { deploymentController } from "./deployment.controller";
import { authenticate } from "src/shared/middlewares/auth.middleware";
import { validate } from "src/shared/middlewares/validation.middleware";
import { getProjectJobStatusRequestSchema } from "./dto/get-project-job-status.request";

export const deploymentRouter = Router();

deploymentRouter.get(
  "/jobs/:jobId",
  authenticate,
  validate(getProjectJobStatusRequestSchema),
  asyncHandler(deploymentController.getProjectJobStatus),
);
