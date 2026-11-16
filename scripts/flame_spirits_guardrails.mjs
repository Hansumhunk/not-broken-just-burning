/**
 * Two additional public, read-only NBJB Flame Spirits.
 * Resource Curator: checks external support links from public pages.
 * Brand Inspector: checks specific public messaging signals.
 * These are deterministic audits, not clinical/legal/editorial judgments.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RESOURCE_PAGES = ["support.html", "resources.html"];
const BRAND_PAGES = ["index.html", "join.html", "flamewalker-plus.html", "movement.html", "support.html"];
const ALLOWED_SUPPORT_HOSTS = new Set(["988lifeline.org", "www.988lifeline.org", "thehotline.org", "www.thehotline.org"]);

const REQUIRED_SIGNALS = {
  "index.html": [
    ["NBJB identity", /Not Broken\s*(?:<[^>]+>\s*)?Just Burning/i],
    ["men-first audience language", /\bmen\b/i],
    ["free access", /\bfree\b/i]
  ],
  "join.html": [
    ["Flamewalker identity", /Flamewalker/i],
    ["free entry", /\bfree\b/i]
  ],
  "flamewalker-plus.html": [
    ["paid tier named", /Flamewalker\+/i],
    ["monthly offer described", /\bmonthly\b/i],
    ["annual offer described", /\bannual\b/i]
  ],
  "movement.html": [
    ["men-first audience language", /\bmen\b/i]
  ],
  "support.html": [
    ["emergency route", /\b911\b/],
    ["crisis route", /\b988\b/],
    ["domestic violence route", /thehotline\.org/i],
    ["scope-of-support boundary", /cannot|not a|not.*diagnos/i]
  ]
};

export function extractExternalLinks(html) {
  const results = [];
  for (const match of html.matchAll(/<a\b[^>]*?\bhref\s*=\s*["'](https:\/\/[^"']+)["'][^>]*>/gi)) {
    try {
      const u = new URL(match[1].replace(/&amp;/g, "&"));
      if (u.username || u.password || u.port || u.hostname === "notbrokenjustburning.com") continue;
      results.push(u.href);
    } catch {
      // An invalid link will be reported by the existing site validator.
    }
  }
  return [...new Set(results)];
}

export function brandSignalFindings(pages) {
  const findings = [];
  for (const [file, checks] of Object.entries(REQUIRED_SIGNALS)) {
    const html = pages[file];
    if (typeof html !== "string") {
      findings.push({ file, signal: "public page available", result: "missing" });
      continue;
    }
    for (const [name, pattern] of checks) {
      if (!pattern.test(html)) findings.push({ file, signal: name, result: "not found" });
    }
  }
  return findings;
}

async function probeOfficialResource(url) {
  for (const method of ["HEAD", "GET"]) {
    try {
      const response = await fetch(url, {
        method,
        redirect: "manual",
        signal: AbortSignal.timeout(6000),
        headers: { "user-agent": "NBJB-FlameSpirits/1.0 (public-reference-check)" }
      });
      if (response.status === 405 && method === "HEAD") continue;
      // A block or a redirect is not proof that a support resource has disappeared.
      if (response.status === 404 || response.status === 410) return "HTTP " + response.status + " — review link against official source";
      if (response.status >= 300 && response.status < 400) return "redirect — review destination when convenient";
      if (response.status === 403 || response.status === 429) return "access restricted — unable to verify";
      if (response.ok) return "responding";
      return "HTTP " + response.status + " — investigate before drawing conclusions";
    } catch {
      return "unverified (network request failed or timed out)";
    }
  }
  return "unverified";
}

export async function resourceSpirit() {
  const lines = ["## 📚 Spirit of the Library — Resource Curator", ""];
  const links = new Set();
  for (const file of RESOURCE_PAGES) {
    const html = fs.readFileSync(path.join(ROOT, file), "utf8");
    for (const url of extractExternalLinks(html)) links.add(url);
  }
  lines.push("External links referenced on public resource and safety pages: **" + links.size + "**.");
  if (!links.size) lines.push("No external resource references were found; human review is advised.");
  for (const url of links) {
    const hostname = new URL(url).hostname.toLowerCase();
    if (!ALLOWED_SUPPORT_HOSTS.has(hostname)) {
      lines.push("- " + hostname + ": new external domain; **manual verification required** (not automatically fetched).");
      continue;
    }
    const result = await probeOfficialResource(url);
    lines.push("- [" + hostname + "](" + url + "): " + result + ".");
  }
  lines.push("Link responses are availability signals only; hotline phone numbers and service policies require periodic verification against the providers' official publications.", "");
  return lines;
}

export async function brandSpirit() {
  const pages = {};
  for (const file of BRAND_PAGES) {
    const p = path.join(ROOT, file);
    if (fs.existsSync(p)) pages[file] = fs.readFileSync(p, "utf8");
  }
  const findings = brandSignalFindings(pages);
  const lines = ["## 🧭 Spirit of Integrity — Brand Consistency", "",
    "Basic public-page positioning and safety indicators checked against the existing NBJB brand commitments."];
  if (!findings.length) lines.push("- " + BRAND_PAGES.length + " public pages checked; all configured messaging signals are present.");
  else for (const item of findings) lines.push("- **Review** " + item.file + ": " + item.signal + " (" + item.result + ").");
  lines.push("This is a narrow signal check, not approval of claims, clinical accuracy, legal compliance, pricing, or individual curriculum manuscripts. No pages edited.", "");
  return lines;
}
