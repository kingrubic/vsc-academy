const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\s().-]{8,20}$/;

const PROGRAM_STATUS = ["draft", "published", "hidden"];
const LANG_STATUS = ["not_created", "ai_draft", "review", "published"];
const SESSION_STATUS = [
  "draft",
  "open",
  "upcoming",
  "limited",
  "full",
  "completed",
  "cancelled",
];
const REG_STATUS = [
  "new",
  "contacted",
  "pending_payment",
  "paid",
  "confirmed",
  "waitlist",
  "cancelled",
  "completed",
];
const FORMATS = ["online", "offline", "hybrid"];
const ROLES = ["OWNER", "ADMIN", "EDITOR"];

function fail(message, extra) {
  const err = new Error(message);
  err.status = 400;
  err.extra = extra;
  return err;
}

function required(body, fields) {
  for (const field of fields) {
    const value = body[field];
    if (value == null || String(value).trim() === "") {
      throw fail(`${field} is required`);
    }
  }
}

function email(value) {
  if (!EMAIL_RE.test(String(value || "").trim())) throw fail("Invalid email");
}

function phone(value) {
  if (!PHONE_RE.test(String(value || "").trim())) throw fail("Invalid phone");
}

function oneOf(value, list, field) {
  if (!list.includes(value)) throw fail(`Invalid ${field}`);
}

function slug(value, field = "slug") {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(value || ""))) {
    throw fail(`Invalid ${field}`);
  }
}

function nonNegInt(value, field) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) throw fail(`Invalid ${field}`);
  return n;
}

module.exports = {
  EMAIL_RE,
  PROGRAM_STATUS,
  LANG_STATUS,
  SESSION_STATUS,
  REG_STATUS,
  FORMATS,
  ROLES,
  fail,
  required,
  email,
  phone,
  oneOf,
  slug,
  nonNegInt,
};
