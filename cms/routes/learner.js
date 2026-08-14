const express = require("express");
const fs = require("fs");
const path = require("path");
const { now, parseJson, alive, aliveById } = require("../lib/convex-db");
const { verifyPassword, tooManyLogins, recordLogin } = require("../lib/auth");
const V = require("../lib/validate");
const L = require("../lib/learner");

function requireStudent(req, res, next) {
  if (!req.session?.student) return res.status(401).json({ error: "Unauthorized" });
  next();
}

function localeOf(req) {
  if (req.query.locale === "en" || req.query.locale === "vi") return req.query.locale;
  return req.session?.student?.languagePreference || "vi";
}

function createLearnerRouter(store) {
  const router = express.Router();

  router.post("/login", async (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    if (tooManyLogins(ip)) return res.status(429).json({ error: "Too many login attempts" });
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const snap = await store.dump(true);
    const student = alive(snap.students).find((row) => row.email === email);
    const ok =
      student &&
      student.password_hash &&
      student.status === "active" &&
      verifyPassword(password, student.password_hash);
    recordLogin(ip, ok);
    if (!ok) return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });
    const ts = now();
    const fresh = { ...student, last_login_at: ts, updated_at: ts };
    await store.upsert("students", fresh);
    req.session.student = L.publicStudent(fresh);
    res.json({ student: req.session.student });
  });

  router.post("/logout", (req, res) => {
    if (req.session) delete req.session.student;
    res.json({ ok: true });
  });

  router.get("/activate", async (req, res) => {
    const token = String(req.query.token || "");
    const snap = await store.dump();
    const student = alive(snap.students).find((row) => row.activation_token === token);
    if (!student) return res.status(400).json({ error: "Link kích hoạt không còn hiệu lực" });
    res.json({ email: student.email, fullName: student.full_name });
  });

  router.post("/activate", async (req, res) => {
    try {
      const token = String(req.body?.token || "");
      const password = String(req.body?.password || "");
      if (password.length < 8) throw V.fail("Mật khẩu tối thiểu 8 ký tự");
      const snap = await store.dump(true);
      const student = alive(snap.students).find((row) => row.activation_token === token);
      if (!student) throw V.fail("Link kích hoạt không còn hiệu lực");
      await L.setStudentPassword(store, student, password);
      const freshSnap = await store.dump(true);
      const fresh = aliveById(freshSnap.students, student.id);
      req.session.student = L.publicStudent(fresh);
      res.json({ student: req.session.student });
    } catch (err) {
      res.status(err.status || 400).json({ error: err.message });
    }
  });

  router.get("/me", requireStudent, async (req, res) => {
    const snap = await store.dump();
    const unread = unreadCount(snap, req.session.student.id);
    res.json({ student: req.session.student, unread });
  });

  router.put("/me", requireStudent, async (req, res) => {
    const id = req.session.student.id;
    const snap = await store.dump(true);
    const row = aliveById(snap.students, id);
    const language = req.body.languagePreference === "en" ? "en" : "vi";
    const fresh = {
      ...row,
      full_name: req.body.fullName || row.full_name,
      phone: req.body.phone ?? row.phone,
      language_preference: language,
      updated_at: now(),
    };
    await store.upsert("students", fresh);
    req.session.student = L.publicStudent(fresh);
    res.json({ student: req.session.student });
  });

  router.get("/dashboard", requireStudent, async (req, res) => {
    const locale = localeOf(req);
    const studentId = req.session.student.id;
    const snap = await store.dump();
    const enrollments = [];
    for (const row of (snap.enrollments || [])
      .filter((r) => r.student_id === studentId && r.status !== "cancelled")
      .sort((a, b) => String(b.joined_at).localeCompare(String(a.joined_at)))) {
      enrollments.push(await L.hydrateEnrollment(store, snap, row, locale));
    }
    const nextClass =
      enrollments
        .filter((e) => e.status === "active" && e.nextMeeting)
        .sort((a, b) =>
          `${a.nextMeeting.date}${a.nextMeeting.startTime}`.localeCompare(
            `${b.nextMeeting.date}${b.nextMeeting.startTime}`,
          ),
        )[0] || null;
    const announcements = visibleAnnouncements(snap, studentId, locale).slice(0, 5);
    const materials = visibleMaterials(snap, studentId, locale).slice(0, 4);
    res.json({ enrollments, nextClass, announcements, materials, unread: unreadCount(snap, studentId) });
  });

  router.get("/enrollments", requireStudent, async (req, res) => {
    const locale = localeOf(req);
    const snap = await store.dump();
    const items = [];
    for (const row of (snap.enrollments || [])
      .filter((r) => r.student_id === req.session.student.id)
      .sort((a, b) => String(b.joined_at).localeCompare(String(a.joined_at)))) {
      items.push(await L.hydrateEnrollment(store, snap, row, locale));
    }
    res.json({ items });
  });

  router.get("/enrollments/:id", requireStudent, async (req, res) => {
    const locale = localeOf(req);
    const snap = await store.dump();
    const row = (snap.enrollments || []).find(
      (r) => r.id === req.params.id && r.student_id === req.session.student.id,
    );
    if (!row) return res.status(404).json({ error: "Not found" });
    const enrollment = await L.hydrateEnrollment(store, snap, row, locale);
    const meetings = alive(snap.class_meetings)
      .filter((m) => m.session_id === row.session_id)
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || String(a.date).localeCompare(String(b.date)))
      .map((m) => {
        const att = (snap.attendance || []).find((a) => a.enrollment_id === row.id && a.meeting_id === m.id);
        return { ...L.serializeMeeting(m, locale), attendance: att?.status || "not_recorded" };
      });
    const materials = visibleMaterials(snap, req.session.student.id, locale).filter(
      (m) => m.sessionId === row.session_id || m.programId === row.program_id,
    );
    const announcements = visibleAnnouncements(snap, req.session.student.id, locale).filter(
      (a) => a.targetType === "all" || a.sessionId === row.session_id || a.programId === row.program_id,
    );
    const contact = (snap.settings || []).find((s) => s.key === "contact" || s.id === "contact");
    res.json({
      enrollment,
      meetings,
      materials,
      announcements,
      support: parseJson(contact?.value, {}),
    });
  });

  router.get("/schedule", requireStudent, async (req, res) => {
    const locale = localeOf(req);
    const snap = await store.dump();
    const ids = new Set(L.studentSessionIds(snap, req.session.student.id));
    if (!ids.size) return res.json({ items: [] });
    const items = alive(snap.class_meetings)
      .filter((m) => ids.has(m.session_id))
      .sort((a, b) => `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`))
      .map((m) => {
        const session = aliveById(snap.sessions, m.session_id);
        return {
          ...L.serializeMeeting(m, locale),
          sessionName: session?.session_name,
          programId: session?.program_id,
        };
      });
    res.json({ items });
  });

  router.get("/materials", requireStudent, async (req, res) => {
    const snap = await store.dump();
    res.json({ items: visibleMaterials(snap, req.session.student.id, localeOf(req)) });
  });

  router.get("/materials/:id/file", requireStudent, async (req, res) => {
    const snap = await store.dump();
    const row = aliveById(snap.learning_materials, req.params.id);
    if (!row || !L.canSeeMaterial(snap, req.session.student.id, row)) {
      return res.status(404).json({ error: "Not found" });
    }
    if (row.external_url) return res.redirect(row.external_url);
    if (row.file_path) {
      const root = path.resolve(path.join(__dirname, "..", "..", "uploads", "learner"));
      const abs = path.resolve(path.join(__dirname, "..", "..", row.file_path));
      if (abs !== root && !abs.startsWith(root + path.sep)) return res.status(403).json({ error: "Forbidden" });
      if (!fs.existsSync(abs)) return res.status(404).json({ error: "File missing" });
      return res.sendFile(abs);
    }
    if (row.file_url) return res.redirect(row.file_url);
    res.status(404).json({ error: "No file" });
  });

  router.get("/announcements", requireStudent, async (req, res) => {
    const snap = await store.dump();
    res.json({
      items: visibleAnnouncements(snap, req.session.student.id, localeOf(req)),
      unread: unreadCount(snap, req.session.student.id),
    });
  });

  router.post("/announcements/:id/read", requireStudent, async (req, res) => {
    const snap = await store.dump(true);
    const id = `${req.params.id}::${req.session.student.id}`;
    const exists = (snap.announcement_reads || []).find(
      (r) => r.announcement_id === req.params.id && r.student_id === req.session.student.id,
    );
    if (!exists) {
      await store.upsert("announcement_reads", {
        id,
        announcement_id: req.params.id,
        student_id: req.session.student.id,
        read_at: now(),
      });
    }
    const fresh = await store.dump(true);
    res.json({ ok: true, unread: unreadCount(fresh, req.session.student.id) });
  });

  router.get("/support", requireStudent, async (_req, res) => {
    const snap = await store.dump();
    const contact = (snap.settings || []).find((s) => s.key === "contact" || s.id === "contact");
    res.json({ contact: parseJson(contact?.value, {}) });
  });

  return router;
}

