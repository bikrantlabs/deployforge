import { z } from "zod";

export const getDeploymentLogsRequestSchema = z.object({
  params: z.object({
    deploymentId: z.uuid("Deployment ID must be a valid UUID"),
  }),
});

export type GetDeploymentLogsRequestParams = z.infer<
  typeof getDeploymentLogsRequestSchema
>["params"];
