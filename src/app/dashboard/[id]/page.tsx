import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { demoAddonById, isDemoMode } from "@/lib/demo";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { EditAddonForm } from "./edit-form";

export default async function EditAddonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const addon = isDemoMode ? demoAddonById(id) : await loadOwnedAddon(id);
  if (!addon) notFound();

  return (
    <div className="max-w-2xl pt-10">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{addon.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Everything else on the <Link href={`/addons/${addon.slug}`} className="text-primary hover:underline">addon page</Link> comes from
        GitHub. Edit your README or publish a release to change it.
      </p>
      <div className="mt-8">
        <EditAddonForm id={addon.id} categories={addon.categories} images={addon.images} />
      </div>
    </div>
  );
}

async function loadOwnedAddon(id: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/dashboard");
  const supabase = await createClient();
  const { data: addon } = await supabase.from("addons").select("id, owner_id, name, slug, categories, images").eq("id", id).maybeSingle();
  return addon && addon.owner_id === user.id ? addon : null;
}
