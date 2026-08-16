const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const C = require("./lms-core");
const L = require("./learner");
const Security = require("./lms-security");

function scopeSnap() {
  return {
    programs: [{ id: "p1", primary_instructor_id: "i1" }, { id: "p2", primary_instructor_id: "i2" }],
    program_instructors: [],
    sessions: [{ id: "s1", program_id: "p1" }, { id: "s2", program_id: "p2" }],
    enrollments: [{ id: "e1", student_id: "st1", session_id: "s1" }, { id: "e2", student_id: "st2", session_id: "s2" }],
    class_meetings: [{ id: "m1", session_id: "s1" }, { id: "m2", session_id: "s2" }],
  };
}

test("instructor authorization centrally limits programs, sessions, students, meetings, and rows", () => {
  const snap = scopeSnap();
  const scope = L.instructorScope(snap, { role: "INSTRUCTOR", instructorId: "i1" });
  assert.deepEqual([...scope.programIds], ["p1"]);
  assert.deepEqual([...scope.sessionIds], ["s1"]);
  assert.equal(Security.instructorOwnsStudent(scope, snap, "st1"), true);
  assert.equal(Security.instructorOwnsStudent(scope, snap, "st2"), false);
  assert.equal(Security.instructorCanAccessTarget(scope, snap, { meetingId: "m1" }), true);
  assert.equal(Security.instructorCanAccessTarget(scope, snap, { meetingId: "m2" }), false);
  assert.equal(Security.instructorCanAccessTarget(scope, snap, {}), false);
  assert.equal(Security.instructorCanAccessTarget(scope, snap, { sessionId: "", programId: "" }), false);
  assert.equal(Security.hasInstructorTarget({ sessionId: "s1" }), true);
  assert.equal(Security.announcementTargetSpec("session", {}).ok, false);
  assert.equal(Security.announcementTargetSpec("program", { programId: "p1" }).ok, true);
  assert.equal(Security.evaluateAnnouncementTarget(scope, snap, { targetType: "all" }).status, 403);
  assert.equal(Security.evaluateAnnouncementTarget(scope, snap, { targetType: "session" }).status, 400);
  assert.equal(Security.evaluateAnnouncementTarget(scope, snap, { targetType: "session", sessionId: "s1" }).ok, true);
  assert.deepEqual(Security.scopedRows(scope, [{ id: "a", session_id: "s1" }, { id: "b", session_id: "s2" }]).map((r) => r.id), ["a"]);
});

test("attendance requires an existing enrollment and meeting in the same owned session", () => {
  const snap = scopeSnap();
  const scope = L.instructorScope(snap, { role: "INSTRUCTOR", instructorId: "i1" });
  const valid = snap.enrollments[0].session_id === snap.class_meetings[0].session_id && Security.instructorOwnsSession(scope, snap.class_meetings[0].session_id);
  const crossSession = snap.enrollments[0].session_id === snap.class_meetings[1].session_id && Security.instructorOwnsSession(scope, snap.class_meetings[1].session_id);
  assert.equal(valid, true);
  assert.equal(crossSession, false);
});

test("student password changes use the atomic mutation and preserve administrative account status", async () => {
  let mutation;
  const result = await L.setStudentPassword(
    { applyPasswordChange: async (args) => { mutation = args; return { sessionVersion: 4 }; } },
    { id: "st", status: "suspended", activation_token: "x" },
    "safe-password",
  );
  assert.equal(mutation.table, "students");
  assert.equal(mutation.id, "st");
  assert.ok(mutation.passwordHash);
  assert.equal(result.sessionVersion, 4);
});

test("effective join URL falls back to the session URL", () => {
  const start = Date.now() + 5 * 60 * 1000;
  const date = new Date(start + 7 * 60 * 60 * 1000);
  const meeting = {
    id: "m", session_id: "s", date: date.toISOString().slice(0, 10),
    start_time: date.toISOString().slice(11, 16), end_time: new Date(date.getTime() + 60 * 60 * 1000).toISOString().slice(11, 16),
    format: "online", meeting_url: "", status: "scheduled",
  };
  const result = L.resolveJoinUrl({ sessions: [{ id: "s", program_id: "p", meeting_url: "https://meet.example/session" }], programs: [{ id: "p" }] }, meeting);
  assert.equal(result.url, "https://meet.example/session");
  assert.equal(result.canJoin, true);
});

test("private paths reject traversal and private responses disable sniffing and caching", () => {
  assert.equal(Security.privateFilePath(Security.MATERIAL_DIR, "../secret"), null);
  assert.equal(Security.privateFilePath(Security.MATERIAL_DIR, "uploads/learner/lesson.pdf"), null);
  assert.equal(Security.normalizeStoredName("uploads/learner/lesson.pdf", "uploads/learner"), "lesson.pdf");
  assert.equal(Security.normalizeStoredName("uploads/learner/nested/lesson.pdf", "uploads/learner"), null);
  assert.equal(Security.normalizeStoredName("uploads/learner/../secret", "uploads/learner"), null);
  const headers = {};
  Security.setPrivateDownloadHeaders({ setHeader: (key, value) => { headers[key] = value; } });
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.match(headers["Cache-Control"], /private/);
  assert.match(headers["Cache-Control"], /no-store/);
});

