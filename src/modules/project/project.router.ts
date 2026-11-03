import { Router } from "express";
import { asyncHandler } from "src/shared/errors/error-handler";
import { authenticate } from "src/shared/middlewares/auth.middleware";
import { validate } from "src/shared/middlewares/validation.middleware";
import { inspectProjectRequestSchema } from "./dto/inspect-project.request";
import { projectController } from "./project.controller";

export const projectRouter = Router();

projectRouter.get(
  "/",
  authenticate,
  asyncHandler(projectController.listProjects),
);

projectRouter.post(
  "/inspect",
  authenticate,
  validate(inspectProjectRequestSchema),
  asyncHandler(projectController.inspectProject),
);
