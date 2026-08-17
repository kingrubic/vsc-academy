const test = require("node:test");
const assert = require("node:assert/strict");
const V = require("./validate");

test("slugify turns Vietnamese class names into URL slugs", () => {
  assert.equal(V.slugify("AI Starter Tháng 10"), "ai-starter-thang-10");
  assert.equal(V.slugify("  AI-STARTER_thang 9  "), "ai-starter-thang-9");
  assert.equal(V.slugify("ai-starter-thang-10"), "ai-starter-thang-10");
});

test("slug accepts and returns a normalized class code", () => {
  assert.equal(V.slug("AI Starter Tháng 10"), "ai-starter-thang-10");
  assert.equal(V.slug("ai-starter-thang-10"), "ai-starter-thang-10");
});

test("slug rejects values that cannot be normalized", () => {
  assert.throws(() => V.slug("???"), /Mã lớp không hợp lệ/);
  assert.throws(() => V.slug(""), /Mã lớp không hợp lệ/);
});
