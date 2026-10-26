import { z } from "zod";

// ─── Reusable field schemas ───────────────────────────────────────────────────

const emailSchema = z
  .email("Must be a valid email address")
  .toLowerCase()
  .trim();

const passwordSchema = z
  .string({ error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must not exceed 128 characters")
  // Require at least one uppercase, one lowercase, one digit
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

// ─── Request schemas ──────────────────────────────────────────────────────────

export const registerSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: passwordSchema,
  }),
});

export const verifySchema = z.object({
  body: z.object({
    email: emailSchema,
    code: z.string().length(6),
  }),
});

export const sendVerificationEmailSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string({ error: "Password is required" }),
    // Don't validate password format on login — just check credentials
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string({ error: "Refresh token is required" }).min(1),
  }),
});

export const logoutSchema = z.object({
  body: z.object({
    refreshToken: z.string({ error: "Refresh token is required" }).min(1),
  }),
});

// ─── Inferred input types ─────────────────────────────────────────────────────

export type RegisterBody = z.infer<typeof registerSchema>["body"];
export type VerifyBody = z.infer<typeof verifySchema>["body"];
export type SendVerificationEmailBody = z.infer<
  typeof sendVerificationEmailSchema
>["body"];
export type LoginBody = z.infer<typeof loginSchema>["body"];
export type RefreshBody = z.infer<typeof refreshSchema>["body"];
export type LogoutBody = z.infer<typeof logoutSchema>["body"];

// ─── Validation middleware factory ────────────────────────────────────────────
