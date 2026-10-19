"use client";

import { Loader2, Plus } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategoryPicker } from "./category-picker";
import { addAddon, type ActionState } from "./actions";

export function AddAddonForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(addAddon, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input name="repo" placeholder="username/repo or https://github.com/username/repo" required autoComplete="off" className="h-10 font-mono" />
        <Button type="submit" disabled={pending} className="h-10">
          {pending ? <Loader2 className="animate-spin" /> : <Plus />} Add addon
        </Button>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Categories (optional, up to 3)</summary>
        <CategoryPicker className="mt-3" />
      </details>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="text-sm text-success">{state.ok}</p>}
    </form>
  );
}