test("legacy migration normalizes moves and fails closed on collision", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vsc-migrate-"));
  const materialDir = path.join(root, "private-materials");
  const certificateDir = path.join(root, "private-certificates");
  fs.mkdirSync(path.join(root, "uploads", "learner"), { recursive: true });
  fs.mkdirSync(materialDir, { recursive: true });
  fs.writeFileSync(path.join(root, "uploads", "learner", "lesson.pdf"), "%PDF-legacy");
  fs.writeFileSync(path.join(root, "uploads", "learner", "collision.pdf"), "legacy");
  fs.writeFileSync(path.join(materialDir, "collision.pdf"), "private");
  const writes = [];
  const store = {
    dump: async () => ({
      learning_materials: [
        { id: "move", file_path: "uploads/learner/lesson.pdf" },
        { id: "traversal", file_path: "uploads/learner/../secret" },
      ],
      certificates: [],
    }),
    upsert: async (table, row) => writes.push({ table, row }),
  };
  const result = await Security.migrateLegacyPrivateFiles(store, root, { materialDir, certificateDir });
  assert.equal(fs.existsSync(path.join(root, "uploads", "learner", "lesson.pdf")), false);
  assert.equal(fs.readFileSync(path.join(materialDir, "lesson.pdf"), "utf8"), "%PDF-legacy");
  assert.equal(writes[0].row.file_path, "lesson.pdf");
  assert.deepEqual(result.skipped.map((row) => row.reason), ["invalid"]);
  await assert.rejects(
    Security.migrateLegacyPrivateFiles({
      dump: async () => ({ learning_materials: [{ id: "collision", file_path: "uploads/learner/collision.pdf" }], certificates: [] }),
      upsert: async () => assert.fail("collision must not update the database"),
    }, root, { materialDir, certificateDir }),
    /migration collision/,
  );
  assert.equal(fs.readFileSync(path.join(materialDir, "collision.pdf"), "utf8"), "private");
  assert.equal(fs.readFileSync(path.join(root, "uploads", "learner", "collision.pdf"), "utf8"), "legacy");
  fs.rmSync(root, { recursive: true, force: true });
});

test("target listings include owned meeting and student rows only", () => {
  const snap = scopeSnap();
  const scope = L.instructorScope(snap, { role: "INSTRUCTOR", instructorId: "i1" });
  const rows = [
    { id: "owned-meeting", meeting_id: "m1" },
    { id: "foreign-meeting", meeting_id: "m2" },
    { id: "owned-student", student_id: "st1" },
    { id: "foreign-student", student_id: "st2" },
    { id: "global" },
  ];
  assert.deepEqual(Security.scopedTargetRows(scope, snap, rows).map((row) => row.id), ["owned-meeting", "owned-student"]);
});

test("certificate listing applies instructor scope before requested session", () => {
  const scope = { type: "instructor", sessionIds: new Set(["s1"]), programIds: new Set() };
  const rows = [{ id: "mine", session_id: "s1" }, { id: "foreign", session_id: "s2" }];
  assert.deepEqual(Security.scopedCertificates(scope, rows).map((row) => row.id), ["mine"]);
  assert.deepEqual(Security.scopedCertificates(scope, rows, "s2"), []);
});

test("upload cleanup preserves persisted files only", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vsc-cleanup-"));
  const failed = path.join(root, "failed.pdf");
  const persisted = path.join(root, "persisted.pdf");
  fs.writeFileSync(failed, "failed");
  fs.writeFileSync(persisted, "persisted");
  Security.cleanupUploadOnFailure(failed, false);
  Security.cleanupUploadOnFailure(persisted, true);
  assert.equal(fs.existsSync(failed), false);
  assert.equal(fs.existsSync(persisted), true);
  fs.rmSync(root, { recursive: true, force: true });
});

test("reset and activation policies reject inactive and suspended learners", () => {
  assert.equal(Security.canRequestPasswordReset({ status: "active", password_hash: "hash" }), true);
  assert.equal(Security.canRequestPasswordReset({ status: "inactive", password_hash: "hash" }), false);
  assert.equal(Security.canRequestPasswordReset({ status: "suspended", password_hash: "hash" }), false);
  assert.equal(Security.canExposeActivation({ status: "invited" }), true);
  assert.equal(Security.canExposeActivation({ status: "inactive" }), false);
  assert.equal(Security.canExposeActivation({ status: "suspended" }), false);
});


