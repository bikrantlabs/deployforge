import { Request, Response } from "express";
import { UnauthorizedError } from "src/shared/errors/app-error";
import { GenerateApiKeyBody } from "./validators/api-key.validator";
import { apiKeyService } from "./container";
import { ApiResponse } from "src/shared/api-response";
import { GenerateApiKeyResponse } from "./types/response";

export const apiKeyController = {
  async generateApiKey(
    req: Request,
    res: Response<ApiResponse<GenerateApiKeyResponse>>,
  ) {
    const userId = req.user?.sub;

    const { environment, name } = req.body as GenerateApiKeyBody;
    if (!userId) {
      throw new UnauthorizedError();
    }
    const result = await apiKeyService.generate({ userId, name, environment });
    res.status(200).json({
      message: "Api key generated",
      status: "success",
      timestamp: new Date(),
      data: result,
    });
  },
};
