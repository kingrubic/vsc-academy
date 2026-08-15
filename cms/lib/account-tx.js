function nextSessionVersion(row) {
  return Number(row?.session_version || 0) + 1;
}

function consumePasswordResetInSnap(snap, { tokenHash, passwordHash, now, expectedKind }) {
  const resets = snap.password_resets || (snap.password_resets = []);
  const row = resets.find((item) => item.token_hash === tokenHash || item.id === tokenHash);
  if (!row || row.used_at || String(row.expires_at) < now) return { claimed: false, reason: "invalid" };
  const studentId = row.student_id || "";
  const userId = row.user_id || "";
  const kind = studentId ? "students" : userId ? "users" : null;
  if (!kind) return { claimed: false, reason: "invalid" };
  if (expectedKind && kind !== expectedKind) return { claimed: false, reason: "wrong_kind" };
  if (studentId) {
    const student = (snap.students || []).find((item) => String(item.id) === String(studentId));
    if (!student || student.status === "suspended" || student.status === "inactive") {
      return { claimed: false, reason: "inactive" };
    }
    row.used_at = now;
    for (const other of resets) {
      if (other !== row && String(other.student_id || "") === String(studentId) && !other.used_at) {
        other.used_at = now;
      }
    }
    student.password_hash = passwordHash;
    student.activation_token = null;
    student.activation_expires_at = null;
    student.must_change_password = 0;
    student.status = student.status === "invited" ? "active" : student.status;
    student.session_version = nextSessionVersion(student);
    student.password_changed_at = now;
    student.updated_at = now;
    delete student.reset_access_operation_id;
    delete student.reset_access_operation_expires_at;
    delete student.reset_access_previous;
    return { claimed: true, kind: "students", targetId: student.id, sessionVersion: student.session_version };
  }
  if (userId) {
    const user = (snap.users || []).find((item) => String(item.id) === String(userId));
    if (!user || Number(user.active) !== 1) return { claimed: false, reason: "inactive" };
    row.used_at = now;
    for (const other of resets) {
      if (other !== row && String(other.user_id || "") === String(userId) && !other.used_at) {
        other.used_at = now;
      }
    }
    user.password_hash = passwordHash;
    user.must_change_password = 0;
    user.session_version = nextSessionVersion(user);
    user.password_changed_at = now;
    user.updated_at = now;
    return { claimed: true, kind: "users", targetId: user.id, sessionVersion: user.session_version };
  }
  return { claimed: false, reason: "invalid" };
}

function upsertInstructorAccountInSnap(snap, { instructor, user }) {
  const instructors = snap.instructors || (snap.instructors = []);
  const users = snap.users || (snap.users = []);
  const email = String(user?.email || instructor.email || "").trim().toLowerCase();
  if (user && email) {
    const emailOwner = users.find((row) => String(row.email || "").toLowerCase() === email);
    if (emailOwner && String(emailOwner.id) !== String(user.id)) {
      return { ok: false, error: "Email đã được dùng cho tài khoản khác" };
    }
    if (emailOwner && String(emailOwner.instructor_id || "") && String(emailOwner.instructor_id) !== String(instructor.id)) {
      return { ok: false, error: "Email đã gắn giảng viên khác" };
    }
    const link = users.find(
      (row) => String(row.instructor_id || "") === String(instructor.id) && String(row.id) !== String(user.id),
    );
    if (link) return { ok: false, error: "Giảng viên đã gắn tài khoản khác" };
  }
  const existingIns = instructors.findIndex((row) => String(row.id) === String(instructor.id));
  if (existingIns >= 0) instructors[existingIns] = { ...instructors[existingIns], ...instructor };
  else instructors.push(instructor);
  if (user) {
    const existingUser = users.findIndex((row) => String(row.id) === String(user.id));
    if (existingUser >= 0) users[existingUser] = { ...users[existingUser], ...user };
    else users.push(user);
  }
  return { ok: true, id: instructor.id };
}

