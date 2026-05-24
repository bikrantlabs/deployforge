import { z } from "zod";

export const generateApiKeySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(32),
    environment: z.enum(["live", "test"], {
      error: "Environment must be either 'live' or 'test'",
    }),
    expiresAt: z.iso.datetime().optional(),
  }),
});

export type GenerateApiKeyBody = z.infer<typeof generateApiKeySchema>["body"];
