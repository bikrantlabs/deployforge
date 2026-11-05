import { z } from "zod";

export const getProjectRequestSchema = z.object({
  params: z.object({
    projectId: z.uuid("Project ID must be a valid UUID"),
  }),
});

export type GetProjectRequestParams = z.infer<
  typeof getProjectRequestSchema
>["params"];
