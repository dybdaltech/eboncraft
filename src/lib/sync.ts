import type { SupabaseClient } from "@supabase/supabase-js";
import { getLatestRelease, getRawFile, getReadme, getRepo, getTreePaths, type GitHubRelease, type GitHubRepo } from "@/lib/github";
import { flavorsForInterfaces, parseToc, pickTocPaths, type TocInfo } from "@/lib/toc";
import type { Addon } from "@/lib/types";
import { checkFile, isVirusTotalEnabled, scanDownload } from "@/lib/virustotal";

/** Addons older than this are refreshed in the background when someone views them. */
export const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

export type RepoSnapshot = Pick<
  Addon,
  | "repo_full_name"
  | "slug"
  | "default_branch"
  | "name"
  | "description"
  | "readme"
  | "homepage"
  | "stars"
  | "topics"
  | "latest_version"
  | "release_name"
  | "release_notes"
  | "release_published_at"
  | "download_url"
  | "download_name"
  | "download_size"
  | "download_is_source"
  | "interface_versions"
  | "flavors"
  | "last_synced_at"
  | "sync_error"
> & { tocCategory: string | null };

function pickDownload(release: GitHubRelease | null) {
  if (!release) return { download_url: null, download_name: null, download_size: null, download_is_source: false };
  const zips = release.assets.filter((a) => a.name.toLowerCase().endsWith(".zip"));
  const asset = zips.find((a) => !/nolib/i.test(a.name)) ?? zips[0];
  if (asset) {
    return {
      download_url: asset.browser_download_url,
      download_name: asset.name,
      download_size: asset.size,
      download_is_source: false,
    };
  }
  // No packaged zip: fall back to GitHub's source archive. Players may need to rename the folder.
  return {
    download_url: release.zipball_url,
    download_name: release.zipball_url ? `${release.tag_name}.zip` : null,
    download_size: null,
    download_is_source: Boolean(release.zipball_url),
  };
}

async function readTocs(repo: GitHubRepo): Promise<TocInfo[]> {
  const [owner, name] = repo.full_name.split("/");
  const paths = pickTocPaths(await getTreePaths(owner, name, repo.default_branch));
  const files = await Promise.all(paths.map((p) => getRawFile(owner, name, repo.default_branch, p)));
  return files.filter((f): f is string => f !== null).map(parseToc);
}

/** Pulls everything Eboncraft shows about an addon straight from its GitHub repository. */
export async function fetchRepoSnapshot(owner: string, repoName: string): Promise<{ repo: GitHubRepo; snapshot: RepoSnapshot } | null> {
  const repo = await getRepo(owner, repoName);
  if (!repo || repo.private) return null;
  const [o, r] = repo.full_name.split("/");

  const [readme, release, tocs] = await Promise.all([getReadme(o, r), getLatestRelease(o, r), readTocs(repo)]);

  const interfaces = [...new Set(tocs.flatMap((t) => t.interfaces))].sort((a, b) => b - a);
  const toc = tocs.find((t) => t.title) ?? tocs[0];
  const tocVersion = tocs.map((t) => t.version).find((v) => v && !v.includes("@"));

  return {
    repo,
    snapshot: {
      repo_full_name: repo.full_name,
      slug: repo.full_name.toLowerCase(),
      default_branch: repo.default_branch,
      name: toc?.title || repo.name,
      description: repo.description || toc?.notes || null,
      readme,
      homepage: repo.homepage || null,
      stars: repo.stargazers_count,
      topics: repo.topics ?? [],
      latest_version: release?.tag_name ?? tocVersion ?? null,
      release_name: release?.name || null,
      release_notes: release?.body || null,
      release_published_at: release?.published_at ?? null,
      ...pickDownload(release),
      interface_versions: interfaces,
      flavors: flavorsForInterfaces(interfaces),
      last_synced_at: new Date().toISOString(),
      sync_error: null,
      tocCategory: tocs.map((t) => t.category).find(Boolean) ?? null,
    },
  };
}

/** Scans a new download, or checks on a scan that was still running at the last sync. */
export async function scanIfNeeded(current: Partial<Addon>, next: RepoSnapshot) {
  if (!isVirusTotalEnabled() || !next.download_url) return {};
  const downloadChanged = current.download_url !== next.download_url;
  if (!downloadChanged && current.vt_status === "pending" && current.vt_sha256) {
    return (await checkFile(current.vt_sha256)) ?? {};
  }
  if (downloadChanged || current.vt_status === "unscanned" || current.vt_status === "error") {
    return (await scanDownload(next.download_url, next.download_size)) ?? {};
  }
  return {};
}

/** Re-syncs one addon from GitHub and saves it. `admin` must be a service-role client. */
export async function syncAddon(admin: SupabaseClient, addon: Pick<Addon, "id" | "repo_full_name" | "download_url" | "vt_status" | "vt_sha256">) {
  const [owner, repo] = addon.repo_full_name.split("/");
  try {
    const fetched = await fetchRepoSnapshot(owner, repo);
    if (!fetched) {
      await admin.from("addons").update({ sync_error: "Repository is missing or private.", last_synced_at: new Date().toISOString() }).eq("id", addon.id);
      return;
    }
    const { tocCategory: _unused, ...snapshot } = fetched.snapshot;
    void _unused;
    const scan = await scanIfNeeded(addon, fetched.snapshot);
    await admin.from("addons").update({ ...snapshot, ...scan }).eq("id", addon.id);
  } catch (error) {
    await admin
      .from("addons")
      .update({ sync_error: error instanceof Error ? error.message : "Sync failed", last_synced_at: new Date().toISOString() })
      .eq("id", addon.id);
  }
}

const PENDING_RECHECK_MS = 5 * 60 * 1000;

/** Picks screenshot-looking images from a README, skipping badges, for use as card thumbnails. */
export function readmeImages(readme: string | null, repo: string, branch: string, limit = 4): string[] {
  if (!readme) return [];
  const found: string[] = [];
  const pattern = /!\[[^\]]*\]\(\s*<?([^)\s>]+)>?[^)]*\)|<img[^>]+src=["']([^"']+)["']/gi;
  for (const match of readme.matchAll(pattern)) {
    const url = match[1] ?? match[2];
    if (!url || /shields\.io|badge|badgen|travis-ci|github\.com\/[^/]+\/[^/]+\/(actions|workflows)|\.svg(\?|$)/i.test(url)) continue;
    const absolute = /^https?:\/\//i.test(url)
      ? url
      : new URL(url.replace(/^\.?\//, ""), `https://raw.githubusercontent.com/${repo}/${branch}/`).toString();
    if (!found.includes(absolute)) found.push(absolute);
    if (found.length >= limit) break;
  }
  return found;
}

export function isStale(addon: Pick<Addon, "last_synced_at" | "vt_status" | "vt_checked_at">) {
  if (addon.vt_status === "pending" && addon.vt_checked_at) {
    if (Date.now() - new Date(addon.vt_checked_at).getTime() > PENDING_RECHECK_MS) return true;
  }
  if (!addon.last_synced_at) return true;
  return Date.now() - new Date(addon.last_synced_at).getTime() > STALE_AFTER_MS;
}
