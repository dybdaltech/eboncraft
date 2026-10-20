export function DemoBanner() {
  return (
    <div className="mt-6 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm">
      <span className="font-medium text-warning">Demo mode.</span>{" "}
      <span className="text-muted-foreground">
        Supabase isn&apos;t configured, so you&apos;re seeing sample addons. Add real GitHub repos from the{" "}
        <a href="/dashboard" className="text-primary hover:underline">
          dashboard
        </a>
        ; they stay in memory until you restart the dev server. Fill in <code className="font-mono">.env.local</code> to use Supabase.
      </span>
    </div>
  );
}