function createStudentAccountInSnap(snap, student) {
  const students = snap.students || (snap.students = []);
  const email = String(student.email || "").trim().toLowerCase();
  if (students.some((row) => String(row.email || "").toLowerCase() === email && !row.deleted_at)) {
    return { ok: false, error: "Email already exists" };
  }
  students.push({ ...student, email, session_version: Number(student.session_version || 0) });
  return { ok: true, id: student.id };
}

function issuePasswordResetInSnap(snap, { tokenHash, studentId, userId, now, expiresAt, maxOutstanding }) {
  const resets = snap.password_resets || (snap.password_resets = []);
  const outstanding = resets.filter((row) => {
    if (row.used_at || String(row.expires_at || "") < now) return false;
    if (studentId) return String(row.student_id || "") === String(studentId);
    return String(row.user_id || "") === String(userId);
  });
  if (outstanding.length >= maxOutstanding) return { ok: false, reason: "limit" };
  resets.push({
    id: tokenHash,
    token_hash: tokenHash,
    student_id: studentId || null,
    user_id: userId || null,
    expires_at: expiresAt,
    used_at: null,
    created_at: now,
  });
  return { ok: true };
}

function consumeActivationInSnap(snap, { token, passwordHash, now }) {
  const student = (snap.students || []).find((row) => row.activation_token === token && !row.deleted_at);
  if (!student || student.status !== "invited") return { claimed: false, reason: "invalid" };
  if (student.activation_expires_at && String(student.activation_expires_at) < now) {
    return { claimed: false, reason: "expired" };
  }
  student.password_hash = passwordHash;
  student.activation_token = null;
  student.activation_expires_at = null;
  student.must_change_password = 0;
  student.status = "active";
  student.session_version = nextSessionVersion(student);
  student.password_changed_at = now;
  student.updated_at = now;
  delete student.reset_access_operation_id;
  delete student.reset_access_operation_expires_at;
  delete student.reset_access_previous;
  return { claimed: true, targetId: student.id, sessionVersion: student.session_version };
}

function revokeStudentResets(snap, studentId, now) {
  for (const row of snap.password_resets || []) {
    if (String(row.student_id || "") === String(studentId) && !row.used_at) {
      row.used_at = now;
      row.delivery_failed = row.delivery_failed || 0;
    }
  }
}

function markLearnerProvision(row, operationId) {
  row.provision_operation_id = operationId;
  row.provision_revision = Number(row.provision_revision || 0) + 1;
  return { id: row.id, revision: row.provision_revision };
}

function ownsLearnerProvision(row, operationId, ownership) {
  return !!row &&
    String(row.provision_operation_id || "") === String(operationId || "") &&
    Number(row.provision_revision || 0) === Number(ownership?.revision || 0);
}

