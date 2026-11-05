import { z } from "zod";

export const getDeploymentRequestSchema = z.object({
  params: z.object({
    deploymentId: z.uuid("Deployment ID must be a valid UUID"),
  }),
});

export type GetDeploymentRequestParams = z.infer<
  typeof getDeploymentRequestSchema
>["params"];
