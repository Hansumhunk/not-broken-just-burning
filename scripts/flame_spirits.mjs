/**
 * Flame Spirits Mission Control — public-data, read-only scouts.
 * No customer data, no production changes, no publishing, no outbound outreach.
 * Run: node scripts/flame_spirits.mjs [all|seo|audience|alliance|revenue|security]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://notbrokenjustburning.com";
const SPIRITS = ["seo", "audience", "alliance", "revenue", "security"];
const TOPICS = {
  fatherhood: /\b(dad|dads|father|fathers|fatherhood|parenting|custody|children)\b/i,
  separation: /\b(divorce|separated|separation|breakup|betrayal|relationship)\b/i,
  rebuilding: /\b(rebuild|identity|purpose|loneliness|alone|starting over|direction)\b/i,
  boundaries: /\b(boundaries|boundary|anger|conflict|respect|trust|communication)\b/i,
  resilience: /\b(grief|stress|shame|trauma|burnout|coping|mental health)\b/i
};
const FEEDS = [
  { name: "Daddit", url: "https://www.reddit.com/r/daddit/.rss" },
  { name: "MensLib", url: "https://www.reddit.com/r/MensLib/.rss" }
];
const ALLIES = [
  { name: "National Fatherhood Initiative", url: "https://www.fatherhood.org/" },
  { name: "Fathers Incorporated", url: "https://fathersincorporated.com/" },
  { name: "Men's Health Network", url: "https://menshealthnetwork.org/" }
];

export function sitemapUrls(xml) {
  return [...xml.matchAll(/<loc>\s*(https:\/\/[^<\s]+)\s*<\/loc>/gi)].map(m => m[1].trim());
}
export function htmlTitle(html) {
  return html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() ?? "";
}
export function metaDescription(html) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const tag = tags.find(t => /\bname\s*=\s*["']description["']/i.test(t));
  return tag?.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1] ?? "";
}
export function robotsNoindex(html) {
  return (html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)?.[0] ?? "").toLowerCase().includes("noindex");
}
export function countThemes(titles) {
  const results = Object.fromEntries(Object.keys(TOPICS).map(k => [k, 0]));
  for (const title of titles) for (const [key, pattern] of Object.entries(TOPICS)) {
    if (pattern.test(title)) results[key]++;
  }
  return results;
}
function markdownSafe(value) {
  return String(value).replace(/[|[\]\r\n]/g, " ").replace(/[\`]/g, "'").slice(0, 180);
}
async function getPublic(url, timeout = 9500) {
  try {
    if (!url.startsWith("https://")) throw new Error("HTTPS is required");
    const response = await fetch(url, {
      headers: { "user-agent": "NBJB-FlameSpirits/1.0 (read-only weekly research)" },
      signal: AbortSignal.timeout(timeout),
      redirect: "follow"
    });
    const text = (await response.text()).slice(0, 250000);
    return { ok: response.ok, status: response.status, text, url: response.url };
  } catch (e) {
    return { ok: false, status: "unavailable", text: "", note: e.name === "TimeoutError" ? "timed out" : "request could not be completed" };
  }
}
async function seo() {
  const lines = ["## 🔎 Spirit of Sight — SEO", ""];
  const map = await getPublic(BASE + "/sitemap.xml");
  if (!map.ok) return [...lines, "Sitemap check unavailable. No search rankings inferred.", ""];
  const urls = sitemapUrls(map.text).filter(u => u.startsWith(BASE + "/"));
  lines.push("Sitemap entries discovered: **" + urls.length + "**.");
  const sampled = [BASE + "/", ...urls.filter(u => u !== BASE + "/").slice(0, 9)];
  let flagged = 0;
  for (const url of sampled) {
    const result = await getPublic(url);
    const issues = [];
    if (!result.ok) issues.push("HTTP " + result.status);
    else {
      if (!htmlTitle(result.text)) issues.push("missing title");
      if (!metaDescription(result.text)) issues.push("missing description");
      if (robotsNoindex(result.text)) issues.push("noindex in sitemap");
    }
    if (issues.length) {
      flagged++;
      lines.push("- " + markdownSafe(url.replace(BASE, "" ) || "/") + ": " + issues.join(", "));
    }
  }
  if (!flagged) lines.push("- Sampled " + sampled.length + " public sitemap routes; no basic title/description/noindex issues found.");
  lines.push("**Scope:** public site audit, not verified Google rankings or Search Console impressions.", "");
  return lines;
}
function entriesFromAtom(xml) {
  return [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].slice(0, 25).map(m =>
    m[0].match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]
      ?.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").trim() ?? ""
  ).filter(Boolean);
}
async function audience() {
  const lines = ["## 👂 Spirit of Listening — Audience Questions", "",
    "Aggregate topic signals from public community feeds. Individual posts, authors and stories are not reproduced."];
  const totals = Object.fromEntries(Object.keys(TOPICS).map(k => [k, 0]));
  let observations = 0, available = 0;
  for (const feed of FEEDS) {
    const r = await getPublic(feed.url);
    if (!r.ok || !r.text.includes("<entry")) {
      lines.push("- " + feed.name + ": unavailable or blocked; no audience findings inferred.");
      continue;
    }
    const titles = entriesFromAtom(r.text);
    available++; observations += titles.length;
    const counts = countThemes(titles);
    for (const key of Object.keys(totals)) totals[key] += counts[key];
    lines.push("- " + feed.name + ": " + titles.length + " public headings considered.");
  }
  if (available) {
    const ranked = Object.entries(totals).sort((a,b) => b[1]-a[1]);
    lines.push("- Theme frequency in sampled headings: " + ranked.map(([k,v]) => k + " (" + v + ")").join(", ") + ".");
    lines.push("- Suggested next action: write an original educational brief addressing the highest-frequency theme; verify context before asserting an audience trend.");
  } else lines.push("- No public feed data available. Research is **unverified**, not a zero-interest finding.");
  lines.push("Sample size: " + observations + " titles. This is a topic signal, not a representative survey.", "");
  return lines;
}
async function alliance() {
  const lines = ["## 🤝 Spirit of Alliance — Partnership Research", "",
    "The following public organizations are **research leads only**; availability is not endorsement or an agreement."];
  for (const a of ALLIES) {
    const r = await getPublic(a.url);
    lines.push("- [" + markdownSafe(a.name) + "](" + a.url + "): " +
      (r.ok ? "official public site responding; founder to review mission fit and contact route" : "site check unavailable; re-verify before outreach") + ".");
  }
  lines.push("No messages sent and no partnerships initiated.", "");
  return lines;
}
async function revenue() {
  return ["## 💰 Spirit of the Ledger — Revenue", "",
    "**On hold in this public repository.** Live Stripe financial details must not be written to public GitHub logs or artifacts.",
    "Existing private, read-only Stripe reports through connected ChatGPT tools remain separate. A private runner or secure reporting sink can be added after founder approval.", ""];
}
async function security() {
  const lines = ["## 🛡️ Spirit of the Guard — Repository Security", ""];
  const dir = path.join(ROOT, ".github", "workflows");
  if (!fs.existsSync(dir)) return [...lines, "Workflow directory unavailable.", ""];
  const workflowNames = fs.readdirSync(dir).filter(x => /\.ya?ml$/i.test(x));
  const flags = [];
  for (const name of workflowNames) {
    const yaml = fs.readFileSync(path.join(dir, name), "utf8");
    if (/pull_request_target\s*:/i.test(yaml)) flags.push(name + ": pull_request_target requires careful review");
    if (/permissions\s*:\s*write-all\b/i.test(yaml)) flags.push(name + ": broad write-all permissions");
  }
  lines.push("Read-only check of " + workflowNames.length + " workflow files.");
  if (flags.length) for (const f of flags) lines.push("- Review: " + markdownSafe(f));
  else lines.push("- No obvious pull_request_target or write-all patterns found.");
  lines.push("**Scope:** workflow configuration hygiene only. This does not replace Dependabot, secret scanning, or Supabase security advisors.", "");
  return lines;
}
async function main() {
  const selected = (process.argv[2] || "all").toLowerCase();
  if (selected !== "all" && !SPIRITS.includes(selected)) {
    process.stderr.write("Unknown spirit. Use: " + ["all", ...SPIRITS].join(", ") + "\n");
    process.exitCode = 2; return;
  }
  const tasks = { seo, audience, alliance, revenue, security };
  const names = selected === "all" ? SPIRITS : [selected];
  const out = ["# 🔥 Flame Spirits — NBJB Mission Control", "",
    "Generated: " + new Date().toISOString(), "",
    "Read-only research and operational checks. Founder approval required for all external actions.", ""];
  for (const name of names) {
    try { out.push(...await tasks[name]()); }
    catch (e) { out.push("## " + name + "\n", "Check failed: " + markdownSafe(e.message) + "\n"); process.exitCode = 1; }
  }
  const report = out.join("\n");
  process.stdout.write(report + "\n");
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + "\n");
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
