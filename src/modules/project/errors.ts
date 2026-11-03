import { AppError, ConflictError } from "src/shared/errors/app-error";

export class InvalidCloneUrl extends AppError {
  constructor(
    message = "Source URL cannot be fetched. Make sure it is a valid github or gitlab repository URL.",
  ) {
    super(message, 400, "INVALID_CLONE_URL");
  }
}

export class ProjectNameAlreadyExistsError extends ConflictError {
  constructor(projectName: string) {
    super(`A project named "${projectName}" already exists for this user.`);
  }
}
