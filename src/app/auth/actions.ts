"use server";

import { redirect } from "next/navigation";
import { requestOrigin } from "@/lib/origin";
import { createClient } from "@/lib/supabase/server";

export async function signInWithGitHub(formData: FormData) {
  const next = String(formData.get("next") || "/dashboard");
  const supabase = await createClient();
  const origin = await requestOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect(`/?auth_error=${encodeURIComponent(error?.message ?? "Could not start sign-in")}`);
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
