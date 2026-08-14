const { now } = require("./convex-db");
const { randomId } = require("./auth");

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

async function queueMail(store, to, subject, body, kind, extra = {}) {
  const ts = now();
  await store.upsert("mail_outbox", {
    id: randomId("mail"),
    to_email: to,
    subject,
    body,
    kind: kind || "generic",
    payload: JSON.stringify(extra),
    created_at: ts,
    sent_at: null,
  });
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

module.exports = { notifyStudents, queueMail, sessionStudentIds, programStudentIds };
