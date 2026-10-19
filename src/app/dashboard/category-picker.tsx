import { CATEGORIES } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CategoryPicker({ selected = [], className }: { selected?: string[]; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {CATEGORIES.map((c) => (
        <label
          key={c}
          className="cursor-pointer rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors has-checked:border-primary/50 has-checked:bg-primary/10 has-checked:text-primary"
        >
          <input type="checkbox" name="categories" value={c} defaultChecked={selected.includes(c)} className="sr-only" />
          {c}
        </label>
      ))}
    </div>
  );
}
