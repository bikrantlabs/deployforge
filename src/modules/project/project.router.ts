import { Router } from "express";
import { asyncHandler } from "src/shared/errors/error-handler";
import { authenticate } from "src/shared/middlewares/auth.middleware";
import { validate } from "src/shared/middlewares/validation.middleware";
import { inspectProjectRequestSchema } from "./dto/inspect-project.request";
import { deployProjectRequestSchema } from "./dto/deploy-project.request";
import { getProjectRequestSchema } from "./dto/get-project.request";
import { projectController } from "./project.controller";
import { deploymentController } from "src/modules/deployment/deployment.controller";
import { listProjectDeploymentsRequestSchema } from "src/modules/deployment/dto/list-project-deployments.request";

export const projectRouter = Router();

projectRouter.get(
  "/",
  authenticate,
  asyncHandler(projectController.listProjects),
);

projectRouter.get(
  "/:projectId",
  authenticate,
  validate(getProjectRequestSchema),
  asyncHandler(projectController.getProject),
);

projectRouter.delete(
  "/:projectId",
  authenticate,
  validate(getProjectRequestSchema),
  asyncHandler(projectController.deleteProject),
);

projectRouter.get(
  "/:projectId/deployments",
  authenticate,
  validate(listProjectDeploymentsRequestSchema),
  asyncHandler(deploymentController.listProjectDeployments),
);

projectRouter.post(
  "/inspect",
  authenticate,
  validate(inspectProjectRequestSchema),
  asyncHandler(projectController.inspectProject),
);

projectRouter.post(
  "/deploy",
  authenticate,
  validate(deployProjectRequestSchema),
  asyncHandler(projectController.deployProject),
);
