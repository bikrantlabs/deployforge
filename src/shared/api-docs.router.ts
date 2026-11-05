import { Router } from "express";
import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { config } from "./config/config";

// Bundled builds copy the collection under dist/bruno; source execution reads the
// collection from the repository root.
const docsRoot =
  [
    path.resolve(__dirname, "bruno/Deployforge"),
    path.resolve(__dirname, "../../bruno/Deployforge"),
    path.resolve(process.cwd(), "bruno/Deployforge"),
  ].find(existsSync) ?? path.resolve(process.cwd(), "bruno/Deployforge");

type DocFile = { path: string; url: string };

async function listDocs(directory = docsRoot, prefix = ""): Promise<DocFile[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter((entry) => !entry.name.startsWith("."))
      .map(async (entry) => {
        const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          return listDocs(path.join(directory, entry.name), relativePath);
        }
        if (!entry.isFile()) {
          return [];
        }
        return [
          {
            path: relativePath,
            url: `${config.API_PREFIX}/${relativePath
              .split("/")
              .map(encodeURIComponent)
              .join("/")}`,
          },
        ];
      }),
  );
  return files.flat().sort((a, b) => a.path.localeCompare(b.path));
}

export const apiDocsRouter = Router();

apiDocsRouter.use(async (req, res, next) => {
  if (!config.ENABLE_API_DOCS || req.method !== "GET") {
    return next();
  }

  if (req.path === "/" || req.path === "") {
    try {
      return res.json({ files: await listDocs() });
    } catch (error) {
      return next(error);
    }
  }

  let relativePath: string;
  try {
    relativePath = decodeURIComponent(req.path.slice(1));
  } catch {
    return res.status(400).json({ error: "Invalid documentation path" });
  }

  const segments = relativePath.split(/[\\/]/);
  if (
    !relativePath ||
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        segment.startsWith("."),
    )
  ) {
    return res.status(400).json({ error: "Invalid documentation path" });
  }

  const filePath = path.resolve(docsRoot, ...segments);
  if (!filePath.startsWith(`${docsRoot}${path.sep}`)) {
    return res.status(400).json({ error: "Invalid documentation path" });
  }

  try {
    if (!(await stat(filePath)).isFile()) {
      return res.status(404).json({ error: "Documentation file not found" });
    }
    const content = await readFile(filePath, "utf8");
    res.type(
      path.extname(filePath) === ".json" ? "application/json" : "text/plain",
    );
    return res.send(content);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return res.status(404).json({ error: "Documentation file not found" });
    }
    return next(error);
  }
});
