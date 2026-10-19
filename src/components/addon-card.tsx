import { Download, Star } from "lucide-react";
import Link from "next/link";
import { FlavorBadges } from "@/components/flavor-badges";
import { ScanBadge } from "@/components/scan-badge";
import type { AddonCard as AddonCardData } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

export function AddonCard({ addon }: { addon: AddonCardData }) {
  const thumb = addon.images[0];
  return (
    <Link
      href={`/addons/${addon.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/40"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="grid size-full place-items-center bg-gradient-to-br from-primary/15 via-transparent to-transparent">
            <span className="font-mono text-3xl font-semibold text-muted-foreground/60">{addon.name.slice(0, 2)}</span>
          </div>
        )}
        <div className="absolute right-2 top-2">
          <ScanBadge {...addon} vt_sha256={null} vt_malicious={null} vt_suspicious={null} compact />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight group-hover:text-primary">{addon.name}</h3>
          {addon.latest_version && <span className="shrink-0 font-mono text-xs text-muted-foreground">{addon.latest_version}</span>}
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{addon.description || "No description."}</p>
        <FlavorBadges flavors={addon.flavors} className="mt-auto pt-2" />
        <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
          <span className="truncate">{addon.owner_login}</span>
          <span className="flex items-center gap-1">
            <Star className="size-3" />
            {addon.stars}
          </span>
          {addon.release_published_at && (
            <span className="ml-auto flex items-center gap-1">
              <Download className="size-3" />
              {timeAgo(addon.release_published_at)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
