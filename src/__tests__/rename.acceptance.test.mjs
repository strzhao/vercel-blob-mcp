/**
 * Acceptance test for assets-store-mcp rename.
 *
 * Validates that the MCP server has been correctly renamed from
 * vercel-blob-mcp / blob_* to assets-store-mcp / assets_*.
 *
 * Run: node src/__tests__/rename.acceptance.test.mjs
 * Exit 0 = pass, Exit 1 = fail
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

let failures = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    failures++;
  } else {
    console.log(`  PASS: ${message}`);
  }
}

// ---------------------------------------------------------------------------
// 1. package.json checks
// ---------------------------------------------------------------------------
console.log("\n=== package.json ===");

const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf-8"));

assert(
  pkg.name === "assets-store-mcp",
  `package name should be "assets-store-mcp", got "${pkg.name}"`
);

assert(
  pkg.bin && pkg.bin["assets-store-mcp"],
  `bin should contain key "assets-store-mcp", got keys: ${pkg.bin ? Object.keys(pkg.bin).join(", ") : "(none)"}`
);

assert(
  !pkg.bin || !pkg.bin["vercel-blob-mcp"],
  `bin should NOT contain legacy key "vercel-blob-mcp"`
);

// ---------------------------------------------------------------------------
// 2. Source code checks – extract tool registrations from src/index.ts
// ---------------------------------------------------------------------------
console.log("\n=== src/index.ts tool registrations ===");

const src = readFileSync(resolve(ROOT, "src/index.ts"), "utf-8");

// Extract server name from the Server constructor or McpServer constructor.
// Patterns: new Server({ name: "..." }) or new McpServer({ name: "..." })
const serverNameMatch = src.match(/name:\s*["']([^"']+)["']/);
assert(
  serverNameMatch && serverNameMatch[1] === "assets-store-mcp",
  `server name should be "assets-store-mcp", got "${serverNameMatch ? serverNameMatch[1] : "(not found)"}"`
);

// Extract all tool names and descriptions.
// MCP SDK patterns:
//   1. server.tool("name", "description", ...) — high-level McpServer API
//   2. { name: "...", description: "..." } in a tools array — low-level Server API
// We try both patterns.
const tools = [];
let m;

// Pattern 1: server.tool("name", "description", ...)
const toolMethodRegex = /\.tool\(\s*["'](\w+)["']\s*,\s*["']([^"']+)["']/g;
while ((m = toolMethodRegex.exec(src)) !== null) {
  tools.push({ name: m[1], description: m[2] });
}

// Pattern 2: { name: "tool_name", description: "..." } in tools array
const toolObjRegex = /name:\s*["'](\w+)["'][^}]*?description:\s*["']([^"']+)["']/gs;
while ((m = toolObjRegex.exec(src)) !== null) {
  if (!tools.find((t) => t.name === m[1])) {
    tools.push({ name: m[1], description: m[2] });
  }
}

console.log(`  Found ${tools.length} tool(s): ${tools.map((t) => t.name).join(", ")}`);

assert(tools.length === 5, `expected 5 tools, found ${tools.length}`);

// ---------------------------------------------------------------------------
// 3. Verify each expected tool exists with correct description keywords
// ---------------------------------------------------------------------------
console.log("\n=== Tool name & description validation ===");

const expectedTools = [
  { name: "assets_upload", descKeyword: "personal assets store" },
  { name: "assets_list", descKeyword: "personal assets store" },
  { name: "assets_head", descKeyword: "asset" },
  { name: "assets_delete", descKeyword: "personal assets store" },
  { name: "assets_copy", descKeyword: "personal assets store" },
];

for (const expected of expectedTools) {
  const found = tools.find((t) => t.name === expected.name);
  assert(found, `tool "${expected.name}" should exist`);
  if (found) {
    const descLower = found.description.toLowerCase();
    const keywordLower = expected.descKeyword.toLowerCase();
    assert(
      descLower.includes(keywordLower),
      `tool "${expected.name}" description should contain "${expected.descKeyword}", got "${found.description}"`
    );
  }
}

// ---------------------------------------------------------------------------
// 4. No legacy blob_ tool names
// ---------------------------------------------------------------------------
console.log("\n=== No legacy blob_ tools ===");

const blobTools = tools.filter((t) => t.name.startsWith("blob_"));
assert(
  blobTools.length === 0,
  `no tools should start with "blob_", found: ${blobTools.map((t) => t.name).join(", ") || "(none)"}`
);

// Also check raw source for any residual blob_ tool registration (any pattern)
const blobToolInSource = /["']blob_\w+["']/g.test(src);
assert(
  !blobToolInSource,
  `source code should not contain any "blob_..." tool name strings`
);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log("\n=== Summary ===");
if (failures > 0) {
  console.error(`${failures} assertion(s) FAILED`);
  process.exit(1);
} else {
  console.log("All assertions passed");
  process.exit(0);
}