function visibleMaterials(snap, studentId, locale) {
  return alive(snap.learning_materials)
    .filter((row) => row.status === "published")
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || String(b.published_at).localeCompare(String(a.published_at)))
    .filter((row) => L.canSeeMaterial(snap, studentId, row))
    .map((row) => ({
      id: row.id,
      title: locale === "en" ? row.title_en || row.title_vi : row.title_vi,
      description: locale === "en" ? row.description_en || row.description_vi : row.description_vi,
      type: row.type,
      phase: row.phase,
      publishedAt: row.published_at,
      downloadable: !!row.downloadable,
      hasFile: !!(row.file_path || row.file_url || row.external_url),
      externalUrl: row.external_url,
      programId: row.program_id,
      sessionId: row.session_id,
      meetingId: row.meeting_id,
    }));
}

function visibleAnnouncements(snap, studentId, locale) {
  const reads = new Set(
    (snap.announcement_reads || [])
      .filter((r) => r.student_id === studentId)
      .map((r) => r.announcement_id),
  );
  return (snap.announcements || [])
    .filter((row) => row.status === "published")
    .sort((a, b) => String(b.published_at || "").localeCompare(String(a.published_at || "")))
    .filter((row) => L.canSeeAnnouncement(snap, studentId, row))
    .map((row) => ({
      id: row.id,
      title: locale === "en" ? row.title_en || row.title_vi : row.title_vi,
      content: locale === "en" ? row.content_en || row.content_vi : row.content_vi,
      priority: row.priority,
      publishedAt: row.published_at,
      targetType: row.target_type,
      programId: row.program_id,
      sessionId: row.session_id,
      author: "VSC Academy",
      read: reads.has(row.id),
    }));
}

function unreadCount(snap, studentId) {
  return visibleAnnouncements(snap, studentId, "vi").filter((a) => !a.read).length;
}

module.exports = { createLearnerRouter };
