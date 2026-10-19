"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type ActionState, updateAddon } from "../actions";
import { CategoryPicker } from "../category-picker";

export function EditAddonForm({ id, categories, images }: { id: string; categories: string[]; images: string[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateAddon.bind(null, id), undefined);
  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Label>Categories (up to 3)</Label>
        <CategoryPicker selected={categories} />
      </div>
      <div className="flex flex-col gap-3">
        <Label htmlFor="images">Screenshot URLs</Label>
        <Textarea id="images" name="images" rows={5} defaultValue={images.join("\n")} className="font-mono text-xs" placeholder="https://..." />
        <p className="text-xs text-muted-foreground">One https URL per line. The first one is the thumbnail on the browse page.</p>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          Save
        </Button>
        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        {state?.ok && <p className="text-sm text-success">{state.ok}</p>}
      </div>
    </form>
  );
}
