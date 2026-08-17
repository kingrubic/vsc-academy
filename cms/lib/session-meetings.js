const { now, aliveById } = require("./convex-db");
const { randomId } = require("./auth");

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function meetingCountForProgram(program) {
  const label = `${program?.duration_label_vi || ""} ${program?.duration_label_en || ""}`;
  return /02|2 buổi|2 sessions/i.test(label) ? 2 : 1;
}

function plannedMeetingDates(session, program) {
  const start = String(session?.start_date || "").slice(0, 10);
  if (!start) return [];
  const count = meetingCountForProgram(program);
  const format = session.format || program?.format;
  const gap = format === "offline" ? 1 : 2;
  const dates = [start];
  for (let i = 1; i < count; i += 1) dates.push(addDays(start, gap * i));
  return dates;
}

function meetingDrafts(session, program, ts = now()) {
  return plannedMeetingDates(session, program).map((date, index) => {
    const format = session.format || program?.format || null;
    return {
      id: randomId("mtg"),
      session_id: session.id,
      title_vi: `Buổi ${String(index + 1).padStart(2, "0")}`,
      title_en: `Session ${String(index + 1).padStart(2, "0")}`,
      description_vi: "",
      description_en: "",
      date,
      start_time: session.start_time || "",
      end_time: session.end_time || "",
      meeting_number: index + 1,
      format,
      venue_id: session.venue_id || null,
      online_platform: session.online_platform || "",
      meeting_url: format === "offline" ? "" : session.meeting_url || "",
      status: "scheduled",
      notes: "",
      recording_url: "",
      materials_released: 0,
      sort_order: index,
      created_at: ts,
      updated_at: ts,
    };
  });
}

async function ensureSessionMeetings(store, snap, session) {
  if (!session?.id || !session.start_date) return { created: 0 };
  const meetings = snap.class_meetings || (snap.class_meetings = []);
  if (meetings.some((row) => String(row.session_id) === String(session.id) && !row.deleted_at)) {
    return { created: 0 };
  }
  const program = aliveById(snap.programs, session.program_id);
  const drafts = meetingDrafts(session, program);
  for (const row of drafts) {
    await store.upsert("class_meetings", row);
    if (!meetings.some((item) => item.id === row.id)) meetings.push(row);
  }
  return { created: drafts.length };
}

module.exports = {
  addDays,
  meetingCountForProgram,
  plannedMeetingDates,
  meetingDrafts,
  ensureSessionMeetings,
};
