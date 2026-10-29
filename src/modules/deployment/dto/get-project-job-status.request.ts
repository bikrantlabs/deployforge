import { z } from "zod";

export const getProjectJobStatusRequestSchema = z.object({
  params: z.object({
    jobId: z.uuid("Job ID must be a valid UUID"),
  }),
});

export type GetProjectJobStatusRequestParams = z.infer<
  typeof getProjectJobStatusRequestSchema
>["params"];
