import { Search } from "lucide-react";
import { Github } from "@/components/github-icon";
import Link from "next/link";
import { signInWithGitHub } from "@/app/auth/actions";
import { AddonCard } from "@/components/addon-card";
import { DemoBanner } from "@/components/demo-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { demoSearch, isDemoMode } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";
import { FLAVOR_LABELS, FLAVOR_ORDER } from "@/lib/toc";
import { ADDON_CARD_COLUMNS, CATEGORIES, type AddonCard as AddonCardData, type Flavor } from "@/lib/types";
import { cn } from "@/lib/utils";

type SearchParams = Promise<{ q?: string; flavor?: string; category?: string; sort?: string; auth_error?: string }>;

const SORTS = { updated: "Recently updated", stars: "Most stars", new: "Newest" } as const;
type Sort = keyof typeof SORTS;

function hrefWith(current: Record<string, string | undefined>, patch: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...patch })) if (v && k !== "auth_error") params.set(k, v);
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

async function loadAddons(q: string, flavor: Flavor | undefined, category: string | undefined, sort: Sort) {
  const supabase = await createClient();
  let query = supabase.from("addons").select(ADDON_CARD_COLUMNS).limit(60);
  if (flavor) query = query.contains("flavors", [flavor]);
  if (category) query = query.contains("categories", [category]);
  if (q) {
    // PostgREST `or` filters are comma separated; strip characters that would break the expression.
    const term = q.replace(/[,()*%\\]/g, " ").trim();
    if (term) query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%,repo_full_name.ilike.%${term}%`);
  }
  if (sort === "stars") query = query.order("stars", { ascending: false });
  else if (sort === "new") query = query.order("created_at", { ascending: false });
  else query = query.order("release_published_at", { ascending: false, nullsFirst: false });
  const { data, error } = await query;
  return { addons: (data ?? []) as AddonCardData[], error: error?.message };
}

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const flavor = FLAVOR_ORDER.includes(params.flavor as Flavor) ? (params.flavor as Flavor) : undefined;
  const category = CATEGORIES.includes(params.category as (typeof CATEGORIES)[number]) ? params.category : undefined;
  const sort: Sort = params.sort && params.sort in SORTS ? (params.sort as Sort) : "updated";
  const current = { q: q || undefined, flavor, category, sort: sort === "updated" ? undefined : sort };

  const result = isDemoMode ? { addons: demoSearch(q, flavor, category, sort), error: undefined } : await loadAddons(q, flavor, category, sort);

  return (
    <>
      <section className="py-14 sm:py-20">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">World of Warcraft addons · from GitHub</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Ship your addon with a <span className="text-primary">git tag</span>. We handle the rest.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground text-pretty">
          Link a repository once. Eboncraft pulls your README, latest release and supported game versions straight from GitHub, and
          scans every download with VirusTotal.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <form action={signInWithGitHub}>
            <input type="hidden" name="next" value="/dashboard" />
            <Button size="lg" disabled={isDemoMode}>
              <Github /> List your addon
            </Button>
          </form>
          <Button size="lg" variant="outline" asChild>
            <Link href="#browse">Browse addons</Link>
          </Button>
        </div>
        {params.auth_error && <p className="mt-4 text-sm text-destructive">{params.auth_error}</p>}
      </section>

      <section id="browse" className="scroll-mt-20">
        <form className="relative" action="/">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Search addons, authors or repos" className="h-11 pl-9" />
          {flavor && <input type="hidden" name="flavor" value={flavor} />}
          {category && <input type="hidden" name="category" value={category} />}
          {current.sort && <input type="hidden" name="sort" value={current.sort} />}
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <FilterLink href={hrefWith(current, { flavor: undefined })} active={!flavor}>
            All versions
          </FilterLink>
          {FLAVOR_ORDER.map((f) => (
            <FilterLink key={f} href={hrefWith(current, { flavor: f })} active={flavor === f}>
              {FLAVOR_LABELS[f]}
            </FilterLink>
          ))}
          <div className="ml-auto flex gap-1 text-sm">
            {(Object.keys(SORTS) as Sort[]).map((s) => (
              <Link
                key={s}
                href={hrefWith(current, { sort: s === "updated" ? undefined : s })}
                className={cn("rounded-md px-2 py-1 text-muted-foreground hover:text-foreground", sort === s && "bg-secondary text-foreground")}
              >
                {SORTS[s]}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              href={hrefWith(current, { category: category === c ? undefined : c })}
              className={cn("text-muted-foreground hover:text-foreground", category === c && "font-medium text-primary")}
            >
              {c}
            </Link>
          ))}
        </div>

        {isDemoMode && <DemoBanner />}
        {result.error ? (
          <p className="mt-10 text-sm text-destructive">Couldn&apos;t load addons: {result.error}</p>
        ) : result.addons.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed p-12 text-center text-muted-foreground">
            {q || flavor || category ? "No addons match those filters." : "No addons yet. Be the first to link one."}
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.addons.map((addon) => (
              <AddonCard key={addon.id} addon={addon} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active ? "border-primary/50 bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
