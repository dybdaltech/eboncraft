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

/** The GitHub login Supabase stores on the user after OAuth. */
export function githubLogin(user: { user_metadata?: Record<string, unknown> } | null): string | null {
  const meta = user?.user_metadata ?? {};
  const login = meta.user_name ?? meta.preferred_username;
  return typeof login === "string" ? login : null;
}
