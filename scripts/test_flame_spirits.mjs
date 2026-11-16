import test from "node:test";
import assert from "node:assert/strict";
import { sitemapUrls, htmlTitle, metaDescription, robotsNoindex, countThemes } from "./flame_spirits.mjs";

test("SEO extracts only HTTPS loc entries", () => {
  assert.deepEqual(
    sitemapUrls("<urlset><loc>https://example.com/a</loc><loc>http://example.com/b</loc></urlset>"),
    ["https://example.com/a"]
  );
});
test("basic SEO document metadata", () => {
  const html = '<html><head><title>Example Title</title><meta name="description" content="A real description"></head></html>';
  assert.equal(htmlTitle(html), "Example Title");
  assert.equal(metaDescription(html), "A real description");
  assert.equal(robotsNoindex(html), false);
  assert.equal(robotsNoindex('<meta name="robots" content="noindex,follow">'), true);
});
test("audience signal aggregation stores counts, not identities", () => {
  const themes = countThemes(["Dad asking about parenting", "Divorce and boundaries", "Learning purpose after grief"]);
  assert.equal(themes.fatherhood, 1);
  assert.equal(themes.separation, 1);
  assert.equal(themes.boundaries, 1);
  assert.equal(themes.rebuilding, 1);
  assert.equal(themes.resilience, 1);
});

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const enginePath = fileURLToPath(new URL("./flame_spirits.mjs", import.meta.url));

test("Ledger Spirit stays off the public financial network", () => {
  const result = spawnSync(process.execPath, [enginePath, "revenue"], {
    encoding: "utf8", env: { ...process.env, GITHUB_STEP_SUMMARY: "" }
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /On hold in this public repository/);
});

test("Guard Spirit completes its local read-only workflow scan", () => {
  const result = spawnSync(process.execPath, [enginePath, "security"], {
    encoding: "utf8", env: { ...process.env, GITHUB_STEP_SUMMARY: "" }
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /workflow files/);
});

test("Rejects unexpected spirit names", () => {
  const result = spawnSync(process.execPath, [enginePath, "unknown"], {
    encoding: "utf8", env: { ...process.env, GITHUB_STEP_SUMMARY: "" }
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Unknown spirit/);
});

import { extractExternalLinks, brandSignalFindings } from "./flame_spirits_guardrails.mjs";

test("Resource Curator extracts links from anchors without collecting social/identity data", () => {
  const html = '<a href="https://988lifeline.org/">help</a><a href="https://www.thehotline.org/get-help/">hotline</a><link href="https://fonts.googleapis.com/css">';
  assert.deepEqual(extractExternalLinks(html), ["https://988lifeline.org/", "https://www.thehotline.org/get-help/"]);
});

test("Brand Inspector detects missing public messaging markers", () => {
  const pages = {
    "index.html": "<p>Not Broken Just Burning. For men. Free learning.</p>",
    "join.html": "<p>Flamewalker free</p>",
    "flamewalker-plus.html": "<p>Flamewalker+ monthly or annual</p>",
    "movement.html": "<p>Men first</p>",
    "support.html": "<p>Call 911 or 988. thehotline.org. We cannot diagnose.</p>"
  };
  assert.deepEqual(brandSignalFindings(pages), []);
  pages["support.html"] = "<p>Call 911 or 988. We cannot diagnose.</p>";
  assert.ok(brandSignalFindings(pages).some(f => f.file === "support.html" && f.signal === "domestic violence route"));
});

test("Brand Spirit runs locally without internet access", () => {
  const result = spawnSync(process.execPath, [enginePath, "brand"], {
    encoding: "utf8", env: { ...process.env, GITHUB_STEP_SUMMARY: "" }
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Spirit of Integrity/);
});
