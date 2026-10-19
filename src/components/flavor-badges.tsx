import { Badge } from "@/components/ui/badge";
import { FLAVOR_LABELS } from "@/lib/toc";
import type { Flavor } from "@/lib/types";
import { cn } from "@/lib/utils";

const FLAVOR_STYLES: Record<Flavor, string> = {
  retail: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  mists: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  cata: "border-orange-400/30 bg-orange-400/10 text-orange-300",
  wrath: "border-cyan-300/30 bg-cyan-300/10 text-cyan-200",
  tbc: "border-lime-400/30 bg-lime-400/10 text-lime-300",
  classic: "border-amber-300/30 bg-amber-300/10 text-amber-200",
};

export function FlavorBadges({ flavors, className }: { flavors: Flavor[]; className?: string }) {
  if (!flavors.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {flavors.map((f) => (
        <Badge key={f} variant="outline" className={FLAVOR_STYLES[f]}>
          {FLAVOR_LABELS[f]}
        </Badge>
      ))}
    </div>
  );
}
