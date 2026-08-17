const crypto = require("crypto");
const { now, parseJson, alive, aliveById } = require("./convex-db");
const { hashPassword, randomId } = require("./auth");
const C = require("./lms-core");
const Cert = require("./certificate");
const Meetings = require("./session-meetings");
const { queueMail } = require("./notify");
const PasswordReset = require("./password-reset");

function newTemporaryPassword(length = 12) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length);
}

function publicStudent(row) {
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    avatar: row.avatar,
    status: row.status,
    languagePreference: row.language_preference,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    mustChangePassword: Number(row.must_change_password) === 1,
    sessionVersion: Number(row.session_version || 0),
  };
}

function programName(row, locale) {
  return Cert.programName(row, locale);
}

function meetingComputedStatus(meeting) {
  return C.meetingComputedStatus(meeting);
}

function enrollmentProgress(snap, enrollmentId, sessionId) {
  return C.enrollmentProgress(snap, enrollmentId, sessionId);
}

function studentSessionIds(snap, studentId) {
  return (snap.enrollments || [])
    .filter((r) => r.student_id === studentId && ["active", "completed", "paused"].includes(r.status))
    .map((r) => r.session_id);
}

function studentProgramIds(snap, studentId) {
  return [
    ...new Set(
      (snap.enrollments || [])
        .filter((r) => r.student_id === studentId && ["active", "completed", "paused"].includes(r.status))
        .map((r) => r.program_id),
    ),
  ];
}

function canSeeMaterial(snap, studentId, material) {
  if (material.status !== "published" || material.deleted_at) return false;
  if (material.published_at && material.published_at > now()) return false;
  if (material.visibility === "program") {
    return studentProgramIds(snap, studentId).includes(material.program_id);
  }
  if (material.visibility === "session") {
    return studentSessionIds(snap, studentId).includes(material.session_id);
  }
  if (material.visibility === "meeting") {
    const meeting = aliveById(snap.class_meetings, material.meeting_id);
    return meeting && studentSessionIds(snap, studentId).includes(meeting.session_id);
  }
  if (material.visibility === "students" || material.visibility === "specific") {
    const ids = parseJson(material.student_ids, []);
    return ids.includes(studentId);
  }
  return studentSessionIds(snap, studentId).includes(material.session_id);
}

function canSeeAnnouncement(snap, studentId, row) {
  if (row.status !== "published") return false;
  if (row.expires_at && row.expires_at < now()) return false;
  if (row.target_type === "all") return true;
  if (row.target_type === "student") return row.student_id === studentId;
  if (row.target_type === "program") return studentProgramIds(snap, studentId).includes(row.program_id);
  if (row.target_type === "session") return studentSessionIds(snap, studentId).includes(row.session_id);
  return false;
}

function serializeMeeting(row, locale = "vi", opts = {}) {
  const program = opts.program;
  const session = opts.session;
  const minutes = C.joinLinkOpenMinutes(program, session);
  const window = C.joinWindow(row, minutes);
  const status = window.status || C.meetingComputedStatus(row);
  const includeJoinUrl = opts.includeJoinUrl === true;
  return {
    id: row.id,
    meetingNumber: row.meeting_number || Number(row.sort_order || 0) + 1,
    title: locale === "en" ? row.title_en || row.title_vi : row.title_vi,
    description: locale === "en" ? row.description_en || row.description_vi || "" : row.description_vi || row.notes || "",
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    format: row.format,
    venueId: row.venue_id,
    onlinePlatform: row.online_platform || session?.online_platform || "",
    status,
    notes: locale === "en" ? row.notes_en || row.notes : row.notes_vi || row.notes,
    sortOrder: row.sort_order,
    canJoin: window.canJoin,
    joinOpensAt: window.openAt ? new Date(window.openAt).toISOString() : null,
    hasMeetingUrl: !!(row.meeting_url || session?.meeting_url),
    hasRecording: !!row.recording_url,
    recordingUrl: status === "completed" ? row.recording_url || "" : "",
    meetingUrl: includeJoinUrl && window.canJoin ? row.meeting_url || session?.meeting_url || "" : "",
  };
}

function studentCertificate(snap, enrollment) {
  const issued = (snap.certificates || []).find(
    (c) => c.enrollment_id === enrollment.id && c.status === "issued",
  );
  const latest = (snap.certificates || [])
    .filter((c) => c.enrollment_id === enrollment.id)
    .sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")))[0];
  const program = byProgram(snap, enrollment.program_id);
  const check = evaluateSafe(snap, enrollment, program);
  if (issued) {
    return {
      status: "issued",
      certificateId: issued.id,
      certificateCode: issued.certificate_code,
      issueDate: issued.issue_date,
      verificationUrl: issued.verification_url,
    };
  }
  if (latest?.status === "revoked") return { status: "revoked" };
  if (check.eligible) return { status: "eligible" };
  if (enrollment.status === "completed" || enrollment.completion_status === "completed") {
    return { status: "pending" };
  }
  return { status: check.certificateStatus || "none" };
}