function provisionLearnerAccountInSnap(snap, payload) {
  const operationId = String(payload.operationId || "");
  if (!operationId) return { ok: false, error: "Missing learner provision operation id" };
  const registration = { ...(payload.registration || {}) };
  const email = String(registration.email || "").trim().toLowerCase();
  const now = payload.now;
  const students = snap.students || (snap.students = []);
  const enrollments = snap.enrollments || (snap.enrollments = []);
  const registrations = snap.registrations || (snap.registrations = []);
  let student = students.find((row) => String(row.email || "").toLowerCase() === email && !row.deleted_at);
  let createdStudent = false;
  if (!student) {
    student = { ...(payload.student || {}), email };
    students.push(student);
    createdStudent = true;
  }
  const previousStudent = createdStudent ? null : { ...student };
  const studentOwnership = markLearnerProvision(student, operationId);
  let enrollment = enrollments.find(
    (row) => String(row.student_id) === String(student.id) && String(row.session_id) === String(registration.session_id),
  );
  let createdEnrollment = false;
  if (!enrollment) {
    enrollment = { ...(payload.enrollment || {}), student_id: student.id };
    enrollments.push(enrollment);
    createdEnrollment = true;
  }
  const previousEnrollment = createdEnrollment ? null : { ...enrollment };
  enrollment.registration_id = registration.id;
  const enrollmentOwnership = markLearnerProvision(enrollment, operationId);
  const previousRegistration = registrations.find((row) => String(row.id) === String(registration.id)) || null;
  const previousCopy = previousRegistration ? { ...previousRegistration } : null;
  const nextRegistration = previousRegistration
    ? { ...previousRegistration, ...registration, email, student_id: student.id, updated_at: now }
    : { ...registration, email, student_id: student.id, updated_at: now };
  const registrationOwnership = markLearnerProvision(nextRegistration, operationId);
  const idx = registrations.findIndex((row) => String(row.id) === String(registration.id));
  if (idx >= 0) registrations[idx] = nextRegistration;
  else registrations.push(nextRegistration);
  return {
    ok: true,
    operationId,
    student,
    enrollment,
    createdStudent,
    createdEnrollment,
    previousStudent,
    previousEnrollment,
    previousRegistration: previousCopy,
    activationToken: student.status === "invited" ? student.activation_token || null : null,
    ownership: {
      student: { ...studentOwnership, created: createdStudent },
      enrollment: { ...enrollmentOwnership, created: createdEnrollment },
      registration: { ...registrationOwnership, created: !previousCopy },
    },
  };
}

function finalizeLearnerProvisionInSnap(snap, payload) {
  const operationId = String(payload.operationId || "");
  const ownership = payload.ownership || {};
  const rows = [
    [(snap.students || []).find((row) => String(row.id) === String(ownership.student?.id)), ownership.student],
    [(snap.enrollments || []).find((row) => String(row.id) === String(ownership.enrollment?.id)), ownership.enrollment],
    [(snap.registrations || []).find((row) => String(row.id) === String(ownership.registration?.id)), ownership.registration],
  ];
  for (const [row, claimed] of rows) {
    if (ownsLearnerProvision(row, operationId, claimed)) {
      delete row.provision_operation_id;
      delete row.provision_revision;
    }
  }
  return { ok: true };
}

function abortLearnerProvisionInSnap(snap, payload) {
  const operationId = String(payload.operationId || "");
  const ownership = payload.ownership || {};
  const student = (snap.students || []).find((row) => String(row.id) === String(ownership.student?.id));
  const enrollment = (snap.enrollments || []).find((row) => String(row.id) === String(ownership.enrollment?.id));
  const registration = (snap.registrations || []).find((row) => String(row.id) === String(ownership.registration?.id));
  if (ownsLearnerProvision(student, operationId, ownership.student)) {
    if (ownership.student?.created) {
      snap.students = (snap.students || []).filter((row) => String(row.id) !== String(ownership.student.id));
    } else if (payload.previousStudent) {
      const idx = (snap.students || []).findIndex((row) => String(row.id) === String(ownership.student.id));
      if (idx >= 0) snap.students[idx] = { ...payload.previousStudent };
    }
  }
  if (ownsLearnerProvision(enrollment, operationId, ownership.enrollment)) {
    if (ownership.enrollment?.created) {
      snap.enrollments = (snap.enrollments || []).filter((row) => String(row.id) !== String(ownership.enrollment.id));
    } else if (payload.previousEnrollment) {
      const idx = (snap.enrollments || []).findIndex((row) => String(row.id) === String(ownership.enrollment.id));
      if (idx >= 0) snap.enrollments[idx] = { ...payload.previousEnrollment };
    }
  }
  if (ownsLearnerProvision(registration, operationId, ownership.registration)) {
    if (payload.previousRegistration) {
      const registrations = snap.registrations || (snap.registrations = []);
      const idx = registrations.findIndex((row) => String(row.id) === String(ownership.registration.id));
      if (idx >= 0) registrations[idx] = { ...payload.previousRegistration };
    } else if (ownership.registration?.created) {
      snap.registrations = (snap.registrations || []).filter((row) => String(row.id) !== String(ownership.registration.id));
    }
  }
  return { ok: true };
}

