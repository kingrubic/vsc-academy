const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("./learner");

function snap() {
  return {
    programs: [{ id: "ai-starter", content_vi: '{"name":"AI Starter"}', content_en: '{"name":"AI Starter"}' }],
    sessions: [{ id: "ses-a", program_id: "ai-starter" }, { id: "ses-b", program_id: "ai-starter" }],
    enrollments: [
      { id: "enr-1", student_id: "stu-1", program_id: "ai-starter", session_id: "ses-a", status: "active" },
    ],
    class_meetings: [{ id: "mtg-1", session_id: "ses-a", date: "2026-08-15", start_time: "19:00", end_time: "21:00", status: "scheduled" }],
    learning_materials: [
      { id: "mat-a", session_id: "ses-a", status: "published", visibility: "session", title_vi: "A" },
      { id: "mat-b", session_id: "ses-b", status: "published", visibility: "session", title_vi: "B" },
      { id: "mat-draft", session_id: "ses-a", status: "draft", visibility: "session", title_vi: "Draft" },
    ],
    announcements: [
      { id: "ann-all", status: "published", target_type: "all", title_vi: "All" },
      { id: "ann-other", status: "published", target_type: "session", session_id: "ses-b", title_vi: "Other class" },
      { id: "ann-mine", status: "published", target_type: "session", session_id: "ses-a", title_vi: "My class" },
    ],
  };
}

test("student only sees materials for enrolled sessions", () => {
  const s = snap();
  assert.equal(L.canSeeMaterial(s, "stu-1", s.learning_materials[0]), true);
  assert.equal(L.canSeeMaterial(s, "stu-1", s.learning_materials[1]), false);
  assert.equal(L.canSeeMaterial(s, "stu-1", s.learning_materials[2]), false);
  assert.equal(L.canSeeMaterial(s, "stu-2", s.learning_materials[0]), false);
});

test("student only sees announcements targeted to them", () => {
  const s = snap();
  assert.equal(L.canSeeAnnouncement(s, "stu-1", s.announcements[0]), true);
  assert.equal(L.canSeeAnnouncement(s, "stu-1", s.announcements[1]), false);
  assert.equal(L.canSeeAnnouncement(s, "stu-1", s.announcements[2]), true);
});

test("join URL is omitted from serialized meetings unless explicitly allowed", () => {
  const meeting = {
    id: "mtg-1",
    session_id: "ses-a",
    title_vi: "Buổi 01",
    title_en: "Session 01",
    date: "2099-01-01",
    start_time: "19:00",
    end_time: "21:00",
    format: "online",
    meeting_url: "https://meet.google.com/secret",
    status: "scheduled",
    sort_order: 0,
  };
  const out = L.serializeMeeting(meeting, "vi", {
    session: { online_platform: "Google Meet", meeting_url: "https://meet.google.com/secret" },
  });
  assert.equal(out.meetingUrl, "");
  assert.equal(out.hasMeetingUrl, true);
});
