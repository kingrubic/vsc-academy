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

test("sessionSlug keeps uppercase, digits, underscore, and hyphen", () => {
  assert.equal(V.sessionSlug("AIS-T10"), "AIS-T10");
  assert.equal(V.sessionSlug("AI_STARTER_10"), "AI_STARTER_10");
  assert.equal(V.sessionSlug("AI Starter Tháng 10"), "AI-Starter-Thang-10");
  assert.equal(V.sessionSlug("ai-starter-thang-10"), "ai-starter-thang-10");
});

test("sessionSlug rejects values outside A-Z a-z 0-9 _ -", () => {
  assert.throws(() => V.sessionSlug("???"), /Mã lớp không hợp lệ/);
  assert.throws(() => V.sessionSlug(""), /Mã lớp không hợp lệ/);
});
