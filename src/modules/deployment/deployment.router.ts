import { Router } from "express";
import { asyncHandler } from "src/shared/errors/error-handler";
import { deploymentController } from "./deployment.controller";
import { authenticate } from "src/shared/middlewares/auth.middleware";
import { validate } from "src/shared/middlewares/validation.middleware";
import { createProjectRequestSchema } from "./dto/create-project.request";
import { cloneProjectRequestSchema } from "./dto/clone-project.request";

export const deploymentRouter = Router();

deploymentRouter.post(
  "/projects",
  authenticate,
  validate(createProjectRequestSchema),
  asyncHandler(deploymentController.createProject),
);

deploymentRouter.post(
  "/projects/:projectId/clone",
  authenticate,
  validate(cloneProjectRequestSchema),
  asyncHandler(deploymentController.cloneProject),
);
