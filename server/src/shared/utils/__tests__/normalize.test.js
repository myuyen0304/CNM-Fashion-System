const test = require("node:test");
const assert = require("node:assert/strict");
const { escapeRegex, normalizeKeyword } = require("../normalize");

test("escapeRegex escapes regex control characters", () => {
  assert.equal(escapeRegex("shirt (sale).*"), "shirt \\(sale\\)\\.\\*");
});

test("normalizeKeyword trims and lowercases input", () => {
  assert.equal(normalizeKeyword("  Ao Khoac  "), "ao khoac");
});
