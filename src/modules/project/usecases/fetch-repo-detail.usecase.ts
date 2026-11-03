import { HttpRepoDetailFetcher } from "src/shared/lib/repo-detail-fetcher";
import { RepoDetail } from "src/shared/lib/types";

export type FetchRepoDetailUsecase = (
  cloneUrl: string,
) => Promise<RepoDetail | null>;

export const createFetchRepoDetailUsecase = (deps: {
  repoDetailFetcher: HttpRepoDetailFetcher;
}): FetchRepoDetailUsecase => {
  const { repoDetailFetcher } = deps;

  return (cloneUrl) => repoDetailFetcher.fetch(cloneUrl);
};
