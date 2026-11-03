import { stat, readFile } from "node:fs/promises";
import { join } from "node:path";
import dotenv from "dotenv";

export async function detectEnvVariables(
  folderPath: string,
): Promise<Record<string, string> | null> {
  const folder = await stat(folderPath);

  if (!folder.isDirectory()) {
    throw new TypeError(`Expected a directory: ${folderPath}`);
  }

  const envExamplePath = join(folderPath, ".env.example");

  try {
    const contents = await readFile(envExamplePath, "utf8");
    return dotenv.parse(contents);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}
