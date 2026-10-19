export function SetupNotice() {
  return (
    <div className="mt-10 rounded-xl border border-warning/30 bg-warning/5 p-6 text-sm">
      <p className="font-medium text-warning">Supabase isn&apos;t configured yet.</p>
      <p className="mt-2 text-muted-foreground">
        Copy <code className="font-mono">.env.example</code> to <code className="font-mono">.env.local</code>, fill in your Supabase URL and
        keys, and run the migration in <code className="font-mono">supabase/migrations</code>. See the README for the full setup.
      </p>
    </div>
  );
}