function beginResetAccessInSnap(snap, { studentId, operationId, activationToken, expiresAt, operationExpiresAt, now }) {
  const student = (snap.students || []).find((row) => String(row.id) === String(studentId) && !row.deleted_at);
  if (!student) return { ok: false, error: "Not found" };
  if (!operationId) return { ok: false, error: "Missing reset operation id" };
  if (student.status === "suspended" || student.status === "inactive") {
    return { ok: false, error: "Inactive accounts cannot be reset" };
  }
  if (student.reset_access_operation_id && String(student.reset_access_operation_expires_at || "") > now) {
    return { ok: false, error: "Reset access already in progress" };
  }
  const previous = student.reset_access_previous || {
    password_hash: student.password_hash,
    activation_token: student.activation_token,
    activation_expires_at: student.activation_expires_at,
    status: student.status,
    session_version: student.session_version,
    must_change_password: student.must_change_password,
  };
  revokeStudentResets(snap, studentId, now);
  student.password_hash = null;
  student.activation_token = activationToken;
  student.activation_expires_at = expiresAt;
  student.status = "invited";
  student.must_change_password = 0;
  student.session_version = nextSessionVersion(student);
  student.reset_access_operation_id = operationId;
  student.reset_access_operation_expires_at = operationExpiresAt;
  student.reset_access_previous = previous;
  student.updated_at = now;
  return {
    ok: true,
    previous,
    operationId,
    activationToken,
    sessionVersion: student.session_version,
  };
}

function finalizeResetAccessInSnap(snap, { studentId, operationId, activationToken, sessionVersion }) {
  const student = (snap.students || []).find((row) => String(row.id) === String(studentId));
  if (!student) return { ok: false, error: "Not found" };
  if (
    String(student.reset_access_operation_id || "") !== String(operationId || "") ||
    student.activation_token !== activationToken ||
    Number(student.session_version || 0) !== Number(sessionVersion || 0)
  ) return { ok: true, stale: true };
  delete student.reset_access_operation_id;
  delete student.reset_access_operation_expires_at;
  delete student.reset_access_previous;
  return { ok: true };
}

function abortResetAccessInSnap(snap, { studentId, operationId, activationToken, sessionVersion, previous, now }) {
  const student = (snap.students || []).find((row) => String(row.id) === String(studentId));
  if (!student || !previous) return { ok: false, error: "Not found" };
  if (
    String(student.reset_access_operation_id || "") !== String(operationId || "") ||
    student.activation_token !== activationToken ||
    Number(student.session_version || 0) !== Number(sessionVersion || 0)
  ) return { ok: true, stale: true };
  Object.assign(student, previous, {
    session_version: nextSessionVersion(student),
    updated_at: now,
  });
  delete student.reset_access_operation_id;
  delete student.reset_access_operation_expires_at;
  delete student.reset_access_previous;
  return { ok: true };
}

function cancelPasswordResetInSnap(snap, { tokenHash, now }) {
  const row = (snap.password_resets || []).find((item) => item.token_hash === tokenHash || item.id === tokenHash);
  if (!row) return { ok: false, reason: "missing" };
  row.used_at = now;
  row.delivery_failed = 1;
  return { ok: true };
}

function applyPasswordChangeInSnap(snap, { table, id, passwordHash, now }) {
  const list = snap[table] || [];
  const row = list.find((item) => String(item.id) === String(id));
  if (!row) throw new Error("not found");
  row.password_hash = passwordHash;
  row.must_change_password = 0;
  row.activation_token = null;
  row.activation_expires_at = null;
  if (table === "students" && row.status === "invited") row.status = "active";
  row.session_version = nextSessionVersion(row);
  row.password_changed_at = now;
  row.updated_at = now;
  if (table === "students") {
    delete row.reset_access_operation_id;
    delete row.reset_access_operation_expires_at;
    delete row.reset_access_previous;
  }
  return { sessionVersion: row.session_version };
}

