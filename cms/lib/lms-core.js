const crypto = require("crypto");

const PROGRAM_CODES = {
  "ai-starter": "AIS",
  "ai-foundation": "AIW",
  "ai-agent-automation": "AIA",
};

const JOIN_GRACE_MINUTES_AFTER_END = 15;
const RESET_TTL_MS = 60 * 60 * 1000;
const ACTIVATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function programCode(program) {
  if (program?.certificate_code) return String(program.certificate_code).toUpperCase().slice(0, 6);
  return PROGRAM_CODES[program?.id] || "VSC";
}

function randomSegment(length = 6) {
  let out = "";
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i += 1) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

function generateCertificateCode(program, existingCodes = new Set(), year = new Date().getFullYear()) {
  const prefix = `VSC-${year}-${programCode(program)}-`;
  for (let i = 0; i < 32; i += 1) {
    const code = prefix + randomSegment(6);
    if (!existingCodes.has(code)) return code;
  }
  return prefix + randomSegment(8);
}

function meetingStartEnd(meeting, timezoneOffset = "+07:00") {
  const start = new Date(`${meeting.date}T${meeting.start_time}:00${timezoneOffset}`);
  const end = new Date(`${meeting.date}T${meeting.end_time}:00${timezoneOffset}`);
  return { start, end };
}

function meetingComputedStatus(meeting, nowMs = Date.now()) {
  if (meeting.status === "cancelled" || meeting.status === "rescheduled") return meeting.status;
  const { start, end } = meetingStartEnd(meeting);
  if (Number.isNaN(start.getTime())) return meeting.status || "scheduled";
  if (nowMs > end.getTime()) return "completed";
  if (nowMs >= start.getTime() && nowMs <= end.getTime()) return "live";
  if (meeting.status === "completed") return "completed";
  if (meeting.status === "live") return "live";
  return "scheduled";
}

function joinLinkOpenMinutes(program, session) {
  const n = Number(session?.join_link_open_minutes_before ?? program?.join_link_open_minutes_before ?? 30);
  return Number.isFinite(n) && n >= 0 ? n : 30;
}

function joinWindow(meeting, minutesBefore = 30, nowMs = Date.now()) {
  const format = meeting.format || "online";
  const { start, end } = meetingStartEnd(meeting);
  if (Number.isNaN(start.getTime())) {
    return { canJoin: false, openAt: null, start: null, end: null, reason: "invalid" };
  }
  const openAt = start.getTime() - minutesBefore * 60 * 1000;
  const closeAt = end.getTime() + JOIN_GRACE_MINUTES_AFTER_END * 60 * 1000;
  const status = meetingComputedStatus(meeting, nowMs);
  const online = format !== "offline";
  const effectiveUrl = meeting.meeting_url || meeting.session_meeting_url || "";
  const canJoin =
    online &&
    !!effectiveUrl &&
    status !== "cancelled" &&
    nowMs >= openAt &&
    nowMs <= closeAt;
  return { canJoin, openAt, start, end, closeAt, status, online };
}

function attendancePercent(snap, enrollmentId, sessionId) {
  const meetings = (snap.class_meetings || []).filter(
    (m) => m.session_id === sessionId && !m.deleted_at && m.status !== "cancelled",
  );
  if (!meetings.length) return { present: 0, total: 0, percent: 0 };
  const attMap = Object.fromEntries(
    (snap.attendance || [])
      .filter((a) => a.enrollment_id === enrollmentId)
      .map((a) => [a.meeting_id, a.status]),
  );
  let present = 0;
  meetings.forEach((m) => {
    if (attMap[m.id] === "present" || attMap[m.id] === "excused") present += 1;
  });
  return { present, total: meetings.length, percent: Math.round((present / meetings.length) * 100) };
}

function enrollmentProgress(snap, enrollmentId, sessionId, nowMs = Date.now()) {
  const meetings = (snap.class_meetings || []).filter(
    (m) => m.session_id === sessionId && !m.deleted_at && m.status !== "cancelled",
  );
  const attMap = Object.fromEntries(
    (snap.attendance || [])
      .filter((a) => a.enrollment_id === enrollmentId)
      .map((a) => [a.meeting_id, a.status]),
  );
  let completed = 0;
  meetings.forEach((m) => {
    const st = meetingComputedStatus(m, nowMs);
    if (st === "completed" || attMap[m.id] === "present") completed += 1;
  });
  const total = meetings.length;
  return { completed, total, percent: total ? Math.round((completed / total) * 100) : 0 };
}

