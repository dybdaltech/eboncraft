"use client";

import { Loader2, Pencil, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteAddon, resyncAddon } from "./actions";

export function AddonRowActions({ id, name }: { id: string; name: string }) {
  const [syncing, startSync] = useTransition();
  const [deleting, startDelete] = useTransition();
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" title="Sync from GitHub now" disabled={syncing} onClick={() => startSync(() => resyncAddon(id))}>
        {syncing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
      </Button>
      <Button variant="ghost" size="icon" title="Edit categories and screenshots" asChild>
        <Link href={`/dashboard/${id}`}>
          <Pencil />
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title="Remove from Eboncraft"
        disabled={deleting}
        className="hover:text-destructive"
        onClick={() => {
          if (window.confirm(`Remove ${name} from Eboncraft? Your GitHub repository is not touched.`)) startDelete(() => deleteAddon(id));
        }}
      >
        {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
      </Button>
    </div>
  );
}
