import { isSupabaseConfigured } from "@/lib/env";
import { fetchRepoSnapshot, readmeImages, scanIfNeeded } from "@/lib/sync";
import type { Addon, AddonCard } from "@/lib/types";

/**
 * Demo mode runs the site without Supabase: browsing uses the sample addons below, and the dashboard
 * keeps repos you add in server memory (lost on restart). It turns on when the Supabase env vars are
 * missing, so `npm run dev` works straight after `npm install`.
 */
export const isDemoMode = !isSupabaseConfigured;

const DEMO_OWNER = "00000000-0000-0000-0000-000000000000";
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

function sample(fields: Partial<Addon> & Pick<Addon, "repo_full_name" | "name">): Addon {
  const [owner] = fields.repo_full_name.split("/");
  return {
    id: `demo-${fields.repo_full_name.toLowerCase().replace(/\W+/g, "-")}`,
    owner_id: DEMO_OWNER,
    owner_login: owner,
    owner_avatar_url: null,
    slug: fields.repo_full_name.toLowerCase(),
    default_branch: "main",
    description: null,
    readme: null,
    homepage: null,
    stars: 0,
    topics: [],
    latest_version: null,
    release_name: null,
    release_notes: null,
    release_published_at: null,
    download_url: null,
    download_name: null,
    download_size: null,
    download_is_source: false,
    interface_versions: [],
    flavors: [],
    categories: [],
    images: [],
    vt_status: "unscanned",
    vt_sha256: null,
    vt_malicious: null,
    vt_suspicious: null,
    vt_checked_at: null,
    last_synced_at: daysAgo(0),
    sync_error: null,
    created_at: daysAgo(30),
    updated_at: daysAgo(0),
    ...fields,
  };
}

const readme = (title: string, body: string) =>
  `# ${title}\n\n${body}\n\n## Installation\n\n1. Download the latest release.\n2. Extract it into \`World of Warcraft/_retail_/Interface/AddOns\`.\n3. Type \`/reload\` in game.\n\n## Commands\n\n| Command | What it does |\n| --- | --- |\n| \`/${title.toLowerCase().split(" ")[0]}\` | Opens the options |\n\n> This is sample data shown in demo mode.\n`;

const SAMPLES: Addon[] = [
  sample({
    repo_full_name: "demo-dev/QuestLens",
    name: "QuestLens",
    description: "Cleaner quest tracker with distance sorting and one-click waypoints.",
    readme: readme("QuestLens", "QuestLens replaces the default objective tracker with a compact, sortable list.\n\n- [x] Sort by distance\n- [x] Waypoint arrow\n- [ ] Party sync"),
    stars: 412,
    latest_version: "v3.4.1",
    release_name: "Midnight pre-patch",
    release_notes: "- Updated for 12.0\n- Fixed tracker flicker in instances",
    release_published_at: daysAgo(2),
    download_url: "https://example.com/QuestLens-v3.4.1.zip",
    download_name: "QuestLens-v3.4.1.zip",
    download_size: 184_320,
    interface_versions: [120000, 50500, 11507],
    flavors: ["retail", "mists", "classic"],
    categories: ["Quests & Leveling", "Map & Minimap"],
    vt_status: "clean",
    vt_sha256: "0".repeat(64),
    vt_malicious: 0,
    vt_suspicious: 0,
  }),
  sample({
    repo_full_name: "ironforge-labs/StackSense",
    name: "StackSense",
    description: "Bag sorting that remembers where you put things.",
    readme: readme("StackSense", "Sort your bags once, and StackSense keeps every item where you left it."),
    stars: 128,
    latest_version: "2.0.0",
    release_published_at: daysAgo(9),
    release_notes: "Rewritten storage layer.",
    download_url: "https://example.com/StackSense-2.0.0.zip",
    download_name: "StackSense-2.0.0.zip",
    download_size: 92_000,
    interface_versions: [120000, 40402],
    flavors: ["retail", "cata"],
    categories: ["Bags & Inventory"],
    vt_status: "pending",
  }),
  sample({
    repo_full_name: "moonglade/TinyFrames",
    name: "TinyFrames",
    description: "Minimal unit frames for Classic Era and Cataclysm Classic.",
    readme: readme("TinyFrames", "Small, readable unit frames with class colors and threat glow."),
    stars: 57,
    latest_version: "v1.15.2",
    release_published_at: daysAgo(21),
    download_url: "https://example.com/TinyFrames.zip",
    download_name: "v1.15.2.zip",
    download_is_source: true,
    interface_versions: [40402, 11507],
    flavors: ["cata", "classic"],
    categories: ["Unit Frames"],
    vt_status: "unscanned",
  }),
  sample({
    repo_full_name: "demo-dev/PullTimerPlus",
    name: "PullTimerPlus",
    description: "Raid pull timer with voice countdown and break reminders.",
    readme: readme("PullTimerPlus", "A shared pull timer for raid leaders."),
    stars: 33,
    latest_version: "v0.9.0-beta",
    release_published_at: daysAgo(45),
    download_url: "https://example.com/PullTimerPlus.zip",
    download_name: "PullTimerPlus.zip",
    download_size: 48_000,
    interface_versions: [120000],
    flavors: ["retail"],
    categories: ["Boss Encounters"],
    vt_status: "flagged",
    vt_sha256: "f".repeat(64),
    vt_malicious: 2,
    vt_suspicious: 1,
  }),
];

