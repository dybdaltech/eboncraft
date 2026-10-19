import { AlertTriangle } from "lucide-react";
import { Github } from "@/components/github-icon";
import type { Metadata } from "next";
import Link from "next/link";
import { signInWithGitHub } from "@/app/auth/actions";
import { FlavorBadges } from "@/components/flavor-badges";
import { ScanBadge } from "@/components/scan-badge";
import { SetupNotice } from "@/components/setup-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import type { Addon } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { AddAddonForm } from "./add-addon-form";
import { AddonRowActions } from "./addon-row-actions";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

type Row = Pick<
  Addon,
  "id" | "slug" | "name" | "repo_full_name" | "latest_version" | "flavors" | "vt_status" | "vt_sha256" | "vt_malicious" | "vt_suspicious" | "last_synced_at" | "sync_error"
>;

export default async function DashboardPage() {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="mx-auto mt-20 max-w-md text-center">
        <h1 className="text-2xl font-semibold">Sign in to list your addons</h1>
        <p className="mt-2 text-muted-foreground">Eboncraft uses your GitHub account to confirm you own the repositories you link.</p>
        <form action={signInWithGitHub} className="mt-6">
          <input type="hidden" name="next" value="/dashboard" />
          <Button size="lg">
            <Github /> Sign in with GitHub
          </Button>
        </form>
      </div>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("addons")
    .select("id, slug, name, repo_full_name, latest_version, flavors, vt_status, vt_sha256, vt_malicious, vt_suspicious, last_synced_at, sync_error")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  const addons = (data ?? []) as Row[];

  return (
    <div className="flex flex-col gap-8 pt-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your addons</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Push a GitHub release and Eboncraft picks it up automatically. Use sync to pull it in right away.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Link a repository</CardTitle>
          <CardDescription>
            We read the README, the latest release and the <code className="font-mono">## Interface:</code> line of your .toc files.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddAddonForm />
        </CardContent>
      </Card>

      {addons.length === 0 ? (
        <p className="text-sm text-muted-foreground">You haven&apos;t linked any addons yet.</p>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {addons.map((a) => (
            <li key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link href={`/addons/${a.slug}`} className="truncate font-medium hover:text-primary">
                    {a.name}
                  </Link>
                  {a.latest_version && <span className="font-mono text-xs text-muted-foreground">{a.latest_version}</span>}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{a.repo_full_name}</span>
                  <span>· synced {timeAgo(a.last_synced_at)}</span>
                </div>
                {a.sync_error && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-warning">
                    <AlertTriangle className="size-3" /> {a.sync_error}
                  </p>
                )}
              </div>
              <FlavorBadges flavors={a.flavors} />
              <ScanBadge {...a} />
              <AddonRowActions id={a.id} name={a.name} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
