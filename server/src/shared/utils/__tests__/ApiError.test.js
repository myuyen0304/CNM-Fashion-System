const test = require("node:test");
const assert = require("node:assert/strict");
const ApiError = require("../ApiError");

test("ApiError stores status code and operational flag", () => {
  const error = new ApiError(404, "Not found");

  assert.equal(error.statusCode, 404);
  assert.equal(error.message, "Not found");
  assert.equal(error.isOperational, true);
  assert.ok(error instanceof Error);
});
