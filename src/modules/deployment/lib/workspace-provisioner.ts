import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Project } from "../types";

const DEFAULT_WORKSPACE_ROOT = "~/.deployforge";

function expandHome(target: string): string {
  if (target === "~") {
    return os.homedir();
  }
  if (target.startsWith("~/")) {
    return path.join(os.homedir(), target.slice(2));
  }
  return target;
}

export class WorkspaceProvisioner {
  private readonly WORKSPACE_ROOT: string | undefined;
  constructor() {}
  /**
   *
   * @param project - Project Object
   * @returns destination - The destionation directory where the project will be cloned into: /userId/projectName
   */
  async prepare(project: Project): Promise<string> {
    const root = this.WORKSPACE_ROOT ?? DEFAULT_WORKSPACE_ROOT;
    // Keyed on the user id + project id rather than fullName: a GitLab full name can
    // contain slashes, which would silently create nested directories.
    const destination = path.resolve(
      expandHome(root),
      project.userId,
      project.projectName,
    );

    await mkdir(destination, { recursive: true });

    return destination;
  }
}
