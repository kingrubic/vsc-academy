const fs = require("fs");
const path = require("path");

const PRIVATE_ROOT = process.env.VSC_PRIVATE_DIR || path.join(__dirname, "..", "..", "..", ".vsc-academy-private");
const MATERIAL_DIR = path.join(PRIVATE_ROOT, "learner");
const CERTIFICATE_DIR = path.join(PRIVATE_ROOT, "certificates");

const SAFE_TYPES = new Map([
  ["application/pdf", { extensions: new Set([".pdf"]), magic: (b) => b.subarray(0, 5).toString() === "%PDF-" }],
  ["image/png", { extensions: new Set([".png"]), magic: (b) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) }],
  ["image/jpeg", { extensions: new Set([".jpg", ".jpeg"]), magic: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff }],
  ["image/webp", { extensions: new Set([".webp"]), magic: (b) => b.length >= 12 && b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" }],
]);

function ensurePrivateDirectories() {
  fs.mkdirSync(MATERIAL_DIR, { recursive: true, mode: 0o700 });
  fs.mkdirSync(CERTIFICATE_DIR, { recursive: true, mode: 0o700 });
}

function removeFile(filePath) {
  if (!filePath) return;
  try {
    fs.unlinkSync(filePath);
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
}

function normalizeStoredName(value, legacyPrefix) {
  if (typeof value !== "string" || !value) return null;
  if (path.basename(value) === value) return value;
  const prefix = `${legacyPrefix}/`;
  if (!legacyPrefix || !value.startsWith(prefix)) return null;
  const name = value.slice(prefix.length);
  return name && !name.includes("/") && !name.includes("\\") && path.basename(name) === name ? name : null;
}

function validateUploadedFile(file) {
  if (!file?.path) throw Object.assign(new Error("No file"), { status: 400 });
  try {
    const type = SAFE_TYPES.get(String(file.mimetype || "").toLowerCase());
    const ext = path.extname(file.originalname || "").toLowerCase();
    const bytes = fs.readFileSync(file.path);
    if (!type || !type.extensions.has(ext) || !type.magic(bytes)) {
      throw Object.assign(new Error("Unsupported or unsafe file content"), { status: 415 });
    }
    return { mime: String(file.mimetype).toLowerCase(), extension: ext };
  } catch (err) {
    removeFile(file.path);
    throw err;
  }
}

function privateFilePath(root, storedName) {
  const normalized = normalizeStoredName(storedName);
  if (!normalized) return null;
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(root, normalized);
  return resolved.startsWith(`${resolvedRoot}${path.sep}`) ? resolved : null;
}

function moveLegacyFile(source, destination) {
  if (!fs.existsSync(source)) return { moved: false, reason: "missing" };
  if (fs.existsSync(destination)) return { moved: false, reason: "collision" };
  fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
  try {
    fs.renameSync(source, destination);
  } catch (err) {
    if (err.code !== "EXDEV") throw err;
    fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
    fs.unlinkSync(source);
  }
  fs.chmodSync(destination, 0o600);
  return { moved: true, reason: "moved" };
}

async function migrateLegacyPrivateFiles(store, siteRoot, dirs = {}) {
  const snap = await store.dump(true);
  const migrated = [];
  const skipped = [];
  const groups = [
    { table: "learning_materials", field: "file_path", prefix: "uploads/learner", rows: snap.learning_materials || [], destination: dirs.materialDir || MATERIAL_DIR },
    { table: "certificates", field: "pdf_url", prefix: "uploads/certificates", rows: snap.certificates || [], destination: dirs.certificateDir || CERTIFICATE_DIR },
  ];
  for (const group of groups) {
    for (const row of group.rows) {
      const value = row[group.field];
      if (typeof value !== "string" || !value.startsWith(`${group.prefix}/`)) continue;
      const name = normalizeStoredName(value, group.prefix);
      if (!name) {
        skipped.push({ table: group.table, id: row.id, reason: "invalid" });
        continue;
      }
      const legacyRoot = path.resolve(siteRoot, group.prefix);
      const source = path.resolve(legacyRoot, name);
      if (!source.startsWith(`${legacyRoot}${path.sep}`)) {
        skipped.push({ table: group.table, id: row.id, reason: "invalid" });
        continue;
      }
      const destination = path.join(group.destination, name);
      const result = moveLegacyFile(source, destination);
      if (!result.moved) {
        if (result.reason === "collision") {
          throw new Error(`Private file migration collision for ${group.table}:${row.id}`);
        }
        skipped.push({ table: group.table, id: row.id, reason: result.reason });
        continue;
      }
      try {
        await store.upsert(group.table, { ...row, [group.field]: name });
      } catch (err) {
        try {
          moveLegacyFile(destination, source);
        } catch (rollbackErr) {
          err.rollbackError = rollbackErr;
        }
        throw err;
      }
      migrated.push({ table: group.table, id: row.id, name });
    }
  }
  return { migrated, skipped };
}

function setPrivateDownloadHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
}

function instructorOwnsSession(scope, sessionId) {
  return scope?.type !== "instructor" || scope.sessionIds.has(sessionId);
}

function instructorOwnsProgram(scope, programId) {
  return scope?.type !== "instructor" || scope.programIds.has(programId);
}

function instructorOwnsStudent(scope, snap, studentId) {
  if (scope?.type !== "instructor") return true;
  return (snap.enrollments || []).some(
    (row) => row.student_id === studentId && scope.sessionIds.has(row.session_id),
  );
}

function coalesceTargetId(incoming, existing) {
  if (incoming === undefined) return existing || null;
  if (incoming == null || incoming === "") return null;
  return String(incoming);
}

function targetId(value) {
  if (value == null) return "";
  return String(value).trim();
}

function hasInstructorTarget(target = {}) {
  return Boolean(
    targetId(target.sessionId) ||
      targetId(target.programId) ||
      targetId(target.studentId) ||
      targetId(target.meetingId),
  );
}

function instructorCanAccessTarget(scope, snap, target = {}) {
  if (scope?.type !== "instructor") return true;
  if (!hasInstructorTarget(target)) return false;
  const sessionId = targetId(target.sessionId);
  const programId = targetId(target.programId);
  const studentId = targetId(target.studentId);
  const meetingId = targetId(target.meetingId);
  if (sessionId && !instructorOwnsSession(scope, sessionId)) return false;
  if (programId && !instructorOwnsProgram(scope, programId)) return false;
  if (studentId && !instructorOwnsStudent(scope, snap, studentId)) return false;
  if (meetingId) {
    const meeting = (snap.class_meetings || []).find((row) => row.id === meetingId && !row.deleted_at);
    if (!meeting || !instructorOwnsSession(scope, meeting.session_id)) return false;
  }
  return true;
}

function announcementTargetSpec(targetType, target = {}) {
  const type = String(targetType || "all").trim().toLowerCase() || "all";
  if (type === "all") return { ok: true, type };
  if (type === "session") {
    if (!targetId(target.sessionId)) return { ok: false, error: "sessionId is required" };
    return { ok: true, type };
  }
  if (type === "program") {
    if (!targetId(target.programId)) return { ok: false, error: "programId is required" };
    return { ok: true, type };
  }
  if (type === "student") {
    if (!targetId(target.studentId)) return { ok: false, error: "studentId is required" };
    return { ok: true, type };
  }
  return { ok: false, error: "Invalid targetType" };
}

function evaluateAnnouncementTarget(scope, snap, input = {}) {
  const spec = announcementTargetSpec(input.targetType, input);
  if (!spec.ok) return { ok: false, status: 400, error: spec.error };
  if (scope?.type === "instructor" && spec.type === "all") {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  if (!instructorCanAccessTarget(scope, snap, input)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true, type: spec.type };
}

function scopedRows(scope, rows, sessionField = "session_id", programField = "program_id") {
  if (scope?.type !== "instructor") return rows || [];
  return (rows || []).filter((row) =>
    (row[sessionField] && scope.sessionIds.has(row[sessionField])) ||
    (!row[sessionField] && row[programField] && scope.programIds.has(row[programField])),
  );
}

function scopedTargetRows(scope, snap, rows) {
  return (rows || []).filter((row) =>
    instructorCanAccessTarget(scope, snap, {
      sessionId: row.session_id,
      programId: row.program_id,
      meetingId: row.meeting_id,
      studentId: row.student_id,
    }),
  );
}

function scopedCertificates(scope, rows, requestedSessionId) {
  return (rows || []).filter((row) =>
    instructorOwnsSession(scope, row.session_id) && (!requestedSessionId || row.session_id === requestedSessionId),
  );
}

function cleanupUploadOnFailure(filePath, persisted) {
  if (!persisted) removeFile(filePath);
}

function canRequestPasswordReset(student) {
  return !!student && student.status === "active" && !!student.password_hash;
}

function canExposeActivation(student) {
  return !!student && student.status === "invited";
}

ensurePrivateDirectories();

module.exports = {
  MATERIAL_DIR,
  CERTIFICATE_DIR,
  validateUploadedFile,
  removeFile,
  normalizeStoredName,
  privateFilePath,
  moveLegacyFile,
  migrateLegacyPrivateFiles,
  setPrivateDownloadHeaders,
  instructorOwnsSession,
  instructorOwnsProgram,
  instructorOwnsStudent,
  coalesceTargetId,
  hasInstructorTarget,
  instructorCanAccessTarget,
  announcementTargetSpec,
  evaluateAnnouncementTarget,
  scopedRows,
  scopedTargetRows,
  scopedCertificates,
  cleanupUploadOnFailure,
  canRequestPasswordReset,
  canExposeActivation,
};
