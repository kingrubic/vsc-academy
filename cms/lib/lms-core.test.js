const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("./lms-core");

test("certificate codes are unique and follow VSC-YEAR-PROGRAM-SEGMENT", () => {
  const existing = new Set();
  for (let i = 0; i < 50; i += 1) {
    const code = C.generateCertificateCode({ id: "ai-agent-automation" }, existing, 2026);
    assert.match(code, /^VSC-2026-AIA-[A-Z2-9]{6}$/);
    assert.equal(existing.has(code), false);
    existing.add(code);
  }
});

test("join window opens 30 minutes before class and closes after end", () => {
  const meeting = {
    date: "2026-08-15",
    start_time: "19:00",
    end_time: "21:00",
    format: "online",
    meeting_url: "https://meet.google.com/vsc",
    status: "scheduled",
  };
  const start = new Date("2026-08-15T19:00:00+07:00").getTime();
  const early = C.joinWindow(meeting, 30, start - 31 * 60 * 1000);
  const open = C.joinWindow(meeting, 30, start - 10 * 60 * 1000);
  const live = C.joinWindow(meeting, 30, start + 5 * 60 * 1000);
  const late = C.joinWindow(meeting, 30, start + 3 * 60 * 60 * 1000);
  assert.equal(early.canJoin, false);
  assert.equal(open.canJoin, true);
  assert.equal(live.canJoin, true);
  assert.equal(late.canJoin, false);
});

test("offline meetings never expose a join window", () => {
  const meeting = {
    date: "2026-08-15",
    start_time: "19:00",
    end_time: "21:00",
    format: "offline",
    meeting_url: "https://meet.google.com/secret",
    status: "scheduled",
  };
  const start = new Date("2026-08-15T19:00:00+07:00").getTime();
  assert.equal(C.joinWindow(meeting, 30, start).canJoin, false);
});

test("eligibility requires attendance, completion and payment by default", () => {
  const program = { id: "ai-starter", certificate_enabled: 1 };
  const enrollment = {
    id: "enr-1",
    session_id: "ses-1",
    status: "active",
    payment_status: "paid",
    completion_status: "in_progress",
  };
  const snap = {
    class_meetings: [
      { id: "m1", session_id: "ses-1", date: "2026-01-01", start_time: "09:00", end_time: "11:00", status: "completed" },
      { id: "m2", session_id: "ses-1", date: "2026-01-02", start_time: "09:00", end_time: "11:00", status: "completed" },
    ],
    attendance: [{ enrollment_id: "enr-1", meeting_id: "m1", status: "present" }],
    certificates: [],
  };
  const missing = C.evaluateEligibility(snap, enrollment, program);
  assert.equal(missing.eligible, false);
  assert.ok(missing.reasons.includes("completion"));
  assert.ok(missing.reasons.includes("attendance"));

  const ready = C.evaluateEligibility(
    {
      ...snap,
      attendance: [
        { enrollment_id: "enr-1", meeting_id: "m1", status: "present" },
        { enrollment_id: "enr-1", meeting_id: "m2", status: "present" },
      ],
    },
    { ...enrollment, status: "completed" },
    program,
  );
  assert.equal(ready.eligible, true);
  assert.equal(ready.certificateStatus, "eligible");
});

test("reset tokens are hashed and not reversible from hash", () => {
  const token = C.newSecretToken();
  const hash = C.hashToken(token);
  assert.equal(hash.length, 64);
  assert.notEqual(hash, token);
  assert.equal(C.hashToken(token), hash);
});