const STUDENT_PATCH_FIELDS = new Set([
  "full_name", "phone", "avatar", "language_preference", "notes", "status", "last_login_at", "updated_at",
]);

function patchStudentFieldsInSnap(snap, { id, expectedSessionVersion, fields }) {
  const student = (snap.students || []).find((row) => String(row.id) === String(id) && !row.deleted_at);
  if (!student) return { ok: false, error: "Not found" };
  if (Number(student.session_version || 0) !== Number(expectedSessionVersion || 0)) {
    return { ok: false, stale: true };
  }
  const previousStatus = student.status;
  for (const [key, value] of Object.entries(fields || {})) {
    if (STUDENT_PATCH_FIELDS.has(key)) student[key] = value;
  }
  if (Object.prototype.hasOwnProperty.call(fields || {}, "status") && student.status !== previousStatus) {
    student.session_version = nextSessionVersion(student);
  }
  return { ok: true, student: { ...student } };
}

function withSnapLock(store, fn) {
  const prev = store._tx || Promise.resolve();
  let release = () => {};
  store._tx = new Promise((resolve) => {
    release = resolve;
  });
  const run = prev.then(fn, fn);
  run.then(release, release);
  return run;
}

function attachAccountTx(store, snap) {
  const baseUpsert = store.upsert.bind(store);
  store.upsert = (table, data) =>
    withSnapLock(store, () => {
      if (table === "students") return { id: data.id, rejected: true, reason: "dedicated_mutation_required" };
      return baseUpsert(table, data);
    });
  store.consumePasswordReset = (args) =>
    withSnapLock(store, () => consumePasswordResetInSnap(snap, args));
  store.upsertInstructorAccount = (payload) =>
    withSnapLock(store, () => upsertInstructorAccountInSnap(snap, payload));
  store.createStudentAccount = (student) =>
    withSnapLock(store, () => createStudentAccountInSnap(snap, student));
  store.applyPasswordChange = (args) =>
    withSnapLock(store, () => applyPasswordChangeInSnap(snap, args));
  store.patchStudentFields = (args) =>
    withSnapLock(store, () => patchStudentFieldsInSnap(snap, args));
  store.issuePasswordReset = (args) =>
    withSnapLock(store, () => issuePasswordResetInSnap(snap, args));
  store.consumeActivation = (args) =>
    withSnapLock(store, () => consumeActivationInSnap(snap, args));
  store.provisionLearnerAccount = (payload) =>
    withSnapLock(store, () => provisionLearnerAccountInSnap(snap, payload));
  store.finalizeLearnerProvision = (payload) =>
    withSnapLock(store, () => finalizeLearnerProvisionInSnap(snap, payload));
  store.abortLearnerProvision = (payload) =>
    withSnapLock(store, () => abortLearnerProvisionInSnap(snap, payload));
  store.beginResetAccess = (args) =>
    withSnapLock(store, () => beginResetAccessInSnap(snap, args));
  store.finalizeResetAccess = (args) =>
    withSnapLock(store, () => finalizeResetAccessInSnap(snap, args));
  store.abortResetAccess = (args) =>
    withSnapLock(store, () => abortResetAccessInSnap(snap, args));
  store.cancelPasswordReset = (args) =>
    withSnapLock(store, () => cancelPasswordResetInSnap(snap, args));
  return store;
}

module.exports = {
  consumePasswordResetInSnap,
  upsertInstructorAccountInSnap,
  createStudentAccountInSnap,
  applyPasswordChangeInSnap,
  issuePasswordResetInSnap,
  consumeActivationInSnap,
  provisionLearnerAccountInSnap,
  finalizeLearnerProvisionInSnap,
  abortLearnerProvisionInSnap,
  beginResetAccessInSnap,
  finalizeResetAccessInSnap,
  abortResetAccessInSnap,
  cancelPasswordResetInSnap,
  attachAccountTx,
  withSnapLock,
};
