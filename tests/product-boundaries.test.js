import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("public documentation preserves the open tools and visual host", () => {
  const readme = read("README.md");
  const boundaries = read("docs/PRODUCT_BOUNDARIES.md");

  assert.match(readme, /TheRecordMethod\.com.*independent governance and continuity product/s);
  assert.match(readme, /RecordMethodKeep\.com.*independent local custody and retrieval product/s);
  assert.match(boundaries, /ChatVaultAI Desktop provides their supported visual dashboards in the free Starter tier/);
  assert.match(boundaries, /one fluid local workspace instead of creating duplicate applications/);
});

test("open tools never require a paid ChatVaultAI subscription", () => {
  const readme = read("README.md");
  const keepReadme = read("keep/README.md");
  const boundaries = read("docs/PRODUCT_BOUNDARIES.md");

  assert.match(readme, /Neither tool requires a paid ChatVaultAI subscription/);
  assert.match(keepReadme, /included in \*\*ChatVaultAI Starter, free forever\*\*/);
  assert.match(boundaries, /must not unlock or restrict access to the Method or Keep dashboards/);
  assert.match(boundaries, /public command-line tools directly without ChatVaultAI Desktop/);
});

test("capture helpers remain bounded intake adapters", () => {
  const boundaries = read("docs/PRODUCT_BOUNDARIES.md");

  assert.match(boundaries, /extension or capture helper may feed artifacts into any compatible program/);
  assert.match(boundaries, /intake adapter, not the foundation, owner, or governing authority/);
});
