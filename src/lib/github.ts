import { serverEnv } from "@/lib/env";

const API = "https://api.github.com";

export class GitHubError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

type CacheStorageWithDefault = CacheStorage & { default?: Cache };

/** The Workers edge cache, when running on Cloudflare. */
function edgeCache(): Cache | undefined {
  if (typeof caches === "undefined") return undefined;
  return (caches as CacheStorageWithDefault).default;
}

/**
 * Fetches from GitHub and keeps successful responses in Cloudflare's edge cache for `ttl` seconds,
 * so page views and re-syncs don't burn through the API rate limit.
 */
async function cachedFetch(url: string, init: { accept?: string; ttl?: number; api?: boolean } = {}) {
  const { accept = "application/vnd.github+json", ttl = 600, api = true } = init;
  const cache = edgeCache();
  const cacheKey = new Request(`${url}${url.includes("?") ? "&" : "?"}__accept=${encodeURIComponent(accept)}`);

  if (cache && ttl > 0) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  const headers: Record<string, string> = { Accept: accept, "User-Agent": "eboncraft.dev" };
  if (api) {
    headers["X-GitHub-Api-Version"] = "2022-11-28";
    const token = serverEnv("GITHUB_TOKEN");
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { headers, cache: "no-store" });
  if (res.ok && cache && ttl > 0) {
    // A Response with status 204 must not carry a body.
    const body = res.status === 204 ? null : await res.arrayBuffer();
    const stored = new Response(body, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") ?? "", "Cache-Control": `public, max-age=${ttl}` },
    });
    await cache.put(cacheKey, stored.clone());
    return stored;
  }
  return res;
}

async function apiJson<T>(path: string, ttl?: number): Promise<T | null> {
  const res = await cachedFetch(`${API}${path}`, { ttl });
  if (res.status === 404) return null;
  if (!res.ok) {
    const remaining = res.headers.get("x-ratelimit-remaining");
    const reason = remaining === "0" ? "GitHub API rate limit reached, try again later." : `GitHub API error ${res.status}`;
    throw new GitHubError(reason, res.status);
  }
  return (await res.json()) as T;
}

export type GitHubRepo = {
  full_name: string;
  name: string;
  description: string | null;
  homepage: string | null;
  html_url: string;
  stargazers_count: number;
  topics?: string[];
  default_branch: string;
  private: boolean;
  archived: boolean;
  owner: { login: string; type: "User" | "Organization"; avatar_url: string };
};

export type GitHubRelease = {
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  published_at: string | null;
  zipball_url: string | null;
  assets: { name: string; browser_download_url: string; size: number; content_type: string }[];
};

export function getRepo(owner: string, repo: string) {
  return apiJson<GitHubRepo>(`/repos/${owner}/${repo}`);
}

export function getLatestRelease(owner: string, repo: string) {
  return apiJson<GitHubRelease>(`/repos/${owner}/${repo}/releases/latest`);
}

export async function getReadme(owner: string, repo: string): Promise<string | null> {
  const res = await cachedFetch(`${API}/repos/${owner}/${repo}/readme`, { accept: "application/vnd.github.raw+json" });
  if (res.status === 404) return null;
  if (!res.ok) throw new GitHubError(`GitHub API error ${res.status} reading README`, res.status);
  return res.text();
}

export async function getTreePaths(owner: string, repo: string, branch: string): Promise<string[]> {
  const tree = await apiJson<{ tree: { path: string; type: string }[] }>(
    `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
  );
  return tree?.tree.filter((e) => e.type === "blob").map((e) => e.path) ?? [];
}

/** Reads a file through raw.githubusercontent.com, which does not count against the API limit. */
export async function getRawFile(owner: string, repo: string, branch: string, path: string): Promise<string | null> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
  const res = await cachedFetch(url, { accept: "text/plain", api: false });
  return res.ok ? res.text() : null;
}

/**
 * Whether `login` may list `repo` on Eboncraft: they own it, or it belongs to an organization they
 * are a public member of.
 */
export async function canListRepo(login: string, repo: GitHubRepo): Promise<boolean> {
  if (repo.owner.login.toLowerCase() === login.toLowerCase()) return true;
  if (repo.owner.type !== "Organization") return false;
  const res = await cachedFetch(`${API}/orgs/${repo.owner.login}/public_members/${login}`, { ttl: 60 });
  return res.status === 204;
}
