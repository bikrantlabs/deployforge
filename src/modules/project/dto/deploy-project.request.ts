import { z } from "zod";

export const deployProjectRequestSchema = z.object({
  body: z.object({
    project: z.object({
      projectId: z.uuid(),
      projectName: z.string().min(1),
      sourceUrl: z.url(),
    }),
    envVariables: z.record(z.string(), z.string()).default({}),
  }),
});

export type DeployProjectRequestBody = z.infer<
  typeof deployProjectRequestSchema
>["body"];
