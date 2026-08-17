const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { now, parseJson, alive, aliveById, like, programShortName } = require("../lib/convex-db");
const { requireRole, randomId, editorLocked, hashPassword } = require("../lib/auth");
const V = require("../lib/validate");
const L = require("../lib/learner");
const C = require("../lib/lms-core");
const Cert = require("../lib/certificate");
const { notifyStudents, sessionStudentIds, programStudentIds, publicOutboxRow } = require("../lib/notify");
const PasswordReset = require("../lib/password-reset");
const Security = require("../lib/lms-security");

const LEARNER_UPLOAD = Security.MATERIAL_DIR;
fs.mkdirSync(LEARNER_UPLOAD, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, LEARNER_UPLOAD),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().slice(0, 8);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
});

function studentClassRows(snap, studentId, lmsScope) {
  return (snap.enrollments || [])
    .filter((e) => e.student_id === studentId && !e.deleted_at && e.status !== "cancelled")
    .filter((e) => Security.instructorOwnsSession(lmsScope, e.session_id))
    .map((e) => {
      const session = aliveById(snap.sessions, e.session_id);
      return {
        enrollment_id: e.id,
        session_id: e.session_id,
        session_name: session?.session_name || "",
        status: e.status,
        payment_status: e.payment_status,
      };
    });
}

async function createEnrollment(store, student, session, paymentStatus = "paid") {
  const id = randomId("enr");
  const ts = now();
  await store.upsert("enrollments", {
    id,
    student_id: student.id,
    program_id: session.program_id,
    session_id: session.id,
    registration_id: null,
    status: "active",
    payment_status: paymentStatus || "paid",
    progress: 0,
    completion_status: "in_progress",
    certificate_status: "none",
    joined_at: ts,
    completed_at: null,
    notes: "",
    created_at: ts,
    updated_at: ts,
  });
  return id;
}

