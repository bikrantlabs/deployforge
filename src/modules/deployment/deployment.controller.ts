import { ApiResponse } from "src/shared/api-response";
import { Request, Response } from "express";
import {
  createProjectService,
  cloneProjectService,
  getProjectJobStatusService,
  detectProjectService,
  listProjectsService,
} from "./container";
import { CreateProjectRequestBody } from "./dto/create-project.request";
import { CloneProjectRequestParams } from "./dto/clone-project.request";
import { Project } from "./types";
import { GetProjectJobStatusRequestParams } from "./dto/get-project-job-status.request";

export const deploymentController = {
  async listProjects(req: Request, res: Response<ApiResponse<Project[]>>) {
    const userId = req.user!.sub;
    const data = await listProjectsService.listProjects(userId);

    return res.json({
      data,
      message: "Projects retrieved successfully",
      status: "success",
      timestamp: new Date(),
    });
  },

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

  async detectProject(req: Request, res: Response) {
    const { projectId } = req.params as CloneProjectRequestParams;
    const userId = req.user!.sub;
    const data = await detectProjectService.detectProject({
      projectId,
      userId,
    });

    return res.json({
      data,
      message: "Project detected successfully",
      status: "success",
      timestamp: new Date(),
    });
  },
};
