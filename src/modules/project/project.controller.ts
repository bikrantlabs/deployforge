import { Request, Response } from "express";
import { ApiResponse } from "src/shared/api-response";
import { inspectProjectService, listProjectsService } from "./container";
import { InspectProjectRequestBody } from "./dto/inspect-project.request";
import { InspectProjectResult, Project } from "./types";

export const projectController = {
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

  async inspectProject(
    req: Request,
    res: Response<ApiResponse<InspectProjectResult>>,
  ) {
    const input = req.body as InspectProjectRequestBody;
    const userId = req.user!.sub;
    const data = await inspectProjectService.inspectProject({
      cloneUrl: input.cloneUrl,
      userId,
    });

    return res.json({
      data,
      message: "Project inspected successfully",
      status: "success",
      timestamp: new Date(),
    });
  },
};