function attachLearnerAdmin(router, store) {
  router.get("/students", async (req, res) => {
    const q = String(req.query.q || "").trim();
    const sessionId = String(req.query.sessionId || "").trim();
    const snap = await store.dump();
    const items = alive(snap.students)
      .filter((s) => {
        if (req.lmsScope?.type === "instructor") {
          const allowed = new Set(
            (snap.enrollments || [])
              .filter((e) => req.lmsScope.sessionIds.has(e.session_id))
              .map((e) => e.student_id),
          );
          if (!allowed.has(s.id)) return false;
        }
        if (sessionId) {
          const inClass = (snap.enrollments || []).some(
            (e) =>
              e.student_id === s.id &&
              !e.deleted_at &&
              String(e.session_id) === sessionId &&
              Security.instructorOwnsSession(req.lmsScope, e.session_id),
          );
          if (!inClass) return false;
        }
        return !q || like(s.full_name, q) || like(s.email, q) || like(s.phone, q);
      })
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .map((s) => {
        const classes = studentClassRows(snap, s.id, req.lmsScope);
        return {
          id: s.id,
          full_name: s.full_name,
          email: s.email,
          phone: s.phone,
          avatar: s.avatar,
          status: s.status,
          language_preference: s.language_preference,
          last_login_at: s.last_login_at,
          created_at: s.created_at,
          classes,
          active_courses: classes.filter((c) => c.status === "active").length,
          completed_courses: classes.filter((c) => c.status === "completed").length,
        };
      });
    res.json({ items });
  });

  router.get("/students/:id", async (req, res) => {
    const snap = await store.dump();
    const student = aliveById(snap.students, req.params.id);
    if (!student) return res.status(404).json({ error: "Not found" });
    if (req.lmsScope?.type === "instructor") {
      const allowed = (snap.enrollments || []).some(
        (e) => e.student_id === student.id && req.lmsScope.sessionIds.has(e.session_id),
      );
      if (!allowed) return res.status(403).json({ error: "Forbidden" });
    }
    const enrollments = (snap.enrollments || [])
      .filter((e) => e.student_id === student.id && !e.deleted_at)
      .filter((e) => Security.instructorOwnsSession(req.lmsScope, e.session_id))
      .sort((a, b) => String(b.joined_at).localeCompare(String(a.joined_at)))
      .map((row) => {
        const session = aliveById(snap.sessions, row.session_id);
        const program = aliveById(snap.programs, row.program_id);
        const cert = (snap.certificates || []).find((c) => c.enrollment_id === row.id && c.status === "issued");
        return {
          ...row,
          session_name: session?.session_name,
          start_date: session?.start_date,
          program_name: programShortName(program),
          progress: L.enrollmentProgress(snap, row.id, row.session_id),
          certificate_status: cert ? "issued" : row.certificate_status || "none",
        };
      });
    const meetings = alive(snap.class_meetings)
      .filter((m) => Security.instructorOwnsSession(req.lmsScope, m.session_id))
      .flatMap((m) => {
        return (snap.enrollments || [])
          .filter((e) => e.student_id === student.id && e.session_id === m.session_id && e.status !== "cancelled")
          .map((e) => {
            const att = (snap.attendance || []).find((a) => a.meeting_id === m.id && a.enrollment_id === e.id);
            return {
              id: m.id,
              title_vi: m.title_vi,
              date: m.date,
              start_time: m.start_time,
              session_id: m.session_id,
              enrollment_id: e.id,
              attendance: att?.status || "not_recorded",
            };
          });
      })
      .sort((a, b) => `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`));
    res.json({
      student: { ...L.publicStudent(student), notes: student.notes, status: student.status },
      enrollments,
      meetings,
      attendance: meetings,
      certificates: (snap.certificates || []).filter(
        (c) => c.student_id === student.id && Security.instructorOwnsSession(req.lmsScope, c.session_id),
      ),
    });
  });

  router.post("/students", requireRole("OWNER", "ADMIN"), async (req, res) => {
    try {
      V.required(req.body, ["fullName", "email"]);
      V.email(req.body.email);
      const email = String(req.body.email).trim().toLowerCase();
      const temporaryPassword = String(req.body.temporaryPassword || "");
      if (temporaryPassword.length < 8) throw V.fail("Mật khẩu tạm tối thiểu 8 ký tự");
      const sessionId = String(req.body.sessionId || "").trim();
      const snap = await store.dump(true);
      const session = sessionId ? aliveById(snap.sessions, sessionId) : null;
      if (sessionId && !session) throw V.fail("Không tìm thấy lớp");
      const id = randomId("stu");
      const ts = now();
      const result = await store.createStudentAccount({
        id,
        full_name: req.body.fullName,
        email,
        phone: req.body.phone || "",
        avatar: "",
        password_hash: hashPassword(temporaryPassword),
        activation_token: null,
        must_change_password: 1,
        status: "active",
        language_preference: req.body.languagePreference || "vi",
        last_login_at: null,
        notes: "",
        session_version: 0,
        created_at: ts,
        updated_at: ts,
      });
      if (!result?.ok) throw V.fail(result?.error || "Không tạo được học viên");
      let enrollmentId = null;
      if (session) {
        enrollmentId = await createEnrollment(store, { id }, session, req.body.paymentStatus);
      }
      res.json({ ok: true, id, enrollmentId });
    } catch (err) {
      res.status(err.status || 400).json({ error: err.message });
    }
  });

  router.put("/students/:id", requireRole("OWNER", "ADMIN"), async (req, res) => {
    const snap = await store.dump(true);
    const row = aliveById(snap.students, req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });
    const patched = await store.patchStudentFields({
      id: row.id,
      expectedSessionVersion: Number(row.session_version || 0),
      fields: {
        full_name: req.body.fullName || row.full_name,
        phone: req.body.phone ?? row.phone,
        status: req.body.status || row.status,
        language_preference: req.body.languagePreference || row.language_preference,
        notes: req.body.notes ?? row.notes,
        updated_at: now(),
      },
    });
    if (!patched?.ok) {
      return res.status(patched?.stale ? 409 : 404).json({
        error: patched?.stale ? "Tài khoản vừa thay đổi, vui lòng thử lại" : "Not found",
      });
    }
    res.json({ ok: true });
  });

  router.delete("/students/:id", requireRole("OWNER", "ADMIN"), async (req, res) => {
    try {
      const snap = await store.dump(true);
      const row = aliveById(snap.students, req.params.id);
      if (!row) return res.status(404).json({ error: "Not found" });
      const deleted = await store.softDeleteStudent({ id: row.id, now: now() });
      if (!deleted?.ok) return res.status(404).json({ error: deleted?.error || "Not found" });
      res.json({ ok: true, cancelledEnrollments: deleted.cancelledEnrollments || 0 });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Không xóa được học viên" });
    }
  });

  router.post("/students/:id/reset-access", requireRole("OWNER", "ADMIN"), async (req, res) => {
    try {
      const snap = await store.dump(true);
      const row = aliveById(snap.students, req.params.id);
      if (!row) return res.status(404).json({ error: "Not found" });
      if (row.status === "suspended" || row.status === "inactive") {
        return res.status(409).json({ error: "Inactive accounts cannot be reset" });
      }
      PasswordReset.requireSecurityMail();
      const token = C.newSecretToken();
      const operationId = randomId("reset-access");
      const started = await store.beginResetAccess({
        studentId: row.id,
        operationId,
        activationToken: token,
        expiresAt: new Date(Date.now() + C.ACTIVATION_TTL_MS).toISOString(),
        operationExpiresAt: new Date(Date.now() + 60_000).toISOString(),
        now: now(),
      });
      if (!started?.ok) {
        return res.status(started?.error === "Not found" ? 404 : 409).json({ error: started?.error || "Không cấp lại được quyền truy cập" });
      }
      try {
        const mailed = await L.sendActivationEmail(store, { ...row, status: "invited" }, token);
        await store.finalizeResetAccess({
          studentId: row.id,
          operationId,
          activationToken: token,
          sessionVersion: started.sessionVersion,
        });
        res.setHeader("Cache-Control", "no-store");
        res.json({ ok: true, emailed: mailed.emailed, to: mailed.to });
      } catch (err) {
        await store.abortResetAccess({
          studentId: row.id,
          operationId,
          activationToken: token,
          sessionVersion: started.sessionVersion,
          previous: started.previous,
          now: now(),
        });
        throw err;
      }
    } catch (err) {
      res.status(err.status || 400).json({ error: err.message });
    }
  });

  router.post("/students/:id/reset-password", requireRole("OWNER", "ADMIN"), async (req, res) => {
    try {
      const snap = await store.dump(true);
      const row = aliveById(snap.students, req.params.id);
      if (!row) return res.status(404).json({ error: "Not found" });
      if (row.status === "suspended" || row.status === "inactive") {
        return res.status(409).json({ error: "Không thể đặt lại mật khẩu cho tài khoản đang khóa" });
      }
      const result = await PasswordReset.issuePasswordReset(store, req, {
        studentId: row.id,
        email: row.email,
        name: row.full_name,
        path: "/hoc-vien/dat-lai-mat-khau",
        kind: "password_reset",
        subject: "Đặt lại mật khẩu VSC Academy Learner Portal",
      });
      res.json({ ok: true, emailed: result.emailed, to: result.to });
    } catch (err) {
      res.status(err.status || 400).json({ error: err.message });
    }
  });

  router.post("/students/:id/enroll", requireRole("OWNER", "ADMIN"), async (req, res) => {
    try {
      V.required(req.body, ["sessionId"]);
      const snap = await store.dump(true);
      const student = aliveById(snap.students, req.params.id);
      const session = aliveById(snap.sessions, req.body.sessionId);
      if (!student || !session) throw V.fail("Student or session not found");
      if ((snap.enrollments || []).some((e) => e.student_id === student.id && e.session_id === session.id && !e.deleted_at)) {
        throw V.fail("Học viên đã ghi danh lớp này");
      }
      const id = await createEnrollment(store, student, session, req.body.paymentStatus);
      res.json({ ok: true, id });
    } catch (err) {
      res.status(err.status || 400).json({ error: err.message });
    }
  });

  router.post("/enrollments", requireRole("OWNER", "ADMIN"), async (req, res) => {
    try {
      V.required(req.body, ["studentId", "sessionId"]);
      const snap = await store.dump(true);
      const student = aliveById(snap.students, req.body.studentId);
      const session = aliveById(snap.sessions, req.body.sessionId);
      if (!student || !session) throw V.fail("Học viên hoặc lớp không tồn tại");
      if ((snap.enrollments || []).some((e) => e.student_id === student.id && e.session_id === session.id && !e.deleted_at)) {
        throw V.fail("Học viên đã ghi danh lớp này");
      }
      const id = randomId("enr");
      const ts = now();
      await store.upsert("enrollments", {
        id,
        student_id: student.id,
        program_id: session.program_id,
        session_id: session.id,
        registration_id: null,
        status: req.body.status || "active",
        payment_status: req.body.paymentStatus || "paid",
        progress: 0,
        completion_status: "in_progress",
        certificate_status: "none",
        joined_at: ts,
        completed_at: null,
        notes: req.body.notes || "",
        created_at: ts,
        updated_at: ts,
      });
      res.json({ ok: true, id });
    } catch (err) {
      res.status(err.status || 400).json({ error: err.message });
    }
  });

  router.get("/enrollments/:id", async (req, res) => {
    const snap = await store.dump();
    const row = (snap.enrollments || []).find((e) => e.id === req.params.id && !e.deleted_at);
    if (!row) return res.status(404).json({ error: "Not found" });
    if (!Security.instructorOwnsSession(req.lmsScope, row.session_id)) return res.status(403).json({ error: "Forbidden" });
    const student = aliveById(snap.students, row.student_id);
    const session = aliveById(snap.sessions, row.session_id);
    const program = aliveById(snap.programs, row.program_id);
    res.json({
      ...row,
      student_name: student?.full_name,
      student_email: student?.email,
      session_name: session?.session_name,
      program_name: programShortName(program),
      progress: L.enrollmentProgress(snap, row.id, row.session_id),
    });
  });

  router.put("/enrollments/:id", requireRole("OWNER", "ADMIN"), async (req, res) => {
    try {
      const snap = await store.dump(true);
      const row = (snap.enrollments || []).find((e) => e.id === req.params.id && !e.deleted_at);
      if (!row) return res.status(404).json({ error: "Not found" });
      let sessionId = req.body.sessionId || row.session_id;
      let programId = row.program_id;
      if (req.body.sessionId && req.body.sessionId !== row.session_id) {
        const session = aliveById(snap.sessions, req.body.sessionId);
        if (!session) return res.status(400).json({ error: "Lớp học không tồn tại" });
        sessionId = session.id;
        programId = session.program_id;
      }
      const status = req.body.status || row.status;
      const completionStatus =
        req.body.completionStatus ||
        (status === "completed" ? "completed" : row.completion_status || "in_progress");
      await store.upsert("enrollments", {
        ...row,
        session_id: sessionId,
        program_id: programId,
        status,
        payment_status: req.body.paymentStatus || row.payment_status,
        completion_status: completionStatus,
        notes: req.body.notes ?? row.notes,
        completed_at: status === "completed" || completionStatus === "completed" ? now() : row.completed_at,
        updated_at: now(),
        updated_by: req.session.user.id,
      });
      res.json({ ok: true });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Không lưu được ghi danh" });
    }
  });

  router.delete("/enrollments/:id", requireRole("OWNER", "ADMIN"), async (req, res) => {
    try {
      const snap = await store.dump(true);
      const row = (snap.enrollments || []).find((e) => e.id === req.params.id && !e.deleted_at);
      if (!row) return res.status(404).json({ error: "Not found" });
      const issued = (snap.certificates || []).some((c) => c.enrollment_id === row.id && c.status === "issued");
      if (issued) return res.status(409).json({ error: "Không xóa được ghi danh đã có chứng nhận đã cấp" });
      const ts = now();
      await store.upsert("enrollments", {
        ...row,
        status: "cancelled",
        deleted_at: ts,
        updated_at: ts,
        updated_by: req.session.user.id,
      });
      res.json({ ok: true });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Không xóa được ghi danh" });
    }
  });

  router.post("/enrollments/:id/recommend-completion", requireRole("OWNER", "ADMIN", "INSTRUCTOR"), async (req, res) => {
    const snap = await store.dump(true);
    const row = (snap.enrollments || []).find((e) => e.id === req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });
    if (req.lmsScope?.type === "instructor" && !req.lmsScope.sessionIds.has(row.session_id)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const ts = now();
    await store.upsert("enrollments", {
      ...row,
      completion_status: row.completion_status === "completed" ? row.completion_status : "eligible",
      completion_recommended_at: ts,
      completion_recommended_by: req.session.user.id,
      updated_at: ts,
      updated_by: req.session.user.id,
    });
    await Cert.writeAudit(store, "enrollment.recommend_completion", req.session.user, {
      type: "enrollment",
      id: row.id,
    });
    res.json({ ok: true });
  });

  router.put("/attendance", requireRole("OWNER", "ADMIN", "INSTRUCTOR"), async (req, res) => {
    try {
      V.required(req.body, ["enrollmentId", "meetingId", "status"]);
      const snap = await store.dump(true);
      const enrollment = (snap.enrollments || []).find((row) => row.id === req.body.enrollmentId && !row.deleted_at);
      const meeting = aliveById(snap.class_meetings, req.body.meetingId);
      if (!enrollment || !meeting || enrollment.session_id !== meeting.session_id) {
        throw V.fail("Enrollment and meeting must belong to the same session");
      }
      if (!Security.instructorOwnsSession(req.lmsScope, meeting.session_id)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const id = `${req.body.enrollmentId}::${req.body.meetingId}`;
      const existing = (snap.attendance || []).find(
        (a) => a.enrollment_id === req.body.enrollmentId && a.meeting_id === req.body.meetingId,
      );
      await store.upsert("attendance", {
        ...(existing || {}),
        id,
        enrollment_id: req.body.enrollmentId,
        meeting_id: req.body.meetingId,
        status: req.body.status,
        notes: req.body.notes || "",
        checked_at: now(),
        checked_by: req.session.user.id,
        updated_at: now(),
        updated_by: req.session.user.id,
        created_at: existing?.created_at || now(),
        created_by: existing?.created_by || req.session.user.id,
      });
      res.json({ ok: true });
    } catch (err) {
      res.status(err.status || 400).json({ error: err.message });
    }
  });

  router.get("/meetings", async (req, res) => {
    const sessionId = req.query.sessionId || null;
    const snap = await store.dump();
    const items = alive(snap.class_meetings)
      .filter((m) => Security.instructorOwnsSession(req.lmsScope, m.session_id))
      .filter((m) => !sessionId || m.session_id === sessionId)
      .sort((a, b) => `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`));
    res.json({ items });
  });

  router.post("/meetings", requireRole("OWNER", "ADMIN", "INSTRUCTOR"), async (req, res) => {
    try {
      V.required(req.body, ["sessionId", "date", "startTime", "endTime"]);
      if (!Security.instructorOwnsSession(req.lmsScope, req.body.sessionId)) return res.status(403).json({ error: "Forbidden" });
      const id = randomId("mtg");
      const ts = now();
      await store.upsert("class_meetings", {
        id,
        session_id: req.body.sessionId,
        title_vi: req.body.titleVi || "Buổi học",
        title_en: req.body.titleEn || "",
        description_vi: req.body.descriptionVi || "",
        description_en: req.body.descriptionEn || "",
        date: req.body.date,
        start_time: req.body.startTime,
        end_time: req.body.endTime,
        meeting_number: req.body.meetingNumber || Number(req.body.sortOrder || 0) + 1,
        format: req.body.format || null,
        venue_id: req.body.venueId || null,
        online_platform: req.body.onlinePlatform || "",
        meeting_url: req.body.meetingUrl || "",
        status: req.body.status || "scheduled",
        notes: "",
        recording_url: req.body.recordingUrl || "",
        materials_released: 0,
        sort_order: req.body.sortOrder || 0,
        created_at: ts,
        updated_at: ts,
      });
      res.json({ ok: true, id });
    } catch (err) {
      res.status(err.status || 400).json({ error: err.message });
    }
  });

  router.put("/meetings/:id", requireRole("OWNER", "ADMIN", "INSTRUCTOR"), async (req, res) => {
    const snap = await store.dump(true);
    const row = aliveById(snap.class_meetings, req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });
    if (!Security.instructorOwnsSession(req.lmsScope, row.session_id)) return res.status(403).json({ error: "Forbidden" });
    const nextDate = req.body.date || row.date;
    const nextStart = req.body.startTime || row.start_time;
    const nextStatus = req.body.status || row.status;
    await store.upsert("class_meetings", {
      ...row,
      title_vi: req.body.titleVi ?? row.title_vi,
      title_en: req.body.titleEn ?? row.title_en,
      description_vi: req.body.descriptionVi ?? row.description_vi,
      description_en: req.body.descriptionEn ?? row.description_en,
      date: nextDate,
      start_time: nextStart,
      end_time: req.body.endTime || row.end_time,
      format: req.body.format ?? row.format,
      venue_id: req.body.venueId ?? row.venue_id,
      online_platform: req.body.onlinePlatform ?? row.online_platform,
      meeting_url: req.body.meetingUrl ?? row.meeting_url,
      status: nextStatus,
      recording_url: req.body.recordingUrl ?? row.recording_url,
      notes: req.body.notes ?? row.notes,
      updated_at: now(),
      updated_by: req.session.user.id,
    });
    if (nextDate !== row.date || nextStart !== row.start_time || nextStatus === "cancelled" || nextStatus === "rescheduled") {
      const ids = sessionStudentIds(snap, row.session_id);
      await notifyStudents(store, ids, {
        type: "meeting",
        titleVi: nextStatus === "cancelled" ? "Buổi học đã bị hủy" : "Thay đổi lịch học",
        titleEn: nextStatus === "cancelled" ? "Class cancelled" : "Schedule updated",
        bodyVi: `Buổi học ngày ${row.date} đã được cập nhật.`,
        bodyEn: `The class on ${row.date} has been updated.`,
        link: "/hoc-vien/lich-hoc",
      });
    }
    res.json({ ok: true });
  });

  router.delete("/meetings/:id", requireRole("OWNER", "ADMIN"), async (req, res) => {
    const snap = await store.dump(true);
    const row = aliveById(snap.class_meetings, req.params.id);
    if (row) await store.upsert("class_meetings", { ...row, deleted_at: now(), updated_at: now() });
    res.json({ ok: true });
  });

  router.get("/materials", async (req, res) => {
    const snap = await store.dump();
    res.json({
      items: Security.scopedTargetRows(req.lmsScope, snap, alive(snap.learning_materials)).sort(
        (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || String(b.published_at).localeCompare(String(a.published_at)),
      ),
    });
  });

  router.post("/materials", requireRole("OWNER", "ADMIN", "EDITOR", "INSTRUCTOR"), upload.single("file"), async (req, res) => {
    let persisted = false;
    try {
      const body = req.body || {};
      if (!body.titleVi) throw V.fail("titleVi is required");
      const id = randomId("mat");
      const ts = now();
      let filePath = "";
      if (req.file) {
        Security.validateUploadedFile(req.file);
        filePath = req.file.filename;
      }
      const scopeSnap = await store.dump(true);
      const target = {
        programId: Security.coalesceTargetId(body.programId),
        sessionId: Security.coalesceTargetId(body.sessionId),
        meetingId: Security.coalesceTargetId(body.meetingId),
      };
      if (!Security.instructorCanAccessTarget(req.lmsScope, scopeSnap, target)) {
        throw Object.assign(V.fail("Forbidden"), { status: 403 });
      }
      await store.upsert("learning_materials", {
        id,
        program_id: target.programId,
        session_id: target.sessionId,
        meeting_id: target.meetingId,
        title_vi: body.titleVi,
        title_en: body.titleEn || "",
        description_vi: body.descriptionVi || "",
        description_en: body.descriptionEn || "",
        type: body.type || "pdf",
        file_url: body.fileUrl || "",
        file_path: filePath,
        external_url: body.externalUrl || "",
        visibility: body.visibility || "session",
        student_ids: "[]",
        phase: body.phase || "during",
        published_at: body.publishedAt || ts.slice(0, 10),
        sort_order: Number(body.sortOrder || 0),
        downloadable: body.downloadable === "0" ? 0 : 1,
        status: body.status || "published",
        created_at: ts,
        updated_at: ts,
        created_by: req.session.user.id,
      });
      persisted = true;
      if ((body.status || "published") === "published") {
        const fresh = await store.dump(true);
        const ids = body.sessionId
          ? sessionStudentIds(fresh, body.sessionId)
          : body.programId
            ? programStudentIds(fresh, body.programId)
            : [];
        try {
          await notifyStudents(store, ids, {
            type: "material",
            titleVi: "Tài liệu mới",
            titleEn: "New material",
            bodyVi: `${body.titleVi} đã được cập nhật.`,
            bodyEn: `${body.titleEn || body.titleVi} has been published.`,
            link: "/hoc-vien/tai-lieu",
          });
        } catch (err) {
          console.error("material notification failed", err);
        }
      }
      res.json({ ok: true, id });
    } catch (err) {
      Security.cleanupUploadOnFailure(req.file?.path, persisted);
      res.status(err.status || 400).json({ error: err.message });
    }
  });

  router.put("/materials/:id", requireRole("OWNER", "ADMIN", "EDITOR", "INSTRUCTOR"), async (req, res) => {
    const snap = await store.dump(true);
    const row = aliveById(snap.learning_materials, req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });
    const currentTarget = {
      sessionId: row.session_id,
      programId: row.program_id,
      meetingId: row.meeting_id,
    };
    const nextTarget = {
      sessionId: Security.coalesceTargetId(req.body.sessionId, row.session_id),
      programId: Security.coalesceTargetId(req.body.programId, row.program_id),
      meetingId: Security.coalesceTargetId(req.body.meetingId, row.meeting_id),
    };
    if (!Security.instructorCanAccessTarget(req.lmsScope, snap, currentTarget)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (!Security.instructorCanAccessTarget(req.lmsScope, snap, nextTarget)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await store.upsert("learning_materials", {
      ...row,
      program_id: nextTarget.programId,
      session_id: nextTarget.sessionId,
      meeting_id: nextTarget.meetingId,
      title_vi: req.body.titleVi ?? row.title_vi,
      title_en: req.body.titleEn ?? row.title_en,
      description_vi: req.body.descriptionVi ?? row.description_vi,
      description_en: req.body.descriptionEn ?? row.description_en,
      type: req.body.type || row.type,
      file_url: req.body.fileUrl ?? row.file_url,
      external_url: req.body.externalUrl ?? row.external_url,
      visibility: req.body.visibility || row.visibility,
      phase: req.body.phase || row.phase,
      published_at: req.body.publishedAt ?? row.published_at,
      downloadable: req.body.downloadable === false ? 0 : 1,
      status: req.body.status || row.status,
      updated_at: now(),
    });
    res.json({ ok: true });
  });

  router.delete("/materials/:id", requireRole("OWNER", "ADMIN"), async (req, res) => {
    const snap = await store.dump(true);
    const row = aliveById(snap.learning_materials, req.params.id);
    if (row) await store.upsert("learning_materials", { ...row, deleted_at: now(), updated_at: now() });
    res.json({ ok: true });
  });

  router.get("/announcements", async (req, res) => {
    const snap = await store.dump();
    res.json({
      items: Security.scopedTargetRows(req.lmsScope, snap, snap.announcements || []).sort((a, b) => String(b.published_at || "").localeCompare(String(a.published_at || ""))),
    });
  });

  router.post("/announcements", requireRole("OWNER", "ADMIN", "EDITOR", "INSTRUCTOR"), async (req, res) => {
    try {
      V.required(req.body, ["titleVi"]);
      const target = {
        targetType: req.body.targetType || "all",
        programId: Security.coalesceTargetId(req.body.programId),
        sessionId: Security.coalesceTargetId(req.body.sessionId),
        studentId: Security.coalesceTargetId(req.body.studentId),
      };
      const check = Security.evaluateAnnouncementTarget(req.lmsScope, await store.dump(true), target);
      if (!check.ok) return res.status(check.status).json({ error: check.error });
      const id = randomId("ann");
      const ts = now();
      await store.upsert("announcements", {
        id,
        title_vi: req.body.titleVi,
        title_en: req.body.titleEn || "",
        content_vi: req.body.contentVi || "",
        content_en: req.body.contentEn || "",
        target_type: check.type,
        program_id: target.programId,
        session_id: target.sessionId,
        student_id: target.studentId,
        priority: req.body.priority || "normal",
        published_at: req.body.publishedAt || ts,
        expires_at: req.body.expiresAt || null,
        status: req.body.status || "published",
        created_at: ts,
        updated_at: ts,
        created_by: req.session.user.id,
      });
      if ((req.body.status || "published") === "published") {
        const fresh = await store.dump(true);
        let ids = [];
        if (check.type === "student") ids = [target.studentId];
        else if (check.type === "session") ids = sessionStudentIds(fresh, target.sessionId);
        else if (check.type === "program") ids = programStudentIds(fresh, target.programId);
        else ids = alive(fresh.students).filter((s) => s.status === "active").map((s) => s.id);
        await notifyStudents(store, ids, {
          type: "announcement",
          titleVi: req.body.titleVi,
          titleEn: req.body.titleEn || req.body.titleVi,
          bodyVi: req.body.contentVi || "",
          bodyEn: req.body.contentEn || req.body.contentVi || "",
          link: "/hoc-vien/thong-bao",
        });
      }
      res.json({ ok: true, id });
    } catch (err) {
      res.status(err.status || 400).json({ error: err.message });
    }
  });

  router.put("/announcements/:id", requireRole("OWNER", "ADMIN", "EDITOR", "INSTRUCTOR"), async (req, res) => {
    const snap = await store.dump(true);
    const row = (snap.announcements || []).find((a) => a.id === req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });
    const current = {
      targetType: row.target_type,
      programId: row.program_id,
      sessionId: row.session_id,
      studentId: row.student_id,
    };
    const next = {
      targetType: req.body.targetType || row.target_type,
      programId: Security.coalesceTargetId(req.body.programId, row.program_id),
      sessionId: Security.coalesceTargetId(req.body.sessionId, row.session_id),
      studentId: Security.coalesceTargetId(req.body.studentId, row.student_id),
    };
    const currentCheck = Security.evaluateAnnouncementTarget(req.lmsScope, snap, current);
    if (!currentCheck.ok) return res.status(currentCheck.status).json({ error: currentCheck.error });
    const nextCheck = Security.evaluateAnnouncementTarget(req.lmsScope, snap, next);
    if (!nextCheck.ok) return res.status(nextCheck.status).json({ error: nextCheck.error });
    await store.upsert("announcements", {
      ...row,
      title_vi: req.body.titleVi ?? row.title_vi,
      title_en: req.body.titleEn ?? row.title_en,
      content_vi: req.body.contentVi ?? row.content_vi,
      content_en: req.body.contentEn ?? row.content_en,
      target_type: nextCheck.type,
      program_id: next.programId,
      session_id: next.sessionId,
      student_id: next.studentId,
      priority: req.body.priority || row.priority,
      published_at: req.body.publishedAt ?? row.published_at,
      expires_at: req.body.expiresAt ?? row.expires_at,
      status: req.body.status || row.status,
      updated_at: now(),
    });
    res.json({ ok: true });
  });

  router.delete("/announcements/:id", requireRole("OWNER", "ADMIN"), async (req, res) => {
    try {
      const snap = await store.dump(true);
      const row = (snap.announcements || []).find((a) => a.id === req.params.id);
      if (!row) return res.status(404).json({ error: "Not found" });
      await store.remove("announcements", req.params.id);
      res.json({ ok: true });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Không xóa được thông báo" });
    }
  });

  router.get("/enrollments", async (req, res) => {
    const snap = await store.dump();
    const q = String(req.query.q || "").trim().toLowerCase();
    const items = (snap.enrollments || [])
      .filter((row) => !row.deleted_at)
      .filter((row) => Security.instructorOwnsSession(req.lmsScope, row.session_id))
      .map((row) => {
        const student = aliveById(snap.students, row.student_id);
        const session = aliveById(snap.sessions, row.session_id);
        const program = aliveById(snap.programs, row.program_id);
        const check = C.evaluateEligibility(snap, row, program);
        return {
          ...row,
          student_name: student?.full_name,
          student_email: student?.email,
          session_name: session?.session_name,
          program_name: programShortName(program),
          progress: L.enrollmentProgress(snap, row.id, row.session_id),
          attendance: check.attendance,
          eligibility: check,
        };
      })
      .filter(
        (e) =>
          !q ||
          String(e.student_name || "").toLowerCase().includes(q) ||
          String(e.student_email || "").toLowerCase().includes(q) ||
          String(e.program_name || "").toLowerCase().includes(q),
      )
      .sort((a, b) => String(b.joined_at).localeCompare(String(a.joined_at)));
    res.json({ items });
  });

  router.get("/sessions/:id/lms", async (req, res) => {
    const snap = await store.dump();
    const session = aliveById(snap.sessions, req.params.id);
    if (!session) return res.status(404).json({ error: "Not found" });
    if (!Security.instructorOwnsSession(req.lmsScope, session.id)) return res.status(403).json({ error: "Forbidden" });
    const program = aliveById(snap.programs, session.program_id);
    const enrollments = (snap.enrollments || [])
      .filter((e) => e.session_id === session.id)
      .map((row) => {
        const student = aliveById(snap.students, row.student_id);
        const check = C.evaluateEligibility(snap, row, program);
        const cert = (snap.certificates || []).find((c) => c.enrollment_id === row.id && c.status === "issued");
        return {
          ...row,
          student_name: student?.full_name,
          student_email: student?.email,
          progress: L.enrollmentProgress(snap, row.id, row.session_id),
          attendance: check.attendance,
          eligibility: check,
          certificate: cert
            ? { id: cert.id, code: cert.certificate_code, status: cert.status }
            : { status: check.certificateStatus },
        };
      });
    const meetings = alive(snap.class_meetings)
      .filter((m) => m.session_id === session.id)
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || String(a.date).localeCompare(String(b.date)));
    const materials = alive(snap.learning_materials).filter((m) => m.session_id === session.id || m.program_id === session.program_id);
    const announcements = (snap.announcements || []).filter(
      (a) => a.session_id === session.id || a.program_id === session.program_id || a.target_type === "all",
    );
    const eligible = enrollments.filter((e) => e.eligibility.eligible && e.certificate.status !== "issued").length;
    const missingAttendance = enrollments.filter((e) => e.eligibility.reasons.includes("attendance")).length;
    const incomplete = enrollments.filter((e) => e.eligibility.reasons.includes("completion")).length;
    res.json({
      session,
      enrollments,
      meetings,
      materials,
      announcements,
      summary: { eligible, missingAttendance, incomplete, total: enrollments.length },
    });
  });

  router.get("/certificate-templates", async (_req, res) => {
    const snap = await store.dump(true);
    const items = await Cert.ensureOfficialTemplates(store, snap);
    res.json({ items });
  });

  router.post("/certificate-templates", requireRole("OWNER", "ADMIN"), async (req, res) => {
    const ts = now();
    const id = req.body.id || randomId("tpl");
    await store.upsert("certificate_templates", {
      ...Cert.DEFAULT_TEMPLATE,
      id,
      name: req.body.name || "VSC Academy Standard",
      title_vi: req.body.titleVi || Cert.DEFAULT_TEMPLATE.title_vi,
      title_en: req.body.titleEn || Cert.DEFAULT_TEMPLATE.title_en,
      body_vi: req.body.bodyVi || Cert.DEFAULT_TEMPLATE.body_vi,
      body_en: req.body.bodyEn || Cert.DEFAULT_TEMPLATE.body_en,
      footer_vi: req.body.footerVi || Cert.DEFAULT_TEMPLATE.footer_vi,
      footer_en: req.body.footerEn || Cert.DEFAULT_TEMPLATE.footer_en,
      signer1_name: req.body.signer1Name || Cert.DEFAULT_TEMPLATE.signer1_name,
      signer1_title: req.body.signer1Title || Cert.DEFAULT_TEMPLATE.signer1_title,
      signer2_name: req.body.signer2Name || "",
      signer2_title: req.body.signer2Title || "",
      program_id: req.body.programId || null,
      language: req.body.language || "vi",
      pair_id: req.body.pairId || "",
      background_image: req.body.backgroundImage || "",
      status: req.body.status || "published",
      version: Number(req.body.version || 1),
      created_at: ts,
      updated_at: ts,
      created_by: req.session.user.id,
    });
    res.json({ ok: true, id });
  });

  router.put("/certificate-templates/:id", requireRole("OWNER", "ADMIN"), async (req, res) => {
    const snap = await store.dump(true);
    const row = (snap.certificate_templates || []).find((t) => t.id === req.params.id) || {
      ...Cert.DEFAULT_TEMPLATE,
      id: req.params.id,
    };
    await store.upsert("certificate_templates", {
      ...row,
      name: req.body.name ?? row.name,
      title_vi: req.body.titleVi ?? row.title_vi,
      title_en: req.body.titleEn ?? row.title_en,
      body_vi: req.body.bodyVi ?? row.body_vi,
      body_en: req.body.bodyEn ?? row.body_en,
      footer_vi: req.body.footerVi ?? row.footer_vi,
      footer_en: req.body.footerEn ?? row.footer_en,
      signer1_name: req.body.signer1Name ?? row.signer1_name,
      signer1_title: req.body.signer1Title ?? row.signer1_title,
      signer2_name: req.body.signer2Name ?? row.signer2_name,
      signer2_title: req.body.signer2Title ?? row.signer2_title,
      language: req.body.language ?? row.language,
      pair_id: req.body.pairId ?? row.pair_id ?? "",
      background_image: req.body.backgroundImage ?? row.background_image ?? "",
      status: req.body.status || row.status,
      version: Number(row.version || 1) + (req.body.bumpVersion ? 1 : 0),
      updated_at: now(),
      updated_by: req.session.user.id,
    });
    res.json({ ok: true });
  });

  router.delete("/certificate-templates/:id", requireRole("OWNER", "ADMIN"), async (req, res) => {
    try {
      const snap = await store.dump(true);
      const row = (snap.certificate_templates || []).find((t) => t.id === req.params.id);
      if (!row) return res.status(404).json({ error: "Not found" });
      if (Cert.isOfficialTemplateId(row.id)) {
        return res.status(409).json({ error: "Không xóa được mẫu mặc định" });
      }
      const inUse = (snap.certificates || []).some((c) => c.template_id === row.id);
      if (inUse) return res.status(409).json({ error: "Không xóa được mẫu đang được chứng nhận sử dụng" });
      await store.remove("certificate_templates", row.id);
      res.json({ ok: true });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Không xóa được mẫu chứng nhận" });
    }
  });

  router.get("/certificates", async (req, res) => {
    const snap = await store.dump();
    const items = Security.scopedCertificates(req.lmsScope, snap.certificates, req.query.sessionId)
      .sort((a, b) => String(b.issued_at || "").localeCompare(String(a.issued_at || "")));
    res.json({ items });
  });

  router.post("/certificates/issue", requireRole("OWNER", "ADMIN"), async (req, res) => {
    try {
      const snap = await store.dump(true);
      const cert = await Cert.issueCertificate(store, snap, req.body.enrollmentId, req.session.user, req);
      await notifyStudents(store, [cert.student_id], {
        type: "certificate",
        titleVi: "Chứng nhận đã sẵn sàng",
        titleEn: "Your certificate is ready",
        bodyVi: "Bạn đã được cấp chứng nhận hoàn thành chương trình.",
        bodyEn: "Your programme certificate has been issued.",
        link: "/hoc-vien/chung-nhan",
      });
      res.json({ ok: true, id: cert.id, code: cert.certificate_code });
    } catch (err) {
      res.status(err.status || 400).json({ error: err.message, reasons: err.reasons });
    }
  });

  router.post("/certificates/issue-bulk", requireRole("OWNER", "ADMIN"), async (req, res) => {
    const ids = req.body.enrollmentIds || [];
    const issued = [];
    const failed = [];
    for (const enrollmentId of ids) {
      try {
        const current = await store.dump(true);
        const cert = await Cert.issueCertificate(store, current, enrollmentId, req.session.user, req);
        issued.push({ enrollmentId, code: cert.certificate_code });
        await notifyStudents(store, [cert.student_id], {
          type: "certificate",
          titleVi: "Chứng nhận đã sẵn sàng",
          titleEn: "Your certificate is ready",
          bodyVi: "Bạn đã được cấp chứng nhận hoàn thành chương trình.",
          bodyEn: "Your programme certificate has been issued.",
          link: "/hoc-vien/chung-nhan",
        });
      } catch (err) {
        failed.push({ enrollmentId, error: err.message, reasons: err.reasons });
      }
    }
    res.json({ ok: true, issued, failed });
  });

  router.post("/certificates/:id/revoke", requireRole("OWNER", "ADMIN"), async (req, res) => {
    try {
      const snap = await store.dump(true);
      const row = await Cert.revokeCertificate(store, snap, req.params.id, req.session.user, req.body.reason);
      res.json({ ok: true, status: row.status });
    } catch (err) {
      res.status(err.status || 400).json({ error: err.message });
    }
  });

  router.post("/certificates/:id/reissue", requireRole("OWNER", "ADMIN"), async (req, res) => {
    try {
      const snap = await store.dump(true);
      const cert = await Cert.reissueCertificate(store, snap, req.params.id, req.session.user, req);
      await notifyStudents(store, [cert.student_id], {
        type: "certificate",
        titleVi: "Chứng nhận đã sẵn sàng",
        titleEn: "Your certificate is ready",
        bodyVi: "Chứng nhận của bạn đã được cấp lại.",
        bodyEn: "Your certificate has been reissued.",
        link: "/hoc-vien/chung-nhan",
      });
      res.json({ ok: true, code: cert.certificate_code, id: cert.id });
    } catch (err) {
      res.status(err.status || 400).json({ error: err.message });
    }
  });

  router.get("/certificates/:id/pdf", requireRole("OWNER", "ADMIN"), async (req, res) => {
    const snap = await store.dump();
    const row = (snap.certificates || []).find((c) => c.id === req.params.id || c.certificate_code === req.params.id);
    if (!row || row.status !== "issued") return res.status(404).json({ error: "Not found" });
    const lang = req.query.lang === "en" ? "en" : "vi";
    const abs = Cert.pdfAbsolutePath(row, lang);
    if (!abs) return res.status(404).json({ error: "PDF missing" });
    res.setHeader("Content-Type", "application/pdf");
    Security.setPrivateDownloadHeaders(res);
    res.setHeader("Content-Disposition", `inline; filename="${Cert.pdfDownloadName(row, lang)}"`);
    res.sendFile(abs);
  });

  router.get("/mail-outbox", requireRole("OWNER", "ADMIN"), async (_req, res) => {
    const snap = await store.dump();
    res.json({
      items: (snap.mail_outbox || [])
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
        .slice(0, 100)
        .map(publicOutboxRow),
    });
  });
}

module.exports = { attachLearnerAdmin };
