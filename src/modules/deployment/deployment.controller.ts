import { ApiResponse } from "src/shared/api-response";
import { Request, Response } from "express";
import { createProjectService, cloneProjectService } from "./container";
import { CreateProjectRequestBody } from "./dto/create-project.request";
import { CloneProjectRequestParams } from "./dto/clone-project.request";
import { Project } from "./types";

export const deploymentController = {
  async createProject(req: Request, res: Response<ApiResponse<Project>>) {
    const input = req.body as CreateProjectRequestBody;
    const userId = req.user!.sub;
    const data = await createProjectService.createProject({
      cloneUrl: input.cloneUrl,
      projectName: input.projectName,
      userId,
    });

    return res.status(201).json({
      data,
      message: "Project created successfully",
      status: "success",
      timestamp: new Date(),
    });
  },

  async cloneProject(
    req: Request,
    res: Response<
      ApiResponse<{
        projectId: string;
        projectName: string;
        destinationPath: string;
      }>
    >,
  ) {
    const { projectId } = req.params as unknown as CloneProjectRequestParams;
    const userId = req.user!.sub;
    const data = await cloneProjectService.cloneProject({ projectId, userId });

    return res.json({
      data,
      message: "Project cloned successfully",
      status: "success",
      timestamp: new Date(),
    });
  },
};