function certificateRules(program) {
  return {
    enabled: program?.certificate_enabled == null ? true : Number(program.certificate_enabled) !== 0,
    minimumAttendancePercent: Number(program?.minimum_attendance_percent ?? 75),
    requireCompletion: program?.require_completion == null ? true : Number(program.require_completion) !== 0,
    requirePayment: program?.require_payment == null ? true : Number(program.require_payment) !== 0,
    requireAdminApproval: program?.require_admin_approval == null ? true : Number(program.require_admin_approval) !== 0,
    templateId: program?.certificate_template_id || "tpl-vsc-default",
  };
}

function evaluateEligibility(snap, enrollment, program) {
  const rules = certificateRules(program);
  const reasons = [];
  if (!rules.enabled) reasons.push("disabled");
  if (enrollment.status === "cancelled") reasons.push("cancelled");
  const att = attendancePercent(snap, enrollment.id, enrollment.session_id);
  if (att.total && att.percent < rules.minimumAttendancePercent) reasons.push("attendance");
  const completed =
    enrollment.status === "completed" || enrollment.completion_status === "completed";
  if (rules.requireCompletion && !completed) reasons.push("completion");
  if (rules.requirePayment && enrollment.payment_status !== "paid") reasons.push("payment");
  const eligible = reasons.length === 0;
  let completionStatus = enrollment.completion_status || "in_progress";
  if (enrollment.status === "cancelled") completionStatus = "incomplete";
  else if (completed) completionStatus = "completed";
  else if (eligible || (!rules.requireCompletion && !reasons.includes("attendance") && !reasons.includes("payment"))) {
    if (!completed && att.total && att.percent >= rules.minimumAttendancePercent) {
      completionStatus = enrollment.status === "completed" ? "completed" : "eligible";
    }
  }
  let certificateStatus = enrollment.certificate_status || "none";
  const issued = (snap.certificates || []).find(
    (c) => c.enrollment_id === enrollment.id && c.status === "issued",
  );
  const revoked = (snap.certificates || []).find(
    (c) => c.enrollment_id === enrollment.id && c.status === "revoked" && !issued,
  );
  if (issued) certificateStatus = "issued";
  else if (revoked) certificateStatus = "revoked";
  else if (eligible) certificateStatus = rules.requireAdminApproval ? "eligible" : "eligible";
  else certificateStatus = "none";
  return {
    eligible,
    reasons,
    rules,
    attendance: att,
    completionStatus,
    certificateStatus,
  };
}

function publicSiteUrl(req, settingsSnap) {
  const fromEnv = process.env.PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const site = (settingsSnap || []).find((s) => s.key === "site" || s.id === "site");
  let parsed = {};
  try {
    parsed = typeof site?.value === "string" ? JSON.parse(site.value) : site?.value || {};
  } catch {
    parsed = {};
  }
  if (parsed.publicUrl) return String(parsed.publicUrl).replace(/\/$/, "");
  if (req?.get) {
    const host = req.get("x-forwarded-host") || req.get("host");
    const proto = req.get("x-forwarded-proto") || req.protocol || "http";
    if (host) return `${proto}://${host}`;
  }
  return "https://vscacademy.edu.vn";
}

function publicEmailOrigin() {
  const raw = String(process.env.PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
  const err = (message) => Object.assign(new Error(message), { status: 503, code: "PUBLIC_SITE_URL_REQUIRED" });
  if (!raw) throw err("PUBLIC_SITE_URL is required for email links");
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw err("PUBLIC_SITE_URL is invalid");
  }
  if (parsed.protocol !== "https:") throw err("PUBLIC_SITE_URL must be https");
  if (parsed.username || parsed.password || parsed.search || parsed.hash || (parsed.pathname && parsed.pathname !== "/")) {
    throw err("PUBLIC_SITE_URL must be an origin only");
  }
  const canonical = "https://vscacademy.edu.vn";
  if (parsed.origin !== canonical) throw err("PUBLIC_SITE_URL must be the canonical production origin");
  return canonical;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function newSecretToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString("hex");
}

module.exports = {
  PROGRAM_CODES,
  RESET_TTL_MS,
  ACTIVATION_TTL_MS,
  programCode,
  randomSegment,
  generateCertificateCode,
  meetingStartEnd,
  meetingComputedStatus,
  joinLinkOpenMinutes,
  joinWindow,
  attendancePercent,
  enrollmentProgress,
  certificateRules,
  evaluateEligibility,
  publicSiteUrl,
  publicEmailOrigin,
  hashToken,
  newSecretToken,
};
