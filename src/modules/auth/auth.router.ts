import { Router } from "express";
import { authController } from "./auth.controller";
import { asyncHandler } from "src/shared/errors/error-handler";
import { authenticate } from "src/shared/middlewares/auth.middleware";
import { validate } from "src/shared/middlewares/validation.middleware";
import {
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
  sendVerificationEmailSchema,
  verifySchema,
} from "./validators/auth.validator";

const authRouter = Router();

authRouter.post(
  "/register",
  validate(registerSchema),
  asyncHandler(authController.register),
);
authRouter.post(
  "/login",
  validate(loginSchema),
  asyncHandler(authController.login),
);
authRouter.post(
  "/verify-email",
  validate(verifySchema),
  asyncHandler(authController.verify),
);
authRouter.post(
  "/send-verification-email",
  validate(sendVerificationEmailSchema),
  asyncHandler(authController.sendVerificationEmail),
);
authRouter.post(
  "/logout",
  validate(logoutSchema),
  asyncHandler(authController.logout),
);
authRouter.post(
  "/refresh",
  validate(refreshSchema),
  asyncHandler(authController.refresh),
);
authRouter.get("/me", authenticate, asyncHandler(authController.getMe));

export { authRouter };
