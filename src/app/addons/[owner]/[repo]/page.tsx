import { AlertTriangle, Calendar, Download, ExternalLink, Globe, Star } from "lucide-react";
import { Github } from "@/components/github-icon";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { cache } from "react";
import { FlavorBadges } from "@/components/flavor-badges";
import { Markdown } from "@/components/markdown";
import { ScanBadge } from "@/components/scan-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured, serverEnv } from "@/lib/env";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isStale, syncAddon } from "@/lib/sync";
import { flavorForInterface, FLAVOR_LABELS, formatInterface } from "@/lib/toc";
import type { Addon } from "@/lib/types";
import { formatBytes, timeAgo } from "@/lib/utils";

type Params = Promise<{ owner: string; repo: string }>;

const loadAddon = cache(async (owner: string, repo: string) => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("addons").select("*").eq("slug", `${owner}/${repo}`.toLowerCase()).maybeSingle();
  return data as Addon | null;
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { owner, repo } = await params;
  const addon = await loadAddon(owner, repo);
  if (!addon) return { title: "Addon not found" };
  return {
    title: addon.name,
    description: addon.description ?? undefined,
    openGraph: { images: addon.images.slice(0, 1) },
  };
}

export default async function AddonPage({ params }: { params: Params }) {
  const { owner, repo } = await params;
  const addon = await loadAddon(owner, repo);
  if (!addon) notFound();

  // Refresh from GitHub after the response is sent, so the next visitor sees the latest release.
  if (isStale(addon) && serverEnv("SUPABASE_SERVICE_ROLE_KEY")) {
    after(() => syncAddon(createAdminClient(), addon));
  }

  const githubUrl = `https://github.com/${addon.repo_full_name}`;

  return (
    <div className="pt-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {addon.owner_avatar_url && <img src={addon.owner_avatar_url} alt="" className="size-5 rounded-full" />}
            <a href={`https://github.com/${addon.owner_login}`} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
              {addon.owner_login}
            </a>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{addon.name}</h1>
          {addon.description && <p className="mt-2 max-w-2xl text-muted-foreground">{addon.description}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <FlavorBadges flavors={addon.flavors} />
            {addon.categories.map((c) => (
              <Badge key={c} variant="secondary">
                {c}
              </Badge>
            ))}
          </div>
        </div>

        <div className="w-full shrink-0 rounded-xl border bg-card p-4 lg:w-80">
          {addon.download_url ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm">{addon.latest_version}</span>
                <ScanBadge {...addon} />
              </div>
              <Button asChild size="lg" className="mt-3 w-full">
                <a href={addon.download_url} rel="nofollow">
                  <Download /> Download {formatBytes(addon.download_size)}
                </a>
              </Button>
              {addon.download_is_source && (
                <p className="mt-2 text-xs text-muted-foreground">
                  This release has no packaged .zip, so this is GitHub&apos;s source archive. You may need to rename the extracted folder to
                  match the addon&apos;s .toc file.
                </p>
              )}
              {addon.release_published_at && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="size-3" /> Released {timeAgo(addon.release_published_at)}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No GitHub release yet. Grab the code from the repository.</p>
          )}
          <div className="mt-4 flex flex-col gap-1.5 border-t pt-4 text-sm">
            <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <Github className="size-4" /> {addon.repo_full_name}
              <Star className="ml-auto size-3" /> {addon.stars}
            </a>
            {addon.homepage && (
              <a href={addon.homepage} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <Globe className="size-4" /> Website
              </a>
            )}
          </div>
        </div>
      </div>

      {addon.sync_error && (
        <p className="mt-6 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning">
          <AlertTriangle className="size-4" /> Last sync from GitHub failed: {addon.sync_error}
        </p>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_16rem]">
        <article className="min-w-0">
          {addon.readme ? (
            <Markdown source={addon.readme} repo={addon.repo_full_name} branch={addon.default_branch} />
          ) : (
            <p className="text-muted-foreground">This repository has no README.</p>
          )}
        </article>

        <aside className="flex flex-col gap-8 text-sm">
          {addon.release_notes && (
            <section>
              <h2 className="mb-3 font-semibold">
                What&apos;s new{addon.release_name && addon.release_name !== addon.latest_version ? `: ${addon.release_name}` : ""}
              </h2>
              <div className="max-h-96 overflow-y-auto rounded-lg border bg-card p-3 text-xs [&_.markdown]:prose-sm">
                <Markdown source={addon.release_notes} repo={addon.repo_full_name} branch={addon.default_branch} />
              </div>
              <a
                href={`${githubUrl}/releases`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                All releases <ExternalLink className="size-3" />
              </a>
            </section>
          )}

          {addon.interface_versions.length > 0 && (
            <section>
              <h2 className="mb-3 font-semibold">Game versions</h2>
              <ul className="space-y-1.5">
                {addon.interface_versions.map((n) => {
                  const flavor = flavorForInterface(n);
                  return (
                    <li key={n} className="flex justify-between gap-2 text-muted-foreground">
                      <span>{flavor ? FLAVOR_LABELS[flavor] : "Unknown"}</span>
                      <span className="font-mono text-foreground">{formatInterface(n)}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">Read from the addon&apos;s .toc files.</p>
            </section>
          )}

          {addon.images.length > 1 && (
            <section>
              <h2 className="mb-3 font-semibold">Screenshots</h2>
              <div className="grid gap-2">
                {addon.images.map((src) => (
                  <a key={src} href={src} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" loading="lazy" className="rounded-md border" />
                  </a>
                ))}
              </div>
            </section>
          )}

          <p className="text-xs text-muted-foreground">Synced from GitHub {timeAgo(addon.last_synced_at)}.</p>
        </aside>
      </div>
    </div>
  );
}
