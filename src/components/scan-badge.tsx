import { ShieldAlert, ShieldCheck, ShieldEllipsis, ShieldQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Addon } from "@/lib/types";
import { virusTotalUrl } from "@/lib/virustotal";

type Props = Pick<Addon, "vt_status" | "vt_sha256" | "vt_malicious" | "vt_suspicious"> & { compact?: boolean };

/** VirusTotal result for the current release download. */
export function ScanBadge({ vt_status, vt_sha256, vt_malicious, vt_suspicious, compact }: Props) {
  let badge: React.ReactNode;
  switch (vt_status) {
    case "clean":
      badge = (
        <Badge variant="success" title={vt_suspicious ? `${vt_suspicious} engine(s) marked it suspicious` : "No engine flagged this file"}>
          <ShieldCheck /> Clean
        </Badge>
      );
      break;
    case "flagged":
      badge = (
        <Badge variant="destructive">
          <ShieldAlert /> {compact ? "Flagged" : `Flagged by ${vt_malicious} engine${vt_malicious === 1 ? "" : "s"}`}
        </Badge>
      );
      break;
    case "pending":
      badge = (
        <Badge variant="warning">
          <ShieldEllipsis /> Scanning
        </Badge>
      );
      break;
    default:
      if (compact) return null;
      badge = (
        <Badge variant="outline" className="text-muted-foreground">
          <ShieldQuestion /> {vt_status === "too_large" ? "Too large to scan" : "Not scanned"}
        </Badge>
      );
  }
  if (compact || !vt_sha256) return badge;
  return (
    <a href={virusTotalUrl(vt_sha256)} target="_blank" rel="noopener noreferrer" title="View the VirusTotal report">
      {badge}
    </a>
  );
}
