import { Router } from "express";
import { authenticate } from "src/shared/middlewares/auth.middleware";
import { apiKeyController } from "./api-key.controller";

const apiKeyRouter = Router();

apiKeyRouter.post("/generate", authenticate, apiKeyController.generateApiKey);

export { apiKeyRouter };
