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
