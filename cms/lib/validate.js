const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\s().-]{8,20}$/;

const PROGRAM_STATUS = ["draft", "published", "hidden"];
const LANG_STATUS = ["not_created", "ai_draft", "review", "published"];
const SESSION_STATUS = ["open", "full", "completed", "cancelled"];
const REG_STATUS = ["pending_payment", "confirmed", "cancelled"];
const REG_STATUS_ALIASES = {
  pending_payment: ["pending_payment", "new", "contacted", "paid", "waitlist"],
  confirmed: ["confirmed", "completed"],
  cancelled: ["cancelled"],
};

function normalizeRegStatus(status) {
  const value = String(status || "").trim();
  for (const [canonical, aliases] of Object.entries(REG_STATUS_ALIASES)) {
    if (aliases.includes(value)) return canonical;
  }
  return "";
}

function normalizeSessionStatus(status) {
  const value = String(status || "").trim();
  if (["draft", "upcoming", "limited", "open"].includes(value)) return "open";
  if (SESSION_STATUS.includes(value)) return value;
  return "";
}

function registrationStatusMatches(filter, actual) {
  if (!filter) return true;
  const want = normalizeRegStatus(filter);
  if (!want) return actual === filter;
  return normalizeRegStatus(actual) === want;
}

const FORMATS = ["online", "offline", "hybrid"];
const ROLES = ["OWNER", "ADMIN", "EDITOR", "INSTRUCTOR"];

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

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sessionSlugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
}

function slug(value, field = "slug") {
  const normalized = slugify(value);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    throw fail(
      `${field === "slug" ? "Mã lớp" : field} không hợp lệ. Dùng chữ thường không dấu, số và gạch ngang, ví dụ ai-starter-thang-10`,
    );
  }
  return normalized;
}

function sessionSlug(value) {
  const normalized = sessionSlugify(value);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(normalized)) {
    throw fail("Mã lớp không hợp lệ. Dùng A-Z, a-z, 0-9, gạch dưới _ hoặc gạch ngang -");
  }
  return normalized;
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
  normalizeRegStatus,
  normalizeSessionStatus,
  registrationStatusMatches,
  FORMATS,
  ROLES,
  fail,
  required,
  email,
  phone,
  oneOf,
  slugify,
  sessionSlugify,
  slug,
  sessionSlug,
  nonNegInt,
};
