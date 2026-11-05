import { z } from "zod";

export const deployProjectRequestSchema = z.object({
  body: z.object({
    project: z.object({
      projectId: z.uuid(),
      projectName: z.string().min(1),
      sourceUrl: z.url(),
    }),
    envVariables: z.record(z.string(), z.string()).default({}),
    commandOverrides: z
      .object({
        build: z.string().min(1).optional(),
        install: z.string().min(1).optional(),
        start: z.string().min(1).optional(),
      })
      .optional(),
    pruneDevDependencies: z.boolean().optional(),
  }),
});

export type DeployProjectRequestBody = z.infer<
  typeof deployProjectRequestSchema
>["body"];
