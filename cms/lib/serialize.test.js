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
