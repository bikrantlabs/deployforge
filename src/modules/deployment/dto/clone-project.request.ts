import { z } from "zod";

export const cloneProjectRequestSchema = z.object({
  params: z.object({
    projectId: z.uuid("Project ID must be a valid UUID"),
  }),
});

export type CloneProjectRequestParams = z.infer<
  typeof cloneProjectRequestSchema
>["params"];
