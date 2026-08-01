import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("public documentation preserves three separate product identities", () => {
  const readme = read("README.md");
  const boundaries = read("docs/PRODUCT_BOUNDARIES.md");

  assert.match(readme, /TheRecordMethod\.com.*independent governance and continuity product/s);
  assert.match(readme, /RecordMethodKeep\.com.*independent local custody and retrieval product/s);
  assert.match(boundaries, /ChatVaultAI Desktop.*separate commercial desktop application/s);
  assert.match(boundaries, /Repository layout is an engineering choice; it does not combine the products/);
});

test("independent products do not require ChatVaultAI or its paid tier", () => {
  const readme = read("README.md");
  const keepReadme = read("keep/README.md");
  const boundaries = read("docs/PRODUCT_BOUNDARIES.md");

  assert.match(readme, /Neither independent product requires ChatVaultAI, a ChatVaultAI account, or a paid ChatVaultAI plan/);
  assert.match(keepReadme, /does not require TheRecordMethod\.com, ChatVaultAI Desktop, a ChatVaultAI account, or a paid ChatVaultAI plan/);
  assert.match(boundaries, /must not unlock or restrict access to the embedded Method or Keep/);
});

test("capture helpers remain bounded intake adapters", () => {
  const boundaries = read("docs/PRODUCT_BOUNDARIES.md");

  assert.match(boundaries, /extension or capture helper may feed artifacts into any compatible program/);
  assert.match(boundaries, /intake adapter, not the foundation, owner, or governing authority/);
});
