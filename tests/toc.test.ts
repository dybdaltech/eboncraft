import assert from "node:assert/strict";
import { test } from "node:test";
import { flavorsForInterfaces, formatInterface, parseToc, pickTocPaths } from "../src/lib/toc.ts";
import { parseRepoInput } from "../src/lib/utils.ts";

test("parses multi-version Interface lines and metadata", () => {
  const toc = parseToc(
    ["## Interface: 110002, 40400, 11505", "## Title: |cff00ff00My|r Addon", "## Version: @project-version@", "## X-Category: Unit Frames", "Core.lua"].join("\r\n"),
  );
  assert.deepEqual(toc.interfaces, [110002, 40400, 11505]);
  assert.equal(toc.title, "My Addon");
  assert.equal(toc.category, "Unit Frames");
  assert.deepEqual(flavorsForInterfaces(toc.interfaces), ["retail", "cata", "classic"]);
});

test("reads per-client Interface keys", () => {
  const toc = parseToc("## Interface-Retail: 120000\n## Interface-Mists: 50500\n## Interface-Vanilla: 11507");
  assert.deepEqual(flavorsForInterfaces(toc.interfaces), ["retail", "mists", "classic"]);
});

test("formats interface numbers", () => {
  assert.equal(formatInterface(110002), "11.0.2");
  assert.equal(formatInterface(11505), "1.15.5");
});

test("prefers root .toc files", () => {
  assert.deepEqual(pickTocPaths(["A.toc", "A_Cata.toc", "libs/x/x.toc", "README.md"]), ["A.toc", "A_Cata.toc"]);
  assert.deepEqual(pickTocPaths(["Addon/Addon.toc", "Addon/libs/L/L.toc"]), ["Addon/Addon.toc"]);
});

test("parses repo input", () => {
  assert.deepEqual(parseRepoInput("https://github.com/WeakAuras/WeakAuras2.git"), { owner: "WeakAuras", repo: "WeakAuras2" });
  assert.deepEqual(parseRepoInput("tukui-org/ElvUI/tree/main"), { owner: "tukui-org", repo: "ElvUI" });
  assert.equal(parseRepoInput("not a repo"), null);
});