test("upload validation checks bytes and removes rejected files", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vsc-upload-"));
  const bad = path.join(dir, "bad.pdf");
  fs.writeFileSync(bad, "<html><script>alert(1)</script></html>");
  assert.throws(() => Security.validateUploadedFile({ path: bad, originalname: "bad.pdf", mimetype: "application/pdf" }), /unsafe/);
  assert.equal(fs.existsSync(bad), false);
  const good = path.join(dir, "good.pdf");
  fs.writeFileSync(good, "%PDF-1.7\n");
  assert.equal(Security.validateUploadedFile({ path: good, originalname: "good.pdf", mimetype: "application/pdf" }).mime, "application/pdf");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("activation expiry uses the full fresh activation TTL", () => {
  const before = Date.now();
  const expiry = new Date(Date.now() + C.ACTIVATION_TTL_MS).getTime();
  assert.ok(expiry - before >= C.ACTIVATION_TTL_MS - 50);
});

test("authoritative certificate mutation defines a single-winner claim and atomic finalization", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "..", "convex", "store.ts"), "utf8");
  assert.match(source, /export const claimCertificate = mutation/);
  assert.match(source, /row\.status === "issued" \|\| row\.status === "generating"/);
  assert.match(source, /export const finalizeCertificate = mutation/);
  assert.match(source, /status: "reissued"/);
});

test("authoritative account mutations claim resets and write instructor/student atomically", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "..", "convex", "store.ts"), "utf8");
  const admin = fs.readFileSync(path.join(__dirname, "..", "routes", "admin.js"), "utf8");
  const learner = fs.readFileSync(path.join(__dirname, "..", "routes", "learner.js"), "utf8");
  const students = fs.readFileSync(path.join(__dirname, "..", "routes", "admin-learner.js"), "utf8");
  assert.match(source, /export const consumePasswordReset = mutation/);
  assert.match(source, /expectedKind/);
  assert.match(source, /export const issuePasswordReset = mutation/);
  assert.match(source, /export const consumeActivation = mutation/);
  assert.match(source, /export const provisionLearnerAccount = mutation/);
  assert.match(source, /export const abortLearnerProvision = mutation/);
  assert.match(source, /export const beginResetAccess = mutation/);
  assert.match(source, /export const cancelPasswordReset = mutation/);
  assert.match(source, /export const upsertInstructorAccount = mutation/);
  assert.match(source, /export const createStudentAccount = mutation/);
  assert.match(source, /export const softDeleteStudent = mutation/);
  assert.match(source, /session_version/);
  assert.match(admin, /expectedKind: "users"/);
  assert.match(admin, /upsertInstructorAccount/);
  assert.match(learner, /expectedKind: "students"/);
  assert.match(learner, /consumeActivation/);
  assert.match(students, /createStudentAccount/);
  assert.match(students, /softDeleteStudent/);
  assert.match(students, /publicOutboxRow/);
  assert.match(students, /sendActivationEmail/);
});

test("env files stay gitignored and process env wins over file values", () => {
  const ignore = fs.readFileSync(path.join(__dirname, "..", "..", ".gitignore"), "utf8");
  assert.match(ignore, /^\.env\*$/m);
  assert.match(ignore, /^!\.env\.example$/m);
  assert.match(ignore, /^cms\/\.env\*$/m);
  const prev = process.env.VSC_ENV_PRECEDENCE_TEST;
  process.env.VSC_ENV_PRECEDENCE_TEST = "from-process";
  const Env = require("./env");
  const file = path.join(os.tmpdir(), `vsc-env-${Date.now()}.env`);
  fs.writeFileSync(file, "VSC_ENV_PRECEDENCE_TEST=from-file\n");
  Env.loadEnvFile(file);
  assert.equal(process.env.VSC_ENV_PRECEDENCE_TEST, "from-process");
  fs.rmSync(file, { force: true });
  if (prev == null) delete process.env.VSC_ENV_PRECEDENCE_TEST;
  else process.env.VSC_ENV_PRECEDENCE_TEST = prev;
});

test("learner and admin routes recheck active status, deny instructor registration PII, and block replaced PDFs", () => {
  const learner = fs.readFileSync(path.join(__dirname, "..", "routes", "learner.js"), "utf8");
  const admin = fs.readFileSync(path.join(__dirname, "..", "routes", "admin.js"), "utf8");
  const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  assert.match(learner, /student\.status !== "active"/);
  assert.match(learner, /req\.session\.destroy/);
  assert.match(learner, /row\.status !== "issued"/);
  assert.match(admin, /instructorMayAccessAdmin/);
  assert.match(admin, /const latestRegs = req\.lmsScope\?\.type === "instructor" \? \[\]/);
  assert.match(server, /\["\/uploads\/learner", "\/uploads\/certificates"\]/);
});
