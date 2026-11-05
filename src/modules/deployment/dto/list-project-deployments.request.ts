import { z } from "zod";

export const listProjectDeploymentsRequestSchema = z.object({
  params: z.object({
    projectId: z.uuid("Project ID must be a valid UUID"),
  }),
});

export type ListProjectDeploymentsRequestParams = z.infer<
  typeof listProjectDeploymentsRequestSchema
>["params"];
