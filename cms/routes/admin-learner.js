const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { now, parseJson, alive, aliveById, like, programShortName } = require("../lib/convex-db");
const { requireRole, randomId, editorLocked } = require("../lib/auth");
const V = require("../lib/validate");
const L = require("../lib/learner");

const LEARNER_UPLOAD = path.join(__dirname, "..", "..", "uploads", "learner");
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

function attachLearnerAdmin(router, store) {
  router.get("/students", async (req, res) => {
    const q = String(req.query.q || "").trim();
    const snap = await store.dump();
    const items = alive(snap.students)
      .filter((s) => !q || like(s.full_name, q) || like(s.email, q) || like(s.phone, q))
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .map((s) => ({
        id: s.id,
        full_name: s.full_name,
        email: s.email,
        phone: s.phone,
        avatar: s.avatar,
        status: s.status,
        language_preference: s.language_preference,
        last_login_at: s.last_login_at,
        created_at: s.created_at,
        active_courses: (snap.enrollments || []).filter((e) => e.student_id === s.id && e.status === "active").length,
        completed_courses: (snap.enrollments || []).filter((e) => e.student_id === s.id && e.status === "completed").length,
      }));
    res.json({ items });
  });

  router.get("/students/:id", async (req, res) => {
    const snap = await store.dump();
    const student = aliveById(snap.students, req.params.id);
    if (!student) return res.status(404).json({ error: "Not found" });
    const enrollments = (snap.enrollments || [])
      .filter((e) => e.student_id === student.id)
      .sort((a, b) => String(b.joined_at).localeCompare(String(a.joined_at)))
      .map((row) => {
        const session = aliveById(snap.sessions, row.session_id);
        const program = aliveById(snap.programs, row.program_id);
        return {
          ...row,
          session_name: session?.session_name,
          start_date: session?.start_date,
          program_name: programShortName(program),
          progress: L.enrollmentProgress(snap, row.id, row.session_id),
        };
      });
    const meetings = alive(snap.class_meetings)
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
    });
  });

  router.post("/students", requireRole("OWNER", "ADMIN"), async (req, res) => {
    try {
      V.required(req.body, ["fullName", "email"]);
      V.email(req.body.email);
      const email = String(req.body.email).trim().toLowerCase();
      const snap = await store.dump(true);
      if ((snap.students || []).some((s) => s.email === email)) throw V.fail("Email already exists");
      const id = randomId("stu");
      const ts = now();
      await store.upsert("students", {
        id,
        full_name: req.body.fullName,
        email,
        phone: req.body.phone || "",
        avatar: "",
        password_hash: null,
        activation_token: null,
        status: "invited",
        language_preference: req.body.languagePreference || "vi",
        last_login_at: null,
        notes: "",
        created_at: ts,
        updated_at: ts,
      });
      res.json({ ok: true, id });
    } catch (err) {
      res.status(err.status || 400).json({ error: err.message });
    }
  });

  router.put("/students/:id", requireRole("OWNER", "ADMIN"), async (req, res) => {
    const snap = await store.dump(true);
    const row = aliveById(snap.students, req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });
    await store.upsert("students", {
      ...row,
      full_name: req.body.fullName || row.full_name,
      phone: req.body.phone ?? row.phone,
      status: req.body.status || row.status,
      language_preference: req.body.languagePreference || row.language_preference,
      notes: req.body.notes ?? row.notes,
      updated_at: now(),
    });
    res.json({ ok: true });
  });

  router.post("/students/:id/reset-access", requireRole("OWNER", "ADMIN"), async (req, res) => {
    const snap = await store.dump(true);
    const row = aliveById(snap.students, req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });
    const crypto = require("crypto");
    const token = crypto.randomBytes(24).toString("hex");
    await store.upsert("students", {
      ...row,
      password_hash: null,
      activation_token: token,
      status: "invited",
      updated_at: now(),
    });
    res.json({ ok: true, activationPath: `/hoc-vien/kich-hoat?token=${token}` });
  });

  router.post("/students/:id/enroll", requireRole("OWNER", "ADMIN"), async (req, res) => {
    try {
      V.required(req.body, ["sessionId"]);
      const snap = await store.dump(true);
      const student = aliveById(snap.students, req.params.id);
      const session = aliveById(snap.sessions, req.body.sessionId);
      if (!student || !session) throw V.fail("Student or session not found");
      if ((snap.enrollments || []).some((e) => e.student_id === student.id && e.session_id === session.id)) {
        throw V.fail("Already enrolled");
      }
      const id = randomId("enr");
      const ts = now();
      await store.upsert("enrollments", {
        id,
        student_id: student.id,
        program_id: session.program_id,
        session_id: session.id,
        registration_id: null,
        status: "active",
        payment_status: req.body.paymentStatus || "paid",
        progress: 0,
        joined_at: ts,
        completed_at: null,
        notes: "",
        created_at: ts,
        updated_at: ts,
      });
      res.json({ ok: true, id });
    } catch (err) {
      res.status(err.status || 400).json({ error: err.message });
    }
  });

  router.put("/enrollments/:id", requireRole("OWNER", "ADMIN"), async (req, res) => {
    const snap = await store.dump(true);
    const row = (snap.enrollments || []).find((e) => e.id === req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });
    let sessionId = req.body.sessionId || row.session_id;
    let programId = row.program_id;
    if (req.body.sessionId && req.body.sessionId !== row.session_id) {
      const session = aliveById(snap.sessions, req.body.sessionId);
      if (!session) return res.status(400).json({ error: "Session not found" });
      sessionId = session.id;
      programId = session.program_id;
    }
    const status = req.body.status || row.status;
    await store.upsert("enrollments", {
      ...row,
      session_id: sessionId,
      program_id: programId,
      status,
      payment_status: req.body.paymentStatus || row.payment_status,
      notes: req.body.notes ?? row.notes,
      completed_at: status === "completed" ? now() : row.completed_at,
      updated_at: now(),
    });
    res.json({ ok: true });
  });

  router.delete("/enrollments/:id", requireRole("OWNER", "ADMIN"), async (req, res) => {
    const snap = await store.dump(true);
    const row = (snap.enrollments || []).find((e) => e.id === req.params.id);
    if (row) await store.upsert("enrollments", { ...row, status: "cancelled", updated_at: now() });
    res.json({ ok: true });
  });

  router.put("/attendance", requireRole("OWNER", "ADMIN"), async (req, res) => {
    try {
      V.required(req.body, ["enrollmentId", "meetingId", "status"]);
      const snap = await store.dump(true);
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
        updated_at: now(),
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
      .filter((m) => !sessionId || m.session_id === sessionId)
      .sort((a, b) => `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`));
    res.json({ items });
  });

  router.post("/meetings", requireRole("OWNER", "ADMIN"), async (req, res) => {
    try {
      V.required(req.body, ["sessionId", "date", "startTime", "endTime"]);
      const id = randomId("mtg");
      const ts = now();
      await store.upsert("class_meetings", {
        id,
        session_id: req.body.sessionId,
        title_vi: req.body.titleVi || "Buổi học",
        title_en: req.body.titleEn || "",
        date: req.body.date,
        start_time: req.body.startTime,
        end_time: req.body.endTime,
        format: req.body.format || null,
        venue_id: req.body.venueId || null,
        meeting_url: req.body.meetingUrl || "",
        status: req.body.status || "upcoming",
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

  router.put("/meetings/:id", requireRole("OWNER", "ADMIN"), async (req, res) => {
    const snap = await store.dump(true);
    const row = aliveById(snap.class_meetings, req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });
    await store.upsert("class_meetings", {
      ...row,
      title_vi: req.body.titleVi ?? row.title_vi,
      title_en: req.body.titleEn ?? row.title_en,
      date: req.body.date || row.date,
      start_time: req.body.startTime || row.start_time,
      end_time: req.body.endTime || row.end_time,
      format: req.body.format ?? row.format,
      venue_id: req.body.venueId ?? row.venue_id,
      meeting_url: req.body.meetingUrl ?? row.meeting_url,
      status: req.body.status || row.status,
      recording_url: req.body.recordingUrl ?? row.recording_url,
      notes: req.body.notes ?? row.notes,
      updated_at: now(),
    });
    res.json({ ok: true });
  });

  router.delete("/meetings/:id", requireRole("OWNER", "ADMIN"), async (req, res) => {
    const snap = await store.dump(true);
    const row = aliveById(snap.class_meetings, req.params.id);
    if (row) await store.upsert("class_meetings", { ...row, deleted_at: now(), updated_at: now() });
    res.json({ ok: true });
  });

  router.get("/materials", async (_req, res) => {
    const snap = await store.dump();
    res.json({
      items: alive(snap.learning_materials).sort(
        (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || String(b.published_at).localeCompare(String(a.published_at)),
      ),
    });
  });

  router.post("/materials", requireRole("OWNER", "ADMIN", "EDITOR"), upload.single("file"), async (req, res) => {
    try {
      const body = req.body || {};
      if (!body.titleVi) throw V.fail("titleVi is required");
      const id = randomId("mat");
      const ts = now();
      let filePath = "";
      if (req.file) filePath = path.join("uploads", "learner", req.file.filename);
      await store.upsert("learning_materials", {
        id,
        program_id: body.programId || null,
        session_id: body.sessionId || null,
        meeting_id: body.meetingId || null,
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
      });
      res.json({ ok: true, id });
    } catch (err) {
      res.status(err.status || 400).json({ error: err.message });
    }
  });

  router.put("/materials/:id", requireRole("OWNER", "ADMIN", "EDITOR"), async (req, res) => {
    const snap = await store.dump(true);
    const row = aliveById(snap.learning_materials, req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });
    await store.upsert("learning_materials", {
      ...row,
      program_id: req.body.programId ?? row.program_id,
      session_id: req.body.sessionId ?? row.session_id,
      meeting_id: req.body.meetingId ?? row.meeting_id,
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

  router.get("/announcements", async (_req, res) => {
    const snap = await store.dump();
    res.json({
      items: (snap.announcements || []).sort((a, b) => String(b.published_at || "").localeCompare(String(a.published_at || ""))),
    });
  });

  router.post("/announcements", requireRole("OWNER", "ADMIN", "EDITOR"), async (req, res) => {
    try {
      V.required(req.body, ["titleVi"]);
      const id = randomId("ann");
      const ts = now();
      await store.upsert("announcements", {
        id,
        title_vi: req.body.titleVi,
        title_en: req.body.titleEn || "",
        content_vi: req.body.contentVi || "",
        content_en: req.body.contentEn || "",
        target_type: req.body.targetType || "all",
        program_id: req.body.programId || null,
        session_id: req.body.sessionId || null,
        student_id: req.body.studentId || null,
        priority: req.body.priority || "normal",
        published_at: req.body.publishedAt || ts,
        expires_at: req.body.expiresAt || null,
        status: req.body.status || "published",
        created_at: ts,
        updated_at: ts,
        created_by: req.session.user.id,
      });
      res.json({ ok: true, id });
    } catch (err) {
      res.status(err.status || 400).json({ error: err.message });
    }
  });

  router.put("/announcements/:id", requireRole("OWNER", "ADMIN", "EDITOR"), async (req, res) => {
    const snap = await store.dump(true);
    const row = (snap.announcements || []).find((a) => a.id === req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });
    await store.upsert("announcements", {
      ...row,
      title_vi: req.body.titleVi ?? row.title_vi,
      title_en: req.body.titleEn ?? row.title_en,
      content_vi: req.body.contentVi ?? row.content_vi,
      content_en: req.body.contentEn ?? row.content_en,
      target_type: req.body.targetType || row.target_type,
      program_id: req.body.programId ?? row.program_id,
      session_id: req.body.sessionId ?? row.session_id,
      student_id: req.body.studentId ?? row.student_id,
      priority: req.body.priority || row.priority,
      published_at: req.body.publishedAt ?? row.published_at,
      expires_at: req.body.expiresAt ?? row.expires_at,
      status: req.body.status || row.status,
      updated_at: now(),
    });
    res.json({ ok: true });
  });

  router.delete("/announcements/:id", requireRole("OWNER", "ADMIN"), async (req, res) => {
    await store.remove("announcements", req.params.id);
    res.json({ ok: true });
  });
}

module.exports = { attachLearnerAdmin };
