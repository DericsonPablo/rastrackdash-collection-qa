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

function fixture(forward) {
  const nodes = new Map();
  for (const id of ["install-form", "install-snippet", "load-script", "status", "resend-page-view", "resend-status"]) {
    nodes.set(id, { id, value: "", textContent: "", dataset: {}, hidden: id === "resend-page-view" || id === "resend-status", disabled: false, listeners: {}, addEventListener(type, listener) { this.listeners[type] = listener; }, focus() {} });
  }
  nodes.get("install-snippet").value = snippet();
  const scripts = [];
  const document = {
    getElementById(id) { return nodes.get(id); },
    createElement() { return { listeners: {}, addEventListener(type, listener) { this.listeners[type] = listener; }, remove() {} }; },
    head: { append(node) { scripts.push(node); } },
  };
  const window = { rastracking_info: { forward } };
  vm.runInNewContext(source, { document, window });
  nodes.get("install-form").listeners.submit({ preventDefault() {} });
  scripts[1].listeners.load();
  return { nodes, scripts };
}

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

test("PageView control appears only after runtime load and calls forward once", async () => {
  const calls = [];
  const { nodes } = fixture(async (...args) => { calls.push(args); return true; });
  const button = nodes.get("resend-page-view");
  const result = nodes.get("resend-status");
  assert.equal(button.hidden, false);
  await button.listeners.click();
  assert.deepEqual(calls, [["rastracking_page_view"]]);
  assert.equal(result.hidden, false);
  assert.match(result.textContent, /aceito/);
  assert.doesNotMatch(result.textContent, /tttttttt|source_public_id|X-Collection-Token/);
});

test("PageView control reports denial without showing transport details", async () => {
  const { nodes } = fixture(async () => false);
  await nodes.get("resend-page-view").listeners.click();
  const result = nodes.get("resend-status");
  assert.equal(result.dataset.state, "error");
  assert.match(result.textContent, /não aceito/);
  assert.doesNotMatch(result.textContent, /HTTP|token|payload/i);
});

test("PageView control treats a thrown transport error as not accepted", async () => {
  const { nodes } = fixture(async () => { throw new Error("secret transport detail"); });
  await nodes.get("resend-page-view").listeners.click();
  const result = nodes.get("resend-status");
  assert.equal(result.dataset.state, "error");
  assert.doesNotMatch(result.textContent, /secret transport detail/);
});
