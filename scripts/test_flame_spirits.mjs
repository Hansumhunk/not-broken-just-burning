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
