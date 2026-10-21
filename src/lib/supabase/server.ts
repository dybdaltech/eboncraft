import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { serverEnv, supabaseAnonKey, supabaseUrl } from "@/lib/env";

/** Supabase client bound to the visitor's session cookies. Reads are subject to RLS. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component; the proxy refreshes the session instead.
        }
      },
    },
  });
}

/** Service-role client for writes. Only use after checking the caller is allowed to make the change. */
export function createAdminClient() {
  const key = serverEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  return createSupabaseClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

type GitHubUser = {
  identities?: { provider: string; identity_data?: Record<string, unknown> }[];
  user_metadata?: Record<string, unknown>;
} | null;

/**
 * The GitHub account the user signed in with, read from the OAuth identity. Never use
 * `user_metadata` for this: users can rewrite it with `auth.updateUser()` and the public key.
 */
export function githubIdentity(user: GitHubUser): { id: number; login: string | null } | null {
  const data = user?.identities?.find((i) => i.provider === "github")?.identity_data ?? {};
  const id = Number(data.provider_id ?? data.sub);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const login = data.user_name ?? data.preferred_username;
  return { id, login: typeof login === "string" ? login : null };
}

/** The GitHub login to show in the header. Display only; authorize with `githubIdentity`. */
export function githubLogin(user: GitHubUser): string | null {
  return githubIdentity(user)?.login ?? null;
}
