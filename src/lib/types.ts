export type Flavor = "retail" | "mists" | "cata" | "wrath" | "tbc" | "classic";

export type VtStatus = "unscanned" | "pending" | "clean" | "flagged" | "error" | "too_large";

export type Addon = {
  id: string;
  owner_id: string;
  owner_login: string;
  owner_avatar_url: string | null;
  repo_full_name: string;
  slug: string;
  default_branch: string;
  name: string;
  description: string | null;
  readme: string | null;
  homepage: string | null;
  stars: number;
  topics: string[];
  latest_version: string | null;
  release_name: string | null;
  release_notes: string | null;
  release_published_at: string | null;
  download_url: string | null;
  download_name: string | null;
  download_size: number | null;
  download_is_source: boolean;
  interface_versions: number[];
  flavors: Flavor[];
  categories: string[];
  images: string[];
  vt_status: VtStatus;
  vt_sha256: string | null;
  vt_malicious: number | null;
  vt_suspicious: number | null;
  vt_checked_at: string | null;
  last_synced_at: string | null;
  sync_error: string | null;
  created_at: string;
  updated_at: string;
};

/** Columns for list views; skips the large text fields. */
export const ADDON_CARD_COLUMNS =
  "id, slug, repo_full_name, name, description, owner_login, owner_avatar_url, stars, latest_version, release_published_at, flavors, categories, images, vt_status" as const;

export type AddonCard = Pick<
  Addon,
  | "id"
  | "slug"
  | "repo_full_name"
  | "name"
  | "description"
  | "owner_login"
  | "owner_avatar_url"
  | "stars"
  | "latest_version"
  | "release_published_at"
  | "flavors"
  | "categories"
  | "images"
  | "vt_status"
>;

export const CATEGORIES = [
  "Action Bars",
  "Auction & Economy",
  "Bags & Inventory",
  "Boss Encounters",
  "Chat & Communication",
  "Class",
  "Combat",
  "Damage Meters",
  "Development Tools",
  "Healing",
  "Libraries",
  "Map & Minimap",
  "Professions",
  "PvP",
  "Quests & Leveling",
  "Tooltips",
  "Unit Frames",
  "User Interface",
  "Miscellaneous",
] as const;
