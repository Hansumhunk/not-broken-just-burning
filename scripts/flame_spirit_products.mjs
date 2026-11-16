/**
 * NBJB #16 — Spirit of the Forge: ethical digital-product opportunity research.
 * Read-only, public inputs; no AI API, customer data, purchases or publications.
 * Distinguishes existing site coverage, public community topics, and catalog supply.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COMMUNITY_FEEDS = Object.freeze([
  { name: "Daddit", url: "https://www.reddit.com/r/daddit/.rss" },
  { name: "MensLib", url: "https://www.reddit.com/r/MensLib/.rss" }
]);
export const PRODUCT_CONCEPTS = Object.freeze([
  {
    id: "boundaries", title: "Boundary Builder Action Workbook",
    format: "Short printable workbook + scripts and practice prompts",
    focus: /\b(boundar(?:y|ies)|assertiveness|say no|conflict)\b/i,
    localSignals: /\b(boundar(?:y|ies)|Boundary Builder)\b/i,
    paths: ["resources.html", "lessons.html"],
    query: "setting boundaries workbook",
    prototype: "One-page boundary statement builder with a real-life practice example."
  },
  {
    id: "clarity", title: "Clarity Under Pressure Reflection Journal",
    format: "Guided printable journal with facts / assumptions / next-action prompts",
    focus: /\b(overwhelm|overwhelmed|confus(?:ed|ion)|clarity|stress|anxiety|ruminat(?:e|ion)|uncertain)\b/i,
    localSignals: /\b(facts|assumptions|The Forge|Pattern Map|clarity)\b/i,
    paths: ["resources.html", "lessons.html"],
    query: "guided journal stress clarity",
    prototype: "Three-day facts-versus-interpretations worksheet with one actionable step per day."
  },
  {
    id: "fatherhood", title: "Fatherhood Under Pressure Planning Kit",
    format: "Planning checklist and guided check-in cards",
    focus: /\b(father(?:hood)?|dad|dads|parent(?:s|ing)|coparent(?:ing)?|custody|child(?:ren)?|son|daughter)\b/i,
    localSignals: /\b(father(?:hood)?|dad|child|parent|guardian)\b/i,
    paths: ["index.html", "lessons.html"],
    query: "fatherhood parenting workbook",
    prototype: "A weekly presence-and-communication planner centered on actions a father controls."
  },
  {
    id: "rebuilding", title: "Rebuilding Self-Trust Field Guide",
    format: "Practical educational guide and small-step reflection exercises",
    focus: /\b(betrayal|trust|identity|shame|breakup|divorce|lonel(?:y|iness)|rebuild(?:ing)?)\b/i,
    localSignals: /\b(betrayal|self.trust|identity|rebuild|shame)\b/i,
    paths: ["lessons.html", "books-projects.html"],
    query: "self trust rebuilding journal",
    prototype: "A seven-question self-trust audit and boundary-to-action worksheet."
  }
]);
const FORMAT_REQUEST = /\b(?:recommend|looking for|need|suggest|any good|where (?:can|to)|help finding)\b.{0,90}\b(?:workbook|journal|worksheet|checklist|guide|template|printable|course)\b|\b(?:workbook|journal|worksheet|checklist|guide|template|printable|course)\b.{0,60}\b(?:recommend|suggest|looking for|help)\b/i;

function cleanTitle(text) {
  return text.replace(/<[^>]+>/g, " ").replace(/&#(\d+);/g, (_,n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim().slice(0, 240);
}
function safeText(text) {
  return String(text).replace(/[\r\n|[\]]/g, " ").replace(/[\`]/g, "'").slice(0, 130);
}

export function extractDiscussionTitles(xml) {
  if (typeof xml !== "string") return [];
  const entries = [...xml.matchAll(/<(entry|item)\b[^>]*>[\s\S]*?<\/\1>/gi)];
  return entries.slice(0, 30).map(e =>
    cleanTitle(e[0].match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "")
  ).filter(Boolean);
}

export function communitySignals(titles, concepts = PRODUCT_CONCEPTS) {
  return concepts.map(concept => ({
    id: concept.id,
    topicalTitles: titles.filter(title => concept.focus.test(title)).length,
    explicitToolRequests: titles.filter(title => concept.focus.test(title) && FORMAT_REQUEST.test(title)).length
  }));
}

export function localCoverage(readFile, concepts = PRODUCT_CONCEPTS) {
  return concepts.map(concept => {
    const matchedPaths = [];
    for (const p of concept.paths) {
      const text = readFile(p);
      if (typeof text === "string" && concept.localSignals.test(text)) matchedPaths.push(p);
    }
    return { id: concept.id, matchedPaths };
  });
}

export function catalogSummary(payload) {
  const docs = Array.isArray(payload?.docs) ? payload.docs : [];
  const count = Number.isFinite(Number(payload?.numFound ?? payload?.num_found)) ?
    Math.max(0, Number(payload.numFound ?? payload.num_found)) : null;
  return { fuzzyMatches: count, sampleTitles: docs.slice(0, 2).map(doc => safeText(doc.title ?? "")).filter(Boolean) };
}

export function rankProductIdeas(coverage, signals, sourcesAvailable, concepts = PRODUCT_CONCEPTS) {
  const coverageMap = new Map(coverage.map(c => [c.id, c]));
  const signalMap = new Map(signals.map(s => [s.id, s]));
  return concepts.map(c => {
    const local = coverageMap.get(c.id) ?? { matchedPaths: [] };
    const observed = signalMap.get(c.id) ?? { topicalTitles: 0, explicitToolRequests: 0 };
    // Exploration priority only, NOT an estimate of sales demand.
    const priority = local.matchedPaths.length * 3 +
      (sourcesAvailable ? Math.min(observed.topicalTitles, 4) : 0) +
      (sourcesAvailable ? Math.min(observed.explicitToolRequests, 2) * 2 : 0);
    const evidence = sourcesAvailable && observed.explicitToolRequests > 0
      ? "Public tool-seeking topic signal; purchasing intent still unverified"
      : sourcesAvailable && observed.topicalTitles > 0
        ? "Public topic discussion only; product demand unverified"
        : "NBJB-aligned hypothesis only; audience signal unverified or not observed";
    return { ...c, priority, matchedPaths: local.matchedPaths,
      topicalTitles: observed.topicalTitles, explicitToolRequests: observed.explicitToolRequests, evidence };
  }).sort((a,b) => b.priority-a.priority || a.title.localeCompare(b.title));
}

async function fetchPublic(url, timeout = 7500) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || !["openlibrary.org","www.reddit.com"].includes(u.hostname)) {
      return { ok:false, status:"not allowlisted" };
    }
    const res = await fetch(url, {
      headers: { "user-agent": "NotBrokenJustBurning-FlameSpirits/1.0 (notbrokenjustburning@gmail.com)" },
      signal: AbortSignal.timeout(timeout)
    });
    if (!res.ok) return { ok:false, status:"HTTP " + res.status };
    const raw = await res.text();
    if (raw.length > 500000) return { ok:false, status:"response too large" };
    return { ok:true, raw };
  } catch {
    return { ok:false, status:"unavailable or timed out" };
  }
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function productSpirit({ request = fetchPublic, sleepFn = sleep } = {}) {
  const lines = [
    "## 🛠️ Spirit of the Forge — Digital Product Opportunity Scout (#16)", "",
    "A research queue, **not** evidence of sales, price acceptance, or permission to launch a product.", ""
  ];
  const coverage = localCoverage(p => {
    const file = path.join(ROOT,p);
    return fs.existsSync(file) ? fs.readFileSync(file,"utf8") : null;
  });
  const publicTitles = [];
  let feedsAvailable = 0;
  for (const feed of COMMUNITY_FEEDS) {
    const result = await request(feed.url);
    if (result.ok && /<(?:entry|item)\b/i.test(result.raw)) {
      const titles = extractDiscussionTitles(result.raw);
      feedsAvailable++;
      publicTitles.push(...titles);
      lines.push("- Public topic sample, " + feed.name + ": " + titles.length + " headings aggregated.");
    } else lines.push("- Public topic sample, " + feed.name + ": **unverified** (feed restricted or unavailable).");
  }
  lines.push("No authors, accounts, quotes, posts, or private community details are stored or published.");
  const signals = communitySignals(publicTitles);
  const ranked = rankProductIdeas(coverage, signals, feedsAvailable > 0);
  lines.push("");
  const signalMap = new Map(signals.map(s => [s.id,s]));
  const catalog = new Map();
  // One respectful, small public metadata query per concept. Open Library is
  // bibliographic SUPPLY, not purchase/demand evidence. 1+ second between calls.
  for (let i=0; i<PRODUCT_CONCEPTS.length; i++) {
    const c = PRODUCT_CONCEPTS[i];
    if (i) await sleepFn(1150);
    const query = new URL("https://openlibrary.org/search.json");
    query.searchParams.set("q",c.query);
    query.searchParams.set("fields","key,title,first_publish_year");
    query.searchParams.set("limit","3");
    const res = await request(query.href);
    if (!res.ok) {
      catalog.set(c.id, { status:"unverified ("+res.status+")", url:query.href });
      continue;
    }
    try {
      const d = catalogSummary(JSON.parse(res.raw));
      catalog.set(c.id, { status: d.fuzzyMatches===null?"count unavailable":d.fuzzyMatches+" fuzzy catalog matches",
        examples:d.sampleTitles, url:query.href });
    } catch {
      catalog.set(c.id, { status:"unverified (unreadable catalog response)", url:query.href });
    }
  }
  for (const [index,idea] of ranked.entries()) {
    const signal = signalMap.get(idea.id);
    const book = catalog.get(idea.id);
    lines.push("### " + (index+1) + ". " + idea.title);
    lines.push("- Format: " + idea.format);
    lines.push("- Current NBJB public foundation: " + (idea.matchedPaths.length ? idea.matchedPaths.map(p=>"\`"+p+"\`").join(", ") : "no public-page match identified"));
    lines.push("- Public topics: " + (feedsAvailable ? signal.topicalTitles+" matching headings, including "+signal.explicitToolRequests+" apparent tool-seeking headings" : "unverified (all community feeds unavailable)"));
    lines.push("- Adjacent book listings: [" + safeText(book.status) + "](" + book.url + ") — broad supply signal **only**.");
    lines.push("- Evidence: " + idea.evidence + ".");
    lines.push("- Minimum useful validation: " + idea.prototype);
    lines.push("");
  }
  lines.push("**Recommended decision:** Review the top concept for a small free prototype and opt-in feedback test before considering any price or paid launch. Existing NBJB manuscript status and founder editorial approvals remain unchanged.");
  lines.push("**Source limits:** public RSS headings are an unrepresentative topical sample; Open Library search matches are fuzzy bibliographic entries and say nothing about purchases, pricing, conversion, or commercial competition. If a source is unavailable, do not turn missing data into zero demand.");
  lines.push("**Founder gates:** no product creation, sales page, checkout, pricing edits, paid ads, contact collection, outreach, private manuscript access, videos, or publication.", "");
  return lines;
}
