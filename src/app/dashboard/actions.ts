"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { demoAdd, demoDelete, demoResync, demoUpdate, isDemoMode } from "@/lib/demo";
import { canListRepo, GitHubError } from "@/lib/github";
import { createAdminClient, getCurrentUser, githubLogin } from "@/lib/supabase/server";
import { fetchRepoSnapshot, readmeImages, syncAddon } from "@/lib/sync";
import { CATEGORIES } from "@/lib/types";
import { parseRepoInput } from "@/lib/utils";

export type ActionState = { error?: string; ok?: string } | undefined;

function readCategories(formData: FormData): string[] {
  const allowed = new Set<string>(CATEGORIES);
  return formData
    .getAll("categories")
    .map(String)
    .filter((c) => allowed.has(c))
    .slice(0, 3);
}

function readImages(formData: FormData): string[] {
  return String(formData.get("images") ?? "")
    .split(/\s+/)
    .map((s) => s.trim())
    .filter((s) => /^https:\/\/\S+$/i.test(s))
    .slice(0, 8);
}

function guessCategory(tocCategory: string | null): string[] {
  if (!tocCategory) return [];
  const needle = tocCategory.toLowerCase();
  const match = CATEGORIES.find((c) => c.toLowerCase() === needle || c.toLowerCase().includes(needle) || needle.includes(c.toLowerCase()));
  return match ? [match] : [];
}

/** Loads an addon and confirms the signed-in user owns it. */
async function requireOwnedAddon(id: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/dashboard");
  const admin = createAdminClient();
  const { data: addon } = await admin
    .from("addons")
    .select("id, owner_id, slug, repo_full_name, download_url, vt_status, vt_sha256")
    .eq("id", id)
    .maybeSingle();
  if (!addon || addon.owner_id !== user.id) throw new Error("Addon not found.");
  return { admin, addon };
}

async function addDemoAddon(formData: FormData): Promise<ActionState> {
  const parsed = parseRepoInput(String(formData.get("repo") ?? ""));
  if (!parsed) return { error: "Enter a repository as username/repo or a GitHub URL." };
  try {
    const name = await demoAdd(parsed.owner, parsed.repo, readCategories(formData), readImages(formData));
    revalidatePath("/");
    revalidatePath("/dashboard");
    return { ok: `${name} was synced from GitHub (demo mode, kept in memory until you restart).` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not reach GitHub." };
  }
}

export async function addAddon(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (isDemoMode) return addDemoAddon(formData);
  const user = await getCurrentUser();
  const login = githubLogin(user);
  if (!user || !login) return { error: "Sign in with GitHub first." };

  const parsed = parseRepoInput(String(formData.get("repo") ?? ""));
  if (!parsed) return { error: "Enter a repository as username/repo or a GitHub URL." };

  let fetched;
  try {
    fetched = await fetchRepoSnapshot(parsed.owner, parsed.repo);
  } catch (error) {
    return { error: error instanceof GitHubError ? error.message : "Could not reach GitHub." };
  }
  if (!fetched) return { error: `${parsed.owner}/${parsed.repo} doesn't exist or is private.` };

  const { repo, snapshot } = fetched;
  if (!(await canListRepo(login, repo))) {
    return {
      error: `Only the owner of ${repo.full_name} can list it. For an organization repo, make your membership in ${repo.owner.login} public on GitHub.`,
    };
  }
  if (!snapshot.interface_versions.length) {
    return { error: `No .toc file with an "## Interface:" line was found in ${repo.full_name}. Is this a WoW addon?` };
  }

  const admin = createAdminClient();
  const { data: existing } = await admin.from("addons").select("id").eq("slug", snapshot.slug).maybeSingle();
  if (existing) return { error: `${repo.full_name} is already listed.` };

  const { tocCategory, ...fields } = snapshot;
  const categories = readCategories(formData);
  const images = readImages(formData);
  const { data: inserted, error } = await admin
    .from("addons")
    .insert({
      ...fields,
      owner_id: user.id,
      owner_login: repo.owner.login,
      owner_avatar_url: repo.owner.avatar_url,
      categories: categories.length ? categories : guessCategory(tocCategory),
      images: images.length ? images : readmeImages(snapshot.readme, repo.full_name, repo.default_branch),
    })
    .select("id, repo_full_name, download_url, vt_status, vt_sha256")
    .single();
  if (error || !inserted) return { error: error?.message ?? "Could not save the addon." };

  // Kick off the VirusTotal scan without making the developer wait for the zip download.
  // The row was inserted without a scan, so treat the download as new.
  after(() => syncAddon(admin, { ...inserted, download_url: null }));

  revalidatePath("/");
  revalidatePath("/dashboard");
  return { ok: `${repo.full_name} is live.` };
}

export async function resyncAddon(id: string) {
  if (isDemoMode) {
    await demoResync(id);
    revalidatePath("/dashboard");
    return;
  }
  const { admin, addon } = await requireOwnedAddon(id);
  await syncAddon(admin, addon);
  revalidatePath("/dashboard");
  revalidatePath(`/addons/${addon.slug}`);
}

export async function updateAddon(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  if (isDemoMode) {
    demoUpdate(id, readCategories(formData), readImages(formData));
    revalidatePath("/dashboard");
    return { ok: "Saved." };
  }
  const { admin, addon } = await requireOwnedAddon(id);
  const { error } = await admin
    .from("addons")
    .update({ categories: readCategories(formData), images: readImages(formData) })
    .eq("id", addon.id);
  if (error) return { error: error.message };
  revalidatePath(`/addons/${addon.slug}`);
  revalidatePath("/dashboard");
  return { ok: "Saved." };
}

export async function deleteAddon(id: string) {
  if (isDemoMode) {
    demoDelete(id);
    revalidatePath("/");
    revalidatePath("/dashboard");
    return;
  }
  const { admin, addon } = await requireOwnedAddon(id);
  await admin.from("addons").delete().eq("id", addon.id);
  revalidatePath("/");
  revalidatePath("/dashboard");
}
