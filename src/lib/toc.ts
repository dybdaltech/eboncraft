import type { Flavor } from "@/lib/types";

export const FLAVOR_LABELS: Record<Flavor, string> = {
  retail: "Retail",
  mists: "Mists Classic",
  cata: "Cataclysm Classic",
  wrath: "Wrath Classic",
  tbc: "TBC Classic",
  classic: "Classic Era",
};

/** Order used when listing flavors: retail first, then classic clients newest to oldest. */
export const FLAVOR_ORDER: Flavor[] = ["retail", "mists", "cata", "wrath", "tbc", "classic"];

function stripColorCodes(value: string): string {
  // WoW color escapes: |cAARRGGBB ... |r
  return value.replace(/\|c[0-9a-fA-F]{8}/g, "").replace(/\|r/g, "").trim();
}

export type TocInfo = {
  interfaces: number[];
  title?: string;
  notes?: string;
  version?: string;
  author?: string;
  category?: string;
};

/** Parses the `## Key: Value` metadata of a .toc file. */
export function parseToc(source: string): TocInfo {
  const info: TocInfo = { interfaces: [] };
  for (const raw of source.split(/\r?\n/)) {
    const match = raw.match(/^##\s*([\w-]+)\s*:\s*(.*?)\s*$/);
    if (!match) continue;
    const key = match[1].toLowerCase();
    const value = match[2];
    if (key === "interface" || key.startsWith("interface-")) {
      for (const part of value.split(",")) {
        const n = Number.parseInt(part.trim(), 10);
        if (Number.isFinite(n) && n > 0) info.interfaces.push(n);
      }
    } else if (key === "title" && !info.title) {
      info.title = stripColorCodes(value);
    } else if (key === "notes" && !info.notes) {
      info.notes = stripColorCodes(value);
    } else if (key === "version" && !info.version) {
      info.version = value;
    } else if (key === "author" && !info.author) {
      info.author = value;
    } else if ((key === "x-category" || key === "category") && !info.category) {
      info.category = value;
    }
  }
  return info;
}

/** Maps an Interface number (e.g. 110002 for 11.0.2) to the game client it targets. */
export function flavorForInterface(n: number): Flavor | null {
  const major = Math.floor(n / 10000);
  switch (major) {
    case 0:
      return null;
    case 1:
      return "classic";
    case 2:
      return "tbc";
    case 3:
      return "wrath";
    case 4:
      return "cata";
    case 5:
      return "mists";
    default:
      return "retail";
  }
}

/** Formats 110002 as "11.0.2". */
export function formatInterface(n: number): string {
  const major = Math.floor(n / 10000);
  const minor = Math.floor((n % 10000) / 100);
  const patch = n % 100;
  return `${major}.${minor}.${patch}`;
}

export function flavorsForInterfaces(interfaces: number[]): Flavor[] {
  const set = new Set<Flavor>();
  for (const n of interfaces) {
    const flavor = flavorForInterface(n);
    if (flavor) set.add(flavor);
  }
  return FLAVOR_ORDER.filter((f) => set.has(f));
}

/** Keeps .toc files at the repo root or one folder deep, the layouts WoW addon repos use. */
export function pickTocPaths(paths: string[]): string[] {
  const tocs = paths.filter((p) => p.toLowerCase().endsWith(".toc") && p.split("/").length <= 2);
  const root = tocs.filter((p) => !p.includes("/"));
  return (root.length ? root : tocs).slice(0, 10);
}
