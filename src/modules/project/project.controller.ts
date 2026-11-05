import { Request, Response } from "express";
import { ApiResponse } from "src/shared/api-response";
import { inspectProject } from "./services/inspect-project.service";
import { listProjects } from "./services/list-projects.service";
import { getProject } from "./services/get-project.service";
import { deleteProject } from "./services/delete-project.service";
import { GetProjectRequestParams } from "./dto/get-project.request";
import { InspectProjectRequestBody } from "./dto/inspect-project.request";
import { DeployProjectRequestBody } from "./dto/deploy-project.request";
import { deployService } from "./services/deploy.service";
import { InspectProjectResult, Project } from "./types";

export const projectController = {
  async listProjects(req: Request, res: Response<ApiResponse<Project[]>>) {
    const userId = req.user!.sub;
    const data = await listProjects(userId);

    return res.json({
      data,
      message: "Projects retrieved successfully",
      status: "success",
      timestamp: new Date(),
    });
  },

  async getProject(
    req: Request,
    res: Response<ApiResponse<Project>>,
  ) {
    const userId = req.user!.sub;
    const { projectId } = req.params as unknown as GetProjectRequestParams;
    const data = await getProject({ projectId, userId });

    return res.json({
      data,
      message: "Project retrieved successfully",
      status: "success",
      timestamp: new Date(),
    });
  },

  async deleteProject(req: Request, res: Response) {
    const { projectId } = req.params as unknown as GetProjectRequestParams;
    await deleteProject({ projectId, userId: req.user!.sub });

    return res.status(204).send();
  },

  async inspectProject(
    req: Request,
    res: Response<ApiResponse<InspectProjectResult>>,
  ) {
    const input = req.body as InspectProjectRequestBody;
    const userId = req.user!.sub;
    const data = await inspectProject({
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

  async deployProject(
    req: Request,
    res: Response<ApiResponse<Awaited<ReturnType<typeof deployService>>>>,
  ) {
    const input = req.body as DeployProjectRequestBody;
    const userId = req.user!.sub;
    const data = await deployService({
      project: { ...input.project, userId },
      envVariables: input.envVariables,
    });

    return res.status(202).json({
      data,
      message: "Project deployment started successfully",
      status: "success",
      timestamp: new Date(),
    });
  },
};
