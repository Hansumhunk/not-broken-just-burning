import test from "node:test";
import assert from "node:assert/strict";
import {
  extractDiscussionTitles,
  communitySignals,
  localCoverage,
  catalogSummary,
  rankProductIdeas,
  productSpirit,
  PRODUCT_CONCEPTS
} from "./flame_spirit_products.mjs";

test("reads public Atom/RSS headings without returning author or body data", () => {
  const xml = '<feed><entry><title>Any good journal for divorce?</title><author><name>Private Person</name></author><content>private experience</content></entry><item><title>Need boundary workbook for conflict</title><description>private detail</description></item></feed>';
  assert.deepEqual(extractDiscussionTitles(xml), ["Any good journal for divorce?", "Need boundary workbook for conflict"]);
});

test("counts topical discussions separately from explicit tool requests", () => {
  const signals = communitySignals([
    "Any good journal for divorce?",
    "Need boundary workbook for conflict",
    "How to be a more present dad?"
  ]);
  const byId = Object.fromEntries(signals.map(s => [s.id,s]));
  assert.equal(byId.boundaries.topicalTitles, 1);
  assert.equal(byId.boundaries.explicitToolRequests, 1);
  assert.equal(byId.fatherhood.topicalTitles, 1);
  assert.equal(byId.fatherhood.explicitToolRequests, 0);
  assert.equal(byId.rebuilding.explicitToolRequests, 1);
});

test("finds existing NBJB public-page foundations without protected lesson data", () => {
  const coverage = localCoverage(path => {
    if (path === "resources.html") return "Boundary Builder and Pattern Map for clarifying facts.";
    if (path === "index.html") return "Fatherhood under pressure";
    if (path === "lessons.html") return "Rebuild self-trust and clarity";
    return null;
  });
  const byId = Object.fromEntries(coverage.map(x=>[x.id,x]));
  assert.ok(byId.boundaries.matchedPaths.includes("resources.html"));
  assert.ok(byId.fatherhood.matchedPaths.includes("index.html"));
  assert.ok(byId.rebuilding.matchedPaths.includes("lessons.html"));
});

test("tolerates documented Open Library count variants and unusable responses", () => {
  assert.deepEqual(catalogSummary({numFound: 12,docs:[{title:"Workbook A"},{title:"Journal B"}]}),{
    fuzzyMatches:12,sampleTitles:["Workbook A","Journal B"]
  });
  assert.equal(catalogSummary({num_found:0,docs:[]}).fuzzyMatches,0);
  assert.equal(catalogSummary({docs:[]}).fuzzyMatches,null);
});

test("ranks internal fit with honest unverified labels when feeds are blocked", () => {
  const coverage = localCoverage(() => "No relevant terms on this page");
  const signals = communitySignals([]);
  const ranked = rankProductIdeas(coverage,signals,false);
  assert.equal(ranked.length,PRODUCT_CONCEPTS.length);
  assert.ok(ranked.every(x=>/unverified|hypothesis/i.test(x.evidence)));
  assert.ok(ranked.every(x=>x.priority>=0));
});

test("end-to-end report uses public aggregates and does not disclose a user story", async () => {
  let requests = 0;
  const request = async url => {
    requests++;
    if (url.includes("reddit.com")) return {ok:true,raw:'<feed><entry><title>Need a boundary workbook for a tough conversation</title><author><name>DoNotRevealThisName</name></author><content>PrivateStoryDoNotReveal</content></entry></feed>'};
    if (url.includes("openlibrary.org")) return {ok:true,raw:JSON.stringify({numFound:4,docs:[{title:"Book A"}]})};
    throw new Error("Unexpected external request");
  };
  const report = (await productSpirit({request,sleepFn:async()=>{}})).join("\n");
  assert.equal(requests,2+PRODUCT_CONCEPTS.length);
  assert.match(report,/Boundary Builder Action Workbook/);
  assert.match(report,/Open Library|book listings|catalog matches/i);
  assert.match(report,/purchasing intent still unverified/);
  assert.doesNotMatch(report,/DoNotRevealThisName|PrivateStoryDoNotReveal/);
  assert.doesNotMatch(report,/automatically launch|guaranteed sales/i);
  assert.match(report,/Founder gates/);
});

test("missing public sources never masquerade as zero product demand", async () => {
  const request=async()=>({ok:false,status:"unavailable"});
  const report=(await productSpirit({request,sleepFn:async()=>{}})).join("\n");
  assert.match(report,/all community feeds unavailable/);
  assert.match(report,/unverified/);
  assert.doesNotMatch(report,/(?:there is|shows|means)\s+(?:no|zero)\s+demand/i);
});
