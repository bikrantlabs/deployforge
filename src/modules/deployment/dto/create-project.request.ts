import { z } from "zod";

export const createProjectRequestSchema = z.object({
  body: z.object({
    cloneUrl: z.url({ error: "Clone URL is required" }),
    projectName: z.string().trim().min(1, "Project name is required"),
  }),
});

export type CreateProjectRequestBody = z.infer<
  typeof createProjectRequestSchema
>["body"];
