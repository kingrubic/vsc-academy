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

function provisionLearnerAccountInSnap(snap, payload) {
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
  let enrollment = enrollments.find(
    (row) => String(row.student_id) === String(student.id) && String(row.session_id) === String(registration.session_id),
  );
  let createdEnrollment = false;
  if (!enrollment) {
    enrollment = { ...(payload.enrollment || {}), student_id: student.id };
    enrollments.push(enrollment);
    createdEnrollment = true;
  }
  const previousRegistration = registrations.find((row) => String(row.id) === String(registration.id)) || null;
  const previousCopy = previousRegistration ? { ...previousRegistration } : null;
  const nextRegistration = { ...registration, email, student_id: student.id, updated_at: now };
  const idx = registrations.findIndex((row) => String(row.id) === String(registration.id));
  if (idx >= 0) registrations[idx] = { ...registrations[idx], ...nextRegistration };
  else registrations.push(nextRegistration);
  return {
    ok: true,
    student,
    enrollment,
    createdStudent,
    createdEnrollment,
    previousRegistration: previousCopy,
    activationToken: createdStudent ? student.activation_token : null,
  };
}

function abortLearnerProvisionInSnap(snap, payload) {
  if (payload.createdStudentId) {
    snap.students = (snap.students || []).filter((row) => String(row.id) !== String(payload.createdStudentId));
  }
  if (payload.createdEnrollmentId) {
    snap.enrollments = (snap.enrollments || []).filter((row) => String(row.id) !== String(payload.createdEnrollmentId));
  }
  const registrations = snap.registrations || (snap.registrations = []);
  if (payload.previousRegistration) {
    const idx = registrations.findIndex((row) => String(row.id) === String(payload.previousRegistration.id));
    if (idx >= 0) registrations[idx] = { ...payload.previousRegistration };
    else registrations.push({ ...payload.previousRegistration });
  } else if (payload.registrationId) {
    snap.registrations = registrations.filter((row) => String(row.id) !== String(payload.registrationId));
  }
  return { ok: true };
}

function beginResetAccessInSnap(snap, { studentId, activationToken, expiresAt, now }) {
  const student = (snap.students || []).find((row) => String(row.id) === String(studentId) && !row.deleted_at);
  if (!student) return { ok: false, error: "Not found" };
  if (student.status === "suspended" || student.status === "inactive") {
    return { ok: false, error: "Inactive accounts cannot be reset" };
  }
  const previous = {
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
  student.updated_at = now;
  return { ok: true, previous, sessionVersion: student.session_version };
}

function abortResetAccessInSnap(snap, { studentId, previous, now }) {
  const student = (snap.students || []).find((row) => String(row.id) === String(studentId));
  if (!student || !previous) return { ok: false, error: "Not found" };
  Object.assign(student, previous, { updated_at: now });
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
  return { sessionVersion: row.session_version };
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
  store.consumePasswordReset = (args) =>
    withSnapLock(store, () => consumePasswordResetInSnap(snap, args));
  store.upsertInstructorAccount = (payload) =>
    withSnapLock(store, () => upsertInstructorAccountInSnap(snap, payload));
  store.createStudentAccount = (student) =>
    withSnapLock(store, () => createStudentAccountInSnap(snap, student));
  store.applyPasswordChange = (args) =>
    withSnapLock(store, () => applyPasswordChangeInSnap(snap, args));
  store.issuePasswordReset = (args) =>
    withSnapLock(store, () => issuePasswordResetInSnap(snap, args));
  store.consumeActivation = (args) =>
    withSnapLock(store, () => consumeActivationInSnap(snap, args));
  store.provisionLearnerAccount = (payload) =>
    withSnapLock(store, () => provisionLearnerAccountInSnap(snap, payload));
  store.abortLearnerProvision = (payload) =>
    withSnapLock(store, () => abortLearnerProvisionInSnap(snap, payload));
  store.beginResetAccess = (args) =>
    withSnapLock(store, () => beginResetAccessInSnap(snap, args));
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
  abortLearnerProvisionInSnap,
  beginResetAccessInSnap,
  abortResetAccessInSnap,
  cancelPasswordResetInSnap,
  attachAccountTx,
  withSnapLock,
};
