import { ApiResponse } from "src/shared/api-response";
import { Request, Response } from "express";
import { Project } from "src/modules/project/types";
import { createProjectService, getProjectJobStatusService } from "./container";
import { CreateProjectRequestBody } from "./dto/create-project.request";
import { GetProjectJobStatusRequestParams } from "./dto/get-project-job-status.request";

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

  async getProjectJobStatus(req: Request, res: Response) {
    const { jobId } = req.params as unknown as GetProjectJobStatusRequestParams;
    const userId = req.user!.sub;
    const data = await getProjectJobStatusService.getStatus({ jobId, userId });

    return res.json({
      data,
      message: "Job status retrieved successfully",
      status: "success",
      timestamp: new Date(),
    });
  },
};
