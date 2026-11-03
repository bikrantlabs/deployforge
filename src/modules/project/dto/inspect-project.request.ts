import { z } from "zod";

export const inspectProjectRequestSchema = z.object({
  body: z.object({
    cloneUrl: z.url({ error: "Clone URL is required" }),
  }),
});

export type InspectProjectRequestBody = z.infer<
  typeof inspectProjectRequestSchema
>["body"];
