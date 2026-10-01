const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "qa.js"), "utf8");
const context = vm.createContext({});
vm.runInContext(`${source}\nthis.parseInstallSnippet = parseInstallSnippet;`, context);
const { parseInstallSnippet } = context;

const config = () => ({
  schema_version: 1,
  source_public_id: "s".repeat(8),
  collection_token: "t".repeat(8),
  endpoint: "https://info.rastrack.app",
});

const snippet = (value = config()) =>
  `<script id="rastracking-nod-4.8.5-config" type="application/json">\n${JSON.stringify(value)}\n</script>\n` +
  `<script src="https://info.rastrack.app/rastracking-info.js" defer></script>`;

test("accepts the complete official two-script installation", () => {
  const parsed = parseInstallSnippet(snippet());
  assert.equal(parsed.schema_version, 1);
  assert.equal(parsed.source_public_id, "s".repeat(8));
  assert.equal(parsed.collection_token, "t".repeat(8));
  assert.equal(parsed.endpoint, "https://info.rastrack.app");
});

test("rejects any additional HTML or JavaScript", () => {
  assert.throws(() => parseInstallSnippet(`${snippet()}<img src=x>`));
  assert.throws(() => parseInstallSnippet(`<script>alert(1)</script>${snippet()}`));
  assert.throws(() => parseInstallSnippet(snippet().replace(" defer", " onload=alert(1) defer")));
});

test("requires both official script tags and the fixed runtime URL", () => {
  assert.throws(() => parseInstallSnippet(snippet().replace(/<script src=.*$/, "")));
  assert.throws(() => parseInstallSnippet(snippet().replace("rastracking-info.js", "other.js")));
  assert.throws(() => parseInstallSnippet(snippet().replace("application/json", "text/javascript")));
});

test("requires the exact config schema and fixed endpoint", () => {
  assert.throws(() => parseInstallSnippet(snippet({ ...config(), extra: true })));
  assert.throws(() => parseInstallSnippet(snippet({ ...config(), schema_version: 2 })));
  assert.throws(() => parseInstallSnippet(snippet({ ...config(), endpoint: "https://elsewhere.example" })));
});

test("rejects malformed source IDs and tokens", () => {
  assert.throws(() => parseInstallSnippet(snippet({ ...config(), source_public_id: "bad" })));
  assert.throws(() => parseInstallSnippet(snippet({ ...config(), collection_token: "short" })));
  assert.throws(() => parseInstallSnippet(snippet({ ...config(), collection_token: " ".repeat(10) })));
});
