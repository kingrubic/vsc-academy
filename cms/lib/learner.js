const crypto = require("crypto");
const { now, parseJson, alive, aliveById } = require("./convex-db");
const { hashPassword, randomId } = require("./auth");

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
  };
}

function programName(row, locale) {
  const content = parseJson(locale === "en" ? row.content_en : row.content_vi, {});
  return content.shortName || content.name || row.id;
}

function meetingComputedStatus(meeting) {
  if (meeting.status === "cancelled" || meeting.status === "rescheduled") return meeting.status;
  const start = new Date(`${meeting.date}T${meeting.start_time}:00+07:00`);
  const end = new Date(`${meeting.date}T${meeting.end_time}:00+07:00`);
  const n = Date.now();
  if (Number.isNaN(start.getTime())) return meeting.status || "upcoming";
  if (n > end.getTime()) return "completed";
  if (n >= start.getTime() && n <= end.getTime()) return "live";
  return meeting.status === "completed" ? "completed" : "upcoming";
}

function enrollmentProgress(snap, enrollmentId, sessionId) {
  const meetings = alive(snap.class_meetings).filter(
    (m) => m.session_id === sessionId && m.status !== "cancelled",
  );
  const attendance = (snap.attendance || []).filter((a) => a.enrollment_id === enrollmentId);
  const attMap = Object.fromEntries(attendance.map((a) => [a.meeting_id, a.status]));
  let completed = 0;
  meetings.forEach((m) => {
    const st = meetingComputedStatus(m);
    if (st === "completed" || attMap[m.id] === "present") completed += 1;
  });
  const total = meetings.length;
  const pct = total ? Math.round((completed / total) * 100) : 0;
  return { completed, total, percent: pct };
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
  if (material.visibility === "students") {
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

function serializeMeeting(row, locale = "vi") {
  return {
    id: row.id,
    title: locale === "en" ? row.title_en || row.title_vi : row.title_vi,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    format: row.format,
    meetingUrl: row.meeting_url,
    recordingUrl: row.recording_url,
    venueId: row.venue_id,
    status: meetingComputedStatus(row),
    notes: row.notes,
    sortOrder: row.sort_order,
  };
}

async function hydrateEnrollment(store, snap, enrollment, locale = "vi") {
  const program = byProgram(snap, enrollment.program_id);
  const session = aliveById(snap.sessions, enrollment.session_id);
  const venue = session?.venue_id
    ? aliveById(snap.venues, session.venue_id)
    : program?.venue_default_id
      ? aliveById(snap.venues, program.venue_default_id)
      : null;
  const instructor = program?.primary_instructor_id
    ? aliveById(snap.instructors, program.primary_instructor_id)
    : null;
  const progress = enrollmentProgress(snap, enrollment.id, enrollment.session_id);
  const today = now().slice(0, 10);
  const clock = now().slice(11, 16);
  const nextMeeting = alive(snap.class_meetings)
    .filter((m) => m.session_id === enrollment.session_id && !["cancelled", "completed"].includes(m.status))
    .filter((m) => m.date > today || (m.date === today && m.end_time > clock))
    .sort((a, b) => `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`))[0];
  if (progress.percent !== enrollment.progress) {
    await store.upsert("enrollments", { ...enrollment, progress: progress.percent, updated_at: now() });
  }
  return {
    id: enrollment.id,
    status: enrollment.status,
    paymentStatus: enrollment.payment_status,
    joinedAt: enrollment.joined_at,
    completedAt: enrollment.completed_at,
    progress,
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
          meetingUrl: session.meeting_url,
          onlinePlatform: session.online_platform,
        }
      : null,
    venue: venue
      ? {
          id: venue.id,
          name: venue.name,
          address: locale === "en" ? venue.address_en || venue.address_vi : venue.address_vi,
          mapUrl: venue.map_url,
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
    nextMeeting: nextMeeting ? serializeMeeting(nextMeeting, locale) : null,
    certificate:
      enrollment.status === "completed"
        ? { status: "pending", label: locale === "en" ? "Certificate is being prepared" : "Chứng nhận đang được cập nhật" }
        : null,
  };
}

function byProgram(snap, id) {
  return aliveById(snap.programs, id) || byIdAll(snap.programs, id);
}

function byIdAll(rows, id) {
  return (rows || []).find((row) => String(row.id) === String(id)) || null;
}

async function ensureStudentAndEnrollment(store, snap, registration) {
  const email = String(registration.email || "").trim().toLowerCase();
  if (!email || !registration.session_id || !registration.program_id) {
    return { created: false };
  }
  const ts = now();
  let student = alive(snap.students).find((row) => row.email === email);
  let activationToken = null;
  if (!student) {
    activationToken = crypto.randomBytes(24).toString("hex");
    const id = randomId("stu");
    student = {
      id,
      full_name: registration.full_name,
      email,
      phone: registration.phone || "",
      avatar: "",
      password_hash: null,
      activation_token: activationToken,
      status: "invited",
      language_preference: registration.locale || "vi",
      last_login_at: null,
      notes: "",
      created_at: ts,
      updated_at: ts,
    };
    await store.upsert("students", student);
  }
  await store.upsert("registrations", { ...registration, student_id: student.id, updated_at: ts });
  let enrollment = (snap.enrollments || []).find(
    (row) => row.student_id === student.id && row.session_id === registration.session_id,
  );
  if (!enrollment) {
    const enrollmentId = randomId("enr");
    const payment =
      registration.status === "paid" || registration.status === "confirmed" ? "paid" : "pending";
    enrollment = {
      id: enrollmentId,
      student_id: student.id,
      program_id: registration.program_id,
      session_id: registration.session_id,
      registration_id: registration.id,
      status: "active",
      payment_status: payment,
      progress: 0,
      joined_at: ts,
      completed_at: null,
      notes: "",
      created_at: ts,
      updated_at: ts,
    };
    await store.upsert("enrollments", enrollment);
  }
  return {
    created: true,
    student: publicStudent(student),
    enrollment,
    activationToken,
    activationPath: activationToken ? `/hoc-vien/kich-hoat?token=${activationToken}` : null,
  };
}

async function setStudentPassword(store, student, password) {
  await store.upsert("students", {
    ...student,
    password_hash: hashPassword(password),
    activation_token: null,
    status: "active",
    updated_at: now(),
  });
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
  setStudentPassword,
  studentSessionIds,
};
