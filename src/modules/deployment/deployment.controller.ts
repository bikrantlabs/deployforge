import { Request, Response } from "express";
import { getProjectJobStatusService } from "./container";
import { GetProjectJobStatusRequestParams } from "./dto/get-project-job-status.request";

export const deploymentController = {
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
