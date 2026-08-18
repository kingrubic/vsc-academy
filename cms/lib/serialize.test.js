const test = require("node:test");
const assert = require("node:assert/strict");
const { sessionInstructorName, sessionPublic } = require("./serialize");

const snap = {
  instructors: [
    { id: "i1", name: "GV chính" },
    { id: "i2", name: "GV lớp" },
  ],
  program_instructors: [{ program_id: "p1", instructor_id: "i1", sort_order: 0 }],
};

test("class instructor name prefers the assigned faculty record", () => {
  assert.equal(sessionInstructorName(snap, { program_id: "p1", instructor_id: "i2" }, { id: "p1" }), "GV lớp");
});

test("class instructor name falls back to the program faculty list", () => {
  assert.equal(
    sessionInstructorName(snap, { program_id: "p1" }, { id: "p1", primary_instructor_id: "i1" }),
    "GV chính",
  );
});

test("public schedule includes instructorName before other session facts", () => {
  const item = sessionPublic(
    snap,
    {
      id: "s1",
      slug: "s1",
      program_id: "p1",
      instructor_id: "i2",
      start_date: "2026-08-24",
      start_time: "19:00",
      end_time: "21:00",
      status: "open",
    },
    { id: "p1", format: "online", location_online: "Google Meet", price_amount: 0 },
  );
  assert.equal(item.instructorName, "GV lớp");
});

test("public schedule includes dated class meetings", () => {
  const item = sessionPublic(
    {
      ...snap,
      class_meetings: [
        { id: "m1", session_id: "s1", date: "2026-08-25", start_time: "19:00", end_time: "21:00", sort_order: 0 },
        { id: "m2", session_id: "s1", date: "2026-08-27", start_time: "19:00", end_time: "21:00", sort_order: 1 },
        { id: "m3", session_id: "other", date: "2026-09-01", start_time: "09:00", end_time: "11:00", sort_order: 0 },
      ],
    },
    {
      id: "s1",
      slug: "s1",
      program_id: "p1",
      instructor_id: "i2",
      start_date: "2026-08-25",
      start_time: "19:00",
      end_time: "21:00",
      status: "open",
    },
    { id: "p1", format: "online", location_online: "Google Meet", price_amount: 0 },
  );
  assert.deepEqual(item.meetings, [
    { date: "2026-08-25", startTime: "19:00", endTime: "21:00" },
    { date: "2026-08-27", startTime: "19:00", endTime: "21:00" },
  ]);
});