type DemoStore = { added: Addon[] };
const store: DemoStore = ((globalThis as { __eboncraftDemo?: DemoStore }).__eboncraftDemo ??= { added: [] });

export function demoAddons(): Addon[] {
  return [...store.added, ...SAMPLES];
}

export function demoAddonBySlug(slug: string): Addon | null {
  return demoAddons().find((a) => a.slug === slug.toLowerCase()) ?? null;
}

export function demoAddonById(id: string): Addon | null {
  return demoAddons().find((a) => a.id === id) ?? null;
}

/** Repos added from the dashboard in demo mode. */
export function demoMyAddons(): Addon[] {
  return store.added;
}

export function demoSearch(q: string, flavor: string | undefined, category: string | undefined, sort: "updated" | "stars" | "new"): AddonCard[] {
  const term = q.toLowerCase();
  const list = demoAddons().filter(
    (a) =>
      (!flavor || a.flavors.includes(flavor as Addon["flavors"][number])) &&
      (!category || a.categories.includes(category)) &&
      (!term || [a.name, a.description ?? "", a.repo_full_name].some((s) => s.toLowerCase().includes(term))),
  );
  const time = (s: string | null) => (s ? new Date(s).getTime() : 0);
  if (sort === "stars") list.sort((a, b) => b.stars - a.stars);
  else if (sort === "new") list.sort((a, b) => time(b.created_at) - time(a.created_at));
  else list.sort((a, b) => time(b.release_published_at) - time(a.release_published_at));
  return list;
}

/** Fetches a real repo from GitHub and keeps it in memory. No sign-in or ownership check in demo mode. */
export async function demoAdd(owner: string, repo: string, categories: string[], images: string[]): Promise<string> {
  const fetched = await fetchRepoSnapshot(owner, repo);
  if (!fetched) throw new Error(`${owner}/${repo} doesn't exist or is private.`);
  const { repo: gh, snapshot } = fetched;
  if (demoAddonBySlug(snapshot.slug)) throw new Error(`${gh.full_name} is already listed.`);
  const { tocCategory: _unused, ...fields } = snapshot;
  void _unused;
  const addon = sample({
    ...fields,
    owner_login: gh.owner.login,
    owner_avatar_url: gh.owner.avatar_url,
    categories,
    images: images.length ? images : readmeImages(snapshot.readme, gh.full_name, gh.default_branch),
    created_at: new Date().toISOString(),
  });
  Object.assign(addon, await scanIfNeeded({ ...addon, download_url: null }, snapshot));
  store.added.unshift(addon);
  return gh.full_name;
}

export async function demoResync(id: string) {
  const addon = store.added.find((a) => a.id === id);
  if (!addon) return;
  const [owner, repo] = addon.repo_full_name.split("/");
  try {
    const fetched = await fetchRepoSnapshot(owner, repo);
    if (!fetched) throw new Error("Repository is missing or private.");
    const { tocCategory: _unused, ...fields } = fetched.snapshot;
    void _unused;
    const scan = await scanIfNeeded(addon, fetched.snapshot);
    Object.assign(addon, fields, scan);
  } catch (error) {
    addon.sync_error = error instanceof Error ? error.message : "Sync failed";
    addon.last_synced_at = new Date().toISOString();
  }
}

export function demoUpdate(id: string, categories: string[], images: string[]) {
  const addon = store.added.find((a) => a.id === id);
  if (addon) Object.assign(addon, { categories, images });
}

export function demoDelete(id: string) {
  store.added = store.added.filter((a) => a.id !== id);
}
