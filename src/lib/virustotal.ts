import { serverEnv } from "@/lib/env";
import type { VtStatus } from "@/lib/types";

const API = "https://www.virustotal.com/api/v3";
/** VirusTotal's direct-upload limit. Bigger files would need the upload_url flow. */
const MAX_UPLOAD_BYTES = 32 * 1024 * 1024;

export type ScanResult = {
  vt_status: VtStatus;
  vt_sha256: string | null;
  vt_malicious: number | null;
  vt_suspicious: number | null;
  vt_checked_at: string;
};

export function isVirusTotalEnabled() {
  return Boolean(serverEnv("VIRUSTOTAL_API_KEY"));
}

export function virusTotalUrl(sha256: string) {
  return `https://www.virustotal.com/gui/file/${sha256}`;
}

function result(status: VtStatus, sha256: string | null, stats?: { malicious: number; suspicious: number }): ScanResult {
  return {
    vt_status: status,
    vt_sha256: sha256,
    vt_malicious: stats?.malicious ?? null,
    vt_suspicious: stats?.suspicious ?? null,
    vt_checked_at: new Date().toISOString(),
  };
}

type FileReport = {
  data: {
    attributes: {
      last_analysis_date?: number;
      last_analysis_stats?: { malicious: number; suspicious: number; undetected: number; harmless: number };
    };
  };
};

/** Looks up an existing report by hash. Returns null when VirusTotal has never seen the file. */
export async function checkFile(sha256: string): Promise<ScanResult | null> {
  const key = serverEnv("VIRUSTOTAL_API_KEY");
  if (!key) return null;
  const res = await fetch(`${API}/files/${sha256}`, { headers: { "x-apikey": key } });
  if (res.status === 404) return null;
  if (!res.ok) return result("error", sha256);
  const report = (await res.json()) as FileReport;
  const stats = report.data.attributes.last_analysis_stats;
  if (!report.data.attributes.last_analysis_date || !stats) return result("pending", sha256);
  return result(stats.malicious > 0 ? "flagged" : "clean", sha256, stats);
}

async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Downloads the release payload, looks it up on VirusTotal by SHA-256 and uploads it when it is new.
 * A fresh upload comes back as "pending"; the next sync picks up the finished report.
 */
export async function scanDownload(downloadUrl: string, knownSize?: number | null): Promise<ScanResult | null> {
  const key = serverEnv("VIRUSTOTAL_API_KEY");
  if (!key) return null;
  if (knownSize && knownSize > MAX_UPLOAD_BYTES) return result("too_large", null);

  const download = await fetch(downloadUrl, { headers: { "User-Agent": "eboncraft.dev" }, redirect: "follow" });
  if (!download.ok) return result("error", null);
  const data = await download.arrayBuffer();
  if (data.byteLength > MAX_UPLOAD_BYTES) return result("too_large", null);

  const sha256 = await sha256Hex(data);
  const existing = await checkFile(sha256);
  if (existing) return existing;

  const form = new FormData();
  form.append("file", new Blob([data]), downloadUrl.split("/").pop() || "addon.zip");
  const upload = await fetch(`${API}/files`, { method: "POST", headers: { "x-apikey": key }, body: form });
  return result(upload.ok ? "pending" : "error", sha256);
}
