import { Router } from "express";
import { asyncHandler } from "src/shared/errors/error-handler";
import { deploymentController } from "./deployment.controller";
import { authenticate } from "src/shared/middlewares/auth.middleware";
import { validate } from "src/shared/middlewares/validation.middleware";
import { createProjectRequestSchema } from "./dto/create-project.request";
import { getProjectJobStatusRequestSchema } from "./dto/get-project-job-status.request";

export const deploymentRouter = Router();

deploymentRouter.post(
  "/projects",
  authenticate,
  validate(createProjectRequestSchema),
  asyncHandler(deploymentController.createProject),
);

deploymentRouter.get(
  "/jobs/:jobId",
  authenticate,
  validate(getProjectJobStatusRequestSchema),
  asyncHandler(deploymentController.getProjectJobStatus),
);
