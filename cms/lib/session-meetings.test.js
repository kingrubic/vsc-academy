const test = require("node:test");
const assert = require("node:assert/strict");
const Meetings = require("./session-meetings");

test("AI Starter plans two meetings two days apart", () => {
  const dates = Meetings.plannedMeetingDates(
    { start_date: "2026-08-24", format: "online" },
    { duration_label_vi: "02 buổi × 120 phút" },
  );
  assert.deepEqual(dates, ["2026-08-24", "2026-08-26"]);
});

test("a one-session class plans a single meeting", () => {
  const dates = Meetings.plannedMeetingDates(
    { start_date: "2026-08-24", format: "offline" },
    { duration_label_vi: "01 buổi" },
  );
  assert.deepEqual(dates, ["2026-08-24"]);
});

test("ensureSessionMeetings skips a class without a start date", async () => {
  const snap = { programs: [], sessions: [{ id: "s1" }], class_meetings: [] };
  const store = { upsert: async () => assert.fail("must not write") };
  const result = await Meetings.ensureSessionMeetings(store, snap, snap.sessions[0]);
  assert.equal(result.created, 0);
  assert.equal(snap.class_meetings.length, 0);
});

test("ensureSessionMeetings creates meetings once and does not duplicate", async () => {
  const snap = {
    programs: [{ id: "p1", duration_label_vi: "02 buổi × 120 phút", format: "online" }],
    sessions: [{ id: "s1", program_id: "p1", start_date: "2026-08-24", start_time: "17:01", end_time: "17:03", format: "online" }],
    class_meetings: [],
  };
  const store = {
    upsert: async (table, row) => {
      snap[table].push(row);
    },
  };
  const first = await Meetings.ensureSessionMeetings(store, snap, snap.sessions[0]);
  assert.equal(first.created, 2);
  assert.equal(snap.class_meetings.length, 2);
  assert.equal(snap.class_meetings[0].title_vi, "Buổi 01");
  assert.equal(snap.class_meetings[1].date, "2026-08-26");
  const second = await Meetings.ensureSessionMeetings(store, snap, snap.sessions[0]);
  assert.equal(second.created, 0);
  assert.equal(snap.class_meetings.length, 2);
});