function evaluateSafe(snap, enrollment, program) {
  try {
    return C.evaluateEligibility(snap, enrollment, program);
  } catch {
    return { eligible: false, reasons: [], certificateStatus: "none", completionStatus: "in_progress", attendance: { percent: 0 } };
  }
}

async function hydrateEnrollment(store, snap, enrollment, locale = "vi") {
  const program = byProgram(snap, enrollment.program_id);
  const session = aliveById(snap.sessions, enrollment.session_id);
  if (session) await Meetings.ensureSessionMeetings(store, snap, session);
  const venue = session?.venue_id
    ? aliveById(snap.venues, session.venue_id)
    : program?.venue_default_id
      ? aliveById(snap.venues, program.venue_default_id)
      : null;
  const instructor = program?.primary_instructor_id
    ? aliveById(snap.instructors, program.primary_instructor_id)
    : null;
  const progress = enrollmentProgress(snap, enrollment.id, enrollment.session_id);
  const check = evaluateSafe(snap, enrollment, program);
  const today = now().slice(0, 10);
  const clock = now().slice(11, 16);
  const nextMeeting = alive(snap.class_meetings)
    .filter((m) => m.session_id === enrollment.session_id && !["cancelled", "completed"].includes(m.status))
    .filter((m) => m.date > today || (m.date === today && m.end_time > clock))
    .sort((a, b) => `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`))[0];
  const derived = {
    progress: progress.percent,
    completion_status: check.completionStatus,
    certificate_status: check.certificateStatus,
    updated_at: now(),
  };
  if (
    progress.percent !== enrollment.progress ||
    enrollment.completion_status !== check.completionStatus ||
    enrollment.certificate_status !== check.certificateStatus
  ) {
    await store.upsert("enrollments", { ...enrollment, ...derived });
  }
  return {
    id: enrollment.id,
    status: enrollment.status,
    paymentStatus: enrollment.payment_status,
    completionStatus: check.completionStatus,
    certificateStatus: check.certificateStatus,
    joinedAt: enrollment.joined_at,
    completedAt: enrollment.completed_at,
    progress,
    attendance: check.attendance,
    program: program
      ? {
          id: program.id,
          name: programName(program, locale),
          format: session?.format || program.format,
          duration: locale === "en" ? program.duration_label_en || program.duration_label_vi : program.duration_label_vi,
          description: parseJson(locale === "en" ? program.content_en : program.content_vi, {}).description || "",
        }
      : null,
    session: session
      ? {
          id: session.id,
          name: session.session_name,
          startDate: session.start_date,
          startTime: session.start_time,
          endTime: session.end_time,
          format: session.format || program?.format,
          onlinePlatform: session.online_platform,
        }
      : null,
    venue: venue
      ? {
          id: venue.id,
          name: venue.name,
          address: locale === "en" ? venue.address_en || venue.address_vi : venue.address_vi,
          mapUrl: venue.map_url,
          instructions: locale === "en" ? venue.notes_en || venue.notes : venue.notes,
        }
      : null,
    instructor: instructor
      ? {
          id: instructor.id,
          name: instructor.name,
          title: instructor.academic_title,
          role: instructor.role,
          bio: locale === "en" ? instructor.bio_en || instructor.bio_vi : instructor.bio_vi,
          photo: instructor.photo,
        }
      : null,
    nextMeeting: nextMeeting ? serializeMeeting(nextMeeting, locale, { program, session }) : null,
    certificate: studentCertificate(snap, enrollment),
  };
}

function byProgram(snap, id) {
  return aliveById(snap.programs, id) || byIdAll(snap.programs, id);
}

function byIdAll(rows, id) {
  return (rows || []).find((row) => String(row.id) === String(id)) || null;
}

function meetingForStudent(snap, studentId, meetingId) {
  const meeting = aliveById(snap.class_meetings, meetingId);
  if (!meeting) return null;
  if (!studentSessionIds(snap, studentId).includes(meeting.session_id)) return null;
  return meeting;
}

function resolveJoinUrl(snap, meeting) {
  const session = aliveById(snap.sessions, meeting.session_id);
  const program = byProgram(snap, session?.program_id);
  const minutes = C.joinLinkOpenMinutes(program, session);
  const window = C.joinWindow({ ...meeting, session_meeting_url: session?.meeting_url }, minutes);
  const url = meeting.meeting_url || session?.meeting_url || "";
  return { ...window, url, session, program, minutes };
}

