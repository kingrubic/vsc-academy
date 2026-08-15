const { now } = require("./convex-db");
const { randomId } = require("./auth");
const Mailer = require("./mailer");

function redactSecrets(value) {
  return String(value || "")
    .replace(/token=[A-Za-z0-9_-]+/gi, "token=[redacted]")
    .replace(/\/(?:kich-hoat|dat-lai-mat-khau|activate|reset-password)\?[^\s<"]+/gi, "[redacted-link]");
}

function publicOutboxRow(row) {
  return {
    id: row.id,
    to_email: row.to_email,
    subject: row.subject,
    kind: row.kind,
    created_at: row.created_at,
    sent_at: row.sent_at,
    status: row.status || (row.sent_at ? "sent" : "failed"),
  };
}

async function notifyStudents(store, studentIds, payload) {
  const ts = now();
  const ids = [...new Set((studentIds || []).filter(Boolean))];
  for (const studentId of ids) {
    await store.upsert("notifications", {
      id: randomId("ntf"),
      student_id: studentId,
      type: payload.type || "info",
      title_vi: payload.titleVi || "",
      title_en: payload.titleEn || payload.titleVi || "",
      body_vi: payload.bodyVi || "",
      body_en: payload.bodyEn || payload.bodyVi || "",
      link: payload.link || "",
      read_at: null,
      created_at: ts,
    });
  }
}

async function writeOutbox(store, row) {
  await store.upsert("mail_outbox", row);
}

async function queueMail(store, to, subject, body, kind, extra = {}) {
  const ts = now();
  const id = randomId("mail");
  const reserved = {
    id,
    to_email: to,
    subject,
    body: redactSecrets(body),
    kind: kind || "generic",
    payload: JSON.stringify({
      studentId: extra.studentId || null,
      userId: extra.userId || null,
      kind: kind || "generic",
    }),
    created_at: ts,
    sent_at: null,
    status: "pending",
  };
  await writeOutbox(store, reserved);
  let sent = false;
  let reason = "";
  try {
    const result = await Mailer.sendMail({
      to,
      subject,
      text: body,
      html: extra.html || extra.bodyHtml || "",
    });
    sent = !!result.sent;
    reason = result.reason || "";
  } catch (err) {
    reason = err.message || "send_failed";
    console.error("send mail failed", reason);
  }
  const finalized = { ...reserved, sent_at: sent ? now() : null, status: sent ? "sent" : "failed" };
  try {
    await writeOutbox(store, finalized);
  } catch (err) {
    try {
      await writeOutbox(store, finalized);
    } catch (retryErr) {
      console.error("mail audit finalize failed", retryErr.message || retryErr);
    }
  }
  return { sent, id, reason };
}

function sessionStudentIds(snap, sessionId) {
  return (snap.enrollments || [])
    .filter((e) => e.session_id === sessionId && ["active", "completed", "paused"].includes(e.status))
    .map((e) => e.student_id);
}

function programStudentIds(snap, programId) {
  return [
    ...new Set(
      (snap.enrollments || [])
        .filter((e) => e.program_id === programId && ["active", "completed", "paused"].includes(e.status))
        .map((e) => e.student_id),
    ),
  ];
}

module.exports = {
  notifyStudents,
  queueMail,
  sessionStudentIds,
  programStudentIds,
  redactSecrets,
  publicOutboxRow,
};
