import { Request, Response } from "express";
import { getProjectJobStatusService } from "./container";
import { GetProjectJobStatusRequestParams } from "./dto/get-project-job-status.request";
import { GetDeploymentLogsRequestParams } from "./dto/get-deployment-logs.request";
import { streamDeploymentLogs } from "./services/deployment-logs.service";
import {
  listDeployments,
  listProjectDeployments,
} from "./services/list-deployments.service";
import { getDeployment } from "./services/get-deployment.service";
import { ApiResponse } from "src/shared/api-response";
import { Deployment } from "./types";
import { ListProjectDeploymentsRequestParams } from "./dto/list-project-deployments.request";
import { GetDeploymentRequestParams } from "./dto/get-deployment.request";

export const deploymentController = {
  async getDeployment(
    req: Request,
    res: Response<ApiResponse<Deployment>>,
  ) {
    const { deploymentId } =
      req.params as unknown as GetDeploymentRequestParams;
    const data = await getDeployment({
      deploymentId,
      userId: req.user!.sub,
    });

    return res.json({
      data,
      message: "Deployment retrieved successfully",
      status: "success",
      timestamp: new Date(),
    });
  },

  async listDeployments(
    req: Request,
    res: Response<ApiResponse<Deployment[]>>,
  ) {
    const data = await listDeployments(req.user!.sub);

    return res.json({
      data,
      message: "Deployments retrieved successfully",
      status: "success",
      timestamp: new Date(),
    });
  },

  async listProjectDeployments(
    req: Request,
    res: Response<ApiResponse<Deployment[]>>,
  ) {
    const { projectId } =
      req.params as unknown as ListProjectDeploymentsRequestParams;
    const data = await listProjectDeployments({
      projectId,
      userId: req.user!.sub,
    });

    return res.json({
      data,
      message: "Project deployments retrieved successfully",
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

  async getDeploymentLogs(req: Request, res: Response) {
    const { deploymentId } =
      req.params as unknown as GetDeploymentLogsRequestParams;
    await streamDeploymentLogs({
      req,
      res,
      deploymentId,
      userId: req.user!.sub,
    });
  },
};