async function sendActivationEmail(store, student, token) {
  const origin = PasswordReset.requireSecurityMail();
  const activationUrl = `${origin}/hoc-vien/kich-hoat?token=${token}`;
  const mailed = await queueMail(
    store,
    student.email,
    "Kích hoạt tài khoản VSC Academy Learner Portal",
    `Chào ${student.full_name},\n\nTài khoản học viên của bạn đã được tạo. Đặt mật khẩu tại:\n${activationUrl}\n\nLink hết hạn sau 7 ngày.\n\nVSC Academy`,
    "activation",
    {
      studentId: student.id,
      html: `<p>Chào ${student.full_name},</p><p>Đặt mật khẩu tại:</p><p><a href="${activationUrl}">${activationUrl}</a></p><p>Link hết hạn sau 7 ngày.</p><p>VSC Academy</p>`,
    },
  );
  if (!mailed.sent) {
    throw Object.assign(new Error("Không gửi được email kích hoạt"), {
      status: 503,
      code: mailed.reason || "SMTP_SEND_FAILED",
    });
  }
  return { emailed: true, to: student.email };
}

async function ensureStudentAndEnrollment(store, snap, registration) {
  const email = String(registration.email || "").trim().toLowerCase();
  if (!email || !registration.session_id || !registration.program_id) {
    return { created: false };
  }
  const existing = alive(snap.students).find((row) => row.email === email);
  const temporaryPassword = existing ? null : newTemporaryPassword();

  const ts = now();
  const studentDraft = existing || {
    id: randomId("stu"),
    full_name: registration.full_name,
    email,
    phone: registration.phone || "",
    avatar: "",
    password_hash: hashPassword(temporaryPassword),
    activation_token: null,
    activation_expires_at: null,
    must_change_password: 1,
    status: "active",
    language_preference: registration.locale || "vi",
    last_login_at: null,
    notes: "",
    session_version: 0,
    created_at: ts,
    updated_at: ts,
  };
  const payment =
    registration.status === "paid" || registration.status === "confirmed" ? "paid" : "pending";
  const enrollmentDraft = {
    id: randomId("enr"),
    student_id: studentDraft.id,
    program_id: registration.program_id,
    session_id: registration.session_id,
    registration_id: registration.id,
    status: "active",
    payment_status: payment,
    progress: 0,
    completion_status: "in_progress",
    certificate_status: "none",
    joined_at: ts,
    completed_at: null,
    notes: "",
    created_at: ts,
    updated_at: ts,
  };
  const operationId = randomId("provision");
  const provisioned = await store.provisionLearnerAccount({
    operationId,
    registration: { ...registration, email },
    student: studentDraft,
    enrollment: enrollmentDraft,
    now: ts,
  });
  if (!provisioned?.ok) {
    throw Object.assign(new Error(provisioned?.error || "Không tạo được tài khoản học viên"), { status: 400 });
  }
  await Meetings.ensureSessionMeetings(store, snap, aliveById(snap.sessions, registration.session_id));
  try {
    await store.finalizeLearnerProvision({ operationId, ownership: provisioned.ownership });
    return {
      created: true,
      studentCreated: !!provisioned.createdStudent,
      student: publicStudent(provisioned.student),
      enrollment: provisioned.enrollment,
      emailed: false,
      to: provisioned.createdStudent ? provisioned.student.email : undefined,
      temporaryPassword: provisioned.createdStudent ? temporaryPassword : undefined,
    };
  } catch (err) {
    await store.abortLearnerProvision({
      operationId,
      ownership: provisioned.ownership,
      previousStudent: provisioned.previousStudent,
      previousEnrollment: provisioned.previousEnrollment,
      previousRegistration: provisioned.previousRegistration,
    });
    throw err;
  }
}

async function setStudentPassword(store, student, password) {
  const ts = now();
  const passwordHash = hashPassword(password);
  if (typeof store.applyPasswordChange === "function") {
    return store.applyPasswordChange({ table: "students", id: student.id, passwordHash, now: ts });
  }
  throw new Error("Atomic student password mutation is unavailable");
}

function instructorScope(snap, user) {
  if (!user) return { type: "none" };
  if (user.role === "OWNER" || user.role === "ADMIN") return { type: "all" };
  if (user.role === "EDITOR") return { type: "editor" };
  if (user.role !== "INSTRUCTOR") return { type: "none" };
  const instructorId = user.instructorId || user.instructor_id;
  const programIds = new Set(
    (snap.program_instructors || [])
      .filter((r) => r.instructor_id === instructorId)
      .map((r) => r.program_id),
  );
  alive(snap.programs).forEach((p) => {
    if (p.primary_instructor_id === instructorId) programIds.add(p.id);
  });
  const sessionIds = new Set(
    alive(snap.sessions)
      .filter((s) => programIds.has(s.program_id))
      .map((s) => s.id),
  );
  return { type: "instructor", instructorId, programIds, sessionIds };
}

module.exports = {
  publicStudent,
  programName,
  meetingComputedStatus,
  enrollmentProgress,
  canSeeMaterial,
  canSeeAnnouncement,
  hydrateEnrollment,
  serializeMeeting,
  ensureStudentAndEnrollment,
  sendActivationEmail,
  setStudentPassword,
  studentSessionIds,
  studentProgramIds,
  meetingForStudent,
  resolveJoinUrl,
  instructorScope,
  studentCertificate,
};
