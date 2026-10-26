import { RepoDetail } from "../types";

const REQUEST_TIMEOUT_MS = 10_000;

type Provider = "github" | "gitlab";

const SUPPORTED_HOSTS = new Map<string, Provider>([
  ["github.com", "github"],
  ["gitlab.com", "gitlab"],
]);

type ParsedCloneUrl = {
  provider: Provider;
  owner: string;
  repo: string;
};

export class RepoDetailFetchError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "RepoDetailFetchError";
  }
}

function stripGitSuffix(segment: string): string {
  return segment.replace(/\.git$/i, "");
}

function parseCloneUrl(cloneUrl: string): ParsedCloneUrl | null {
  console.log("CLONE URL", cloneUrl);
  const trimmed = cloneUrl.trim();
  if (!trimmed) {
    return null;
  }

  const scpStyle = /^[\w.-]+@([^:/]+):(.+)$/.exec(trimmed);
  const hostAndPath = scpStyle
    ? `${scpStyle[1]}/${scpStyle[2]}`
    : trimmed.replace(/^[a-z][\w+.-]*:\/\//i, "").replace(/^[^/@]*@/, "");

  const segments = hostAndPath
    .split("/")
    .map(stripGitSuffix)
    .filter((segment) => segment.length > 0);

  const provider = SUPPORTED_HOSTS.get(segments[0]?.toLowerCase() ?? "");
  if (!provider || segments.length < 3) {
    return null;
  }

  return {
    provider,
    owner: segments.slice(1, -1).join("/"),
    repo: segments[segments.length - 1]!,
  };
}

type GithubRepoResponse = {
  id: number;
  full_name: string;
  clone_url: string;
};

type GitlabProjectResponse = {
  id: number;
  path_with_namespace: string;
  http_url_to_repo: string;
};

export class HttpRepoDetailFetcher {
  private readonly GITHUB_TOKEN: string | undefined;
  private readonly GITLAB_TOKEN: string | undefined;
  constructor(githubToken?: string, gitlabToken?: string) {
    this.GITHUB_TOKEN = githubToken;
    this.GITLAB_TOKEN = gitlabToken;
  }
  async fetch(cloneUrl: string): Promise<RepoDetail | null> {
    const parsed = parseCloneUrl(cloneUrl);
    console.log({ parsed });
    if (!parsed) {
      // TODO:  Return with error message instead: unable to parse url, so the client can throw it's own error.
      return null;
    }

    return parsed.provider === "gitlab"
      ? this.fetchFromGitlab(parsed.owner, parsed.repo)
      : this.fetchFromGithub(parsed.owner, parsed.repo);
  }

  private async fetchFromGithub(
    owner: string,
    repo: string,
  ): Promise<RepoDetail | null> {
    const response = await this.request(
      `https://api.github.com/repos/${owner}/${repo}`,
      this.githubHeaders(),
    );
    if (!response) {
      // TODO: Return with error message: unable to fetch from github
      return null;
    }

    const body = (await response.json()) as GithubRepoResponse;
    return {
      repoId: body.id,
      fullName: body.full_name,
      sourceUrl: body.clone_url,
    };
  }

  private async fetchFromGitlab(
    owner: string,
    repo: string,
  ): Promise<RepoDetail | null> {
    const headers: Record<string, string> = {};
    const token = this.GITLAB_TOKEN;
    if (token) {
      headers["PRIVATE-TOKEN"] = token;
    }

    const response = await this.request(
      `https://gitlab.com/api/v4/projects/${encodeURIComponent(`${owner}/${repo}`)}`,
      headers,
    );
    if (!response) {
      // TODO: Return with message, unable to fetch from gitlab
      return null;
    }

    const body = (await response.json()) as GitlabProjectResponse;
    return {
      repoId: body.id,
      fullName: body.path_with_namespace,
      sourceUrl: body.http_url_to_repo,
    };
  }

  private githubHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2026-03-10",
    };

    const token = this.GITHUB_TOKEN;
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  }

  private async request(
    url: string,
    headers: Record<string, string>,
  ): Promise<Response | null> {
    const host = new URL(url).host;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { "User-Agent": "deployforge", ...headers },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw new RepoDetailFetchError(`Could not reach ${host}.`, {
        cause: error,
      });
    }

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      if (response.status === 403 || response.status === 429) {
        console.log(response);
        throw new RepoDetailFetchError(
          `${host} rate limit exceeded. Set GITHUB_TOKEN or GITLAB_TOKEN to raise it.`,
        );
      }
      throw new RepoDetailFetchError(
        `${host} responded with ${response.status}.`,
      );
    }

    return response;
  }
}
