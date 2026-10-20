import { getCloudflareContext } from "@opennextjs/cloudflare";

type ServerEnv = {
  SUPABASE_SERVICE_ROLE_KEY?: string;
  GITHUB_TOKEN?: string;
  VIRUSTOTAL_API_KEY?: string;
};

/** Reads a server secret from the Worker bindings, falling back to process.env (next dev, .env.local). */
export function serverEnv(name: keyof ServerEnv): string | undefined {
  try {
    const value = (getCloudflareContext().env as ServerEnv)[name];
    if (value) return value;
  } catch {
    // Not running inside a Cloudflare request context.
  }
  return process.env[name] || undefined;
}

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
// Supabase calls this the "publishable" key now ("anon" in the legacy keys); either name works.
export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export function siteUrl(fallbackOrigin?: string): string {
  return process.env.NEXT_PUBLIC_SITE_URL || fallbackOrigin || "http://localhost:3000";
}
