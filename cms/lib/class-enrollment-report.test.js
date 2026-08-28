const test = require("node:test");
const assert = require("node:assert/strict");
const {
  classEnrollmentRows,
  summarizeRows,
  snapshotReport,
  filename,
  fmtDate,
  renderPdf,
} = require("./class-enrollment-report");

const programs = [
  { id: "p1", content_vi: JSON.stringify({ shortName: "AI Starter" }) },
  { id: "p2", content_vi: JSON.stringify({ name: "AI Agent" }) },
];
const sessions = [
  { id: "s1", program_id: "p1", session_name: "AI Starter T8", start_date: "2026-08-24", status: "open" },
  { id: "s2", program_id: "p2", session_name: "Agent T8", start_date: "2026-08-29", status: "open" },
  { id: "s3", program_id: "p1", session_name: "AI Starter T7", start_date: "2026-07-01", status: "completed" },
];
const registrations = [
  { id: "r1", session_id: "s1", status: "pending_payment" },
  { id: "r2", session_id: "s1", status: "confirmed" },
  { id: "r3", session_id: "s1", status: "cancelled" },
  { id: "r4", session_id: "s2", status: "paid" },
  { id: "r5", session_id: "s2", status: "confirmed" },
  { id: "r6", session_id: "s2", status: "new" },
];

test("class report counts registrations and confirmed transfers per class, excluding cancelled", () => {
  const rows = classEnrollmentRows({ sessions, programs, registrations });
  assert.equal(rows[0].className, "Agent T8");
  assert.equal(rows[0].programName, "AI Agent");
  assert.equal(rows[0].registered, 3);
  assert.equal(rows[0].transferred, 1);
  assert.equal(rows[0].pending, 2);
  assert.equal(rows[0].cancelled, 0);

  const starter = rows.find((row) => row.id === "s1");
  assert.equal(starter.registered, 2);
  assert.equal(starter.transferred, 1);
  assert.equal(starter.pending, 1);
  assert.equal(starter.cancelled, 1);

  const empty = rows.find((row) => row.id === "s3");
  assert.equal(empty.registered, 0);
  assert.equal(empty.transferred, 0);

  const totals = summarizeRows(rows);
  assert.equal(totals.classes, 3);
  assert.equal(totals.registered, 5);
  assert.equal(totals.transferred, 2);
  assert.equal(totals.pending, 3);
  const snap = snapshotReport({ sessions, programs, registrations, generatedAt: "2026-08-28T03:16:00.000Z" });
  assert.equal(snap.generatedAt, "2026-08-28T03:16:00.000Z");
  assert.equal(snap.rows.length, 3);
  assert.equal(snap.totals.registered, 5);
});

test("class report filename and date follow the Vietnamese admin convention", () => {
  assert.equal(fmtDate("2026-08-28"), "28/08/2026");
  assert.equal(filename("2026-08-28T03:16:00.000Z"), "vsc-bao-cao-lop-2026-08-28.pdf");
});

test("class report PDF is a non-empty branded buffer", async () => {
  const buf = await renderPdf({
    sessions,
    programs,
    registrations,
    generatedAt: "2026-08-28T03:16:00.000Z",
  });
  assert.ok(Buffer.isBuffer(buf));
  assert.ok(buf.length > 1200);
  assert.equal(buf.slice(0, 4).toString(), "%PDF");
});
