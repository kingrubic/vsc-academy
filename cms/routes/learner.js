const express = require("express");
const fs = require("fs");
const { now, parseJson, alive, aliveById } = require("../lib/convex-db");
const { verifyPassword, tooManyLogins, recordLogin, hashPassword } = require("../lib/auth");
const V = require("../lib/validate");
const L = require("../lib/learner");
const C = require("../lib/lms-core");
const Cert = require("../lib/certificate");
const { queueMail } = require("../lib/notify");
const Security = require("../lib/lms-security");


function localeOf(req) {
  if (req.query.locale === "en" || req.query.locale === "vi") return req.query.locale;
  return req.session?.student?.languagePreference || "vi";
}

const GENERIC_RESET = "Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.";
const GENERIC_RESET_EN =
  "If this email exists in our system, we have sent password reset instructions.";

function createLearnerRouter(store) {
  const router = express.Router();
  const requireStudent = async (req, res, next) => {
    if (!req.session?.student) return res.status(401).json({ error: "Unauthorized" });
    try {
      const snap = await store.dump(true);
      const student = aliveById(snap.students, req.session.student.id);
      if (!student || student.status !== "active") {
        return req.session.destroy(() => res.status(401).json({ error: "Unauthorized" }));
      }
      req.session.student = L.publicStudent(student);
      req.studentSnapshot = snap;
      next();
    } catch (err) {
      next(err);
    }
  };

  router.post("/login", async (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    if (tooManyLogins(ip)) return res.status(429).json({ error: "Too many login attempts" });
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const remember = !!req.body?.rememberMe;
    const snap = await store.dump(true);
    const student = alive(snap.students).find((row) => row.email === email);
    const blocked = student && (student.status === "suspended" || student.status === "inactive");
    const ok =
      student &&
      !blocked &&
      student.password_hash &&
      student.status === "active" &&
      verifyPassword(password, student.password_hash);
    recordLogin(ip, ok);
    if (!ok) return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });
    const ts = now();
    const fresh = { ...student, last_login_at: ts, updated_at: ts };
    await store.upsert("students", fresh);
    if (req.session) {
      req.session.cookie.maxAge = remember ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    }
    req.session.student = L.publicStudent(fresh);
    res.json({ student: req.session.student });
  });

  router.post("/logout", (req, res) => {
    if (req.session) delete req.session.student;
    res.json({ ok: true });
  });

  router.post("/forgot-password", async (req, res) => {
    const locale = localeOf(req);
    const message = locale === "en" ? GENERIC_RESET_EN : GENERIC_RESET;
    const email = String(req.body?.email || "").trim().toLowerCase();
    try {
      if (email) {
        const snap = await store.dump(true);
        const student = alive(snap.students).find((row) => row.email === email);
        if (Security.canRequestPasswordReset(student)) {
          const token = C.newSecretToken();
          const ts = now();
          await store.upsert("password_resets", {
            id: C.hashToken(token),
            token_hash: C.hashToken(token),
            student_id: student.id,
            expires_at: new Date(Date.now() + C.RESET_TTL_MS).toISOString(),
            used_at: null,
            created_at: ts,
          });
          await queueMail(
            store,
            email,
            "Đặt lại mật khẩu VSC Academy Learner Portal",
            `Đặt mật khẩu mới tại:\n/hoc-vien/dat-lai-mat-khau?token=${token}\n\nLink hết hạn sau 1 giờ.`,
            "password_reset",
            { studentId: student.id, path: `/hoc-vien/dat-lai-mat-khau?token=${token}` },
          );
        }
      }
    } catch (err) {
      console.error("forgot-password", err);
    }
    res.json({ ok: true, message });
  });

  router.post("/reset-password", async (req, res) => {
    try {
      const token = String(req.body?.token || "");
      const password = String(req.body?.password || "");
      if (password.length < 8) throw V.fail("Mật khẩu tối thiểu 8 ký tự");
      const snap = await store.dump(true);
      const hash = C.hashToken(token);
      const row = (snap.password_resets || []).find((r) => r.token_hash === hash || r.id === hash);
      if (!row || row.used_at || row.expires_at < now()) {
        throw V.fail("Link đặt lại mật khẩu không còn hiệu lực");
      }
      const student = aliveById(snap.students, row.student_id);
      if (!student) throw V.fail("Link đặt lại mật khẩu không còn hiệu lực");
      if (student.status !== "active") throw V.fail("Tài khoản không hoạt động");
      await L.setStudentPassword(store, student, password);
      await store.upsert("password_resets", { ...row, used_at: now() });
      const freshSnap = await store.dump(true);
      const fresh = aliveById(freshSnap.students, student.id);
      req.session.student = L.publicStudent(fresh);
      res.json({ student: req.session.student });
    } catch (err) {
      res.status(err.status || 400).json({ error: err.message });
    }
  });

  router.get("/activate", async (req, res) => {
    const token = String(req.query.token || "");
    const snap = await store.dump();
    const student = alive(snap.students).find((row) => row.activation_token === token);
    if (!Security.canExposeActivation(student)) return res.status(400).json({ error: "Link kích hoạt không còn hiệu lực" });
    if (student.activation_expires_at && student.activation_expires_at < now()) {
      return res.status(400).json({ error: "Link kích hoạt không còn hiệu lực" });
    }
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
      if (student.activation_expires_at && student.activation_expires_at < now()) {
        throw V.fail("Link kích hoạt không còn hiệu lực");
      }
      if (student.status !== "invited") throw V.fail("Link kích hoạt không còn hiệu lực");
      await L.setStudentPassword(store, { ...student, status: "active" }, password);
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
    const student = aliveById(snap.students, req.session.student.id);
    if (!student || student.status !== "active") return res.status(401).json({ error: "Unauthorized" });
    req.session.student = L.publicStudent(student);
    res.json({
      student: req.session.student,
      unread: unreadCount(snap, req.session.student.id),
    });
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
      avatar: req.body.avatar ?? row.avatar,
      language_preference: language,
      updated_at: now(),
    };
    await store.upsert("students", fresh);
    req.session.student = L.publicStudent(fresh);
    res.json({ student: req.session.student });
  });

  router.post("/me/password", requireStudent, async (req, res) => {
    try {
      const current = String(req.body?.currentPassword || "");
      const next = String(req.body?.newPassword || "");
      if (next.length < 8) throw V.fail("Mật khẩu tối thiểu 8 ký tự");
      const snap = await store.dump(true);
      const row = aliveById(snap.students, req.session.student.id);
      if (!row || !verifyPassword(current, row.password_hash)) throw V.fail("Mật khẩu hiện tại không đúng");
      await store.upsert("students", { ...row, password_hash: hashPassword(next), updated_at: now() });
      res.json({ ok: true });
    } catch (err) {
      res.status(err.status || 400).json({ error: err.message });
    }
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
    const notifications = visibleNotifications(snap, studentId, locale).slice(0, 8);
    const week = weekMeetings(snap, studentId, locale);
    res.json({
      enrollments,
      nextClass,
      announcements,
      materials,
      notifications,
      week,
      unread: unreadCount(snap, studentId),
    });
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
    const program = aliveById(snap.programs, row.program_id);
    const session = aliveById(snap.sessions, row.session_id);
    const meetings = alive(snap.class_meetings)
      .filter((m) => m.session_id === row.session_id)
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || String(a.date).localeCompare(String(b.date)))
      .map((m) => {
        const att = (snap.attendance || []).find((a) => a.enrollment_id === row.id && a.meeting_id === m.id);
        return {
          ...L.serializeMeeting(m, locale, { program, session }),
          attendance: att?.status || "not_recorded",
        };
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

  router.get("/meetings/:id/join", requireStudent, async (req, res) => {
    const snap = await store.dump();
    const meeting = L.meetingForStudent(snap, req.session.student.id, req.params.id);
    if (!meeting) return res.status(404).json({ error: "Not found" });
    const join = L.resolveJoinUrl(snap, meeting);
    if (!join.canJoin || !join.url) {
      return res.status(403).json({
        error: "Join link is not open yet",
        joinOpensAt: join.openAt ? new Date(join.openAt).toISOString() : null,
        canJoin: false,
      });
    }
    res.json({ url: join.url, platform: join.session?.online_platform || meeting.online_platform || "Google Meet" });
  });

  router.get("/schedule", requireStudent, async (req, res) => {
    const locale = localeOf(req);
    const snap = await store.dump();
    const ids = new Set(L.studentSessionIds(snap, req.session.student.id));
    if (!ids.size) return res.json({ items: [], week: [] });
    const items = alive(snap.class_meetings)
      .filter((m) => ids.has(m.session_id))
      .sort((a, b) => `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`))
      .map((m) => {
        const session = aliveById(snap.sessions, m.session_id);
        const program = aliveById(snap.programs, session?.program_id);
        const venue = m.venue_id ? aliveById(snap.venues, m.venue_id) : session?.venue_id ? aliveById(snap.venues, session.venue_id) : null;
        return {
          ...L.serializeMeeting(m, locale, { program, session }),
          sessionName: session?.session_name,
          programId: session?.program_id,
          programName: L.programName(program, locale),
          instructorName: program?.primary_instructor_id
            ? aliveById(snap.instructors, program.primary_instructor_id)?.name
            : "",
          venueName: venue?.name || "",
          venueAddress: venue ? (locale === "en" ? venue.address_en || venue.address_vi : venue.address_vi) : "",
          mapUrl: venue?.map_url || "",
        };
      });
    res.json({ items, week: weekMeetings(snap, req.session.student.id, locale) });
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
      const abs = Security.privateFilePath(Security.MATERIAL_DIR, row.file_path);
      if (!abs) return res.status(403).json({ error: "Forbidden" });
      if (!fs.existsSync(abs)) return res.status(404).json({ error: "File missing" });
      Security.setPrivateDownloadHeaders(res);
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

  router.post("/announcements/read-all", requireStudent, async (req, res) => {
    const snap = await store.dump(true);
    const studentId = req.session.student.id;
    const items = visibleAnnouncements(snap, studentId, "vi").filter((a) => !a.read);
    const ts = now();
    for (const a of items) {
      await store.upsert("announcement_reads", {
        id: `${a.id}::${studentId}`,
        announcement_id: a.id,
        student_id: studentId,
        read_at: ts,
      });
    }
    const fresh = await store.dump(true);
    res.json({ ok: true, unread: unreadCount(fresh, studentId) });
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

  router.get("/notifications", requireStudent, async (req, res) => {
    const snap = await store.dump();
    res.json({ items: visibleNotifications(snap, req.session.student.id, localeOf(req)) });
  });

  router.get("/certificates", requireStudent, async (req, res) => {
    const locale = localeOf(req);
    const snap = await store.dump();
    const items = (snap.certificates || [])
      .filter((c) => c.student_id === req.session.student.id)
      .sort((a, b) => String(b.issue_date || "").localeCompare(String(a.issue_date || "")))
      .map((c) => serializeLearnerCert(c, locale));
    res.json({ items });
  });

  router.get("/certificates/:id/pdf", requireStudent, async (req, res) => {
    const snap = await store.dump();
    const row = (snap.certificates || []).find(
      (c) =>
        c.student_id === req.session.student.id &&
        (c.id === req.params.id || c.certificate_code === req.params.id),
    );
    if (!row || row.status !== "issued") return res.status(404).json({ error: "Not found" });
    const abs = Cert.pdfAbsolutePath(row);
    if (!abs) return res.status(404).json({ error: "PDF missing" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("Content-Disposition", `attachment; filename="${row.certificate_code}.pdf"`);
    res.sendFile(abs);
  });

  router.get("/support", requireStudent, async (_req, res) => {
    const snap = await store.dump();
    const contact = (snap.settings || []).find((s) => s.key === "contact" || s.id === "contact");
    res.json({ contact: parseJson(contact?.value, {}) });
  });

  return router;
}

function serializeLearnerCert(row, locale) {
  return {
    id: row.id,
    certificateCode: row.certificate_code,
    title: locale === "en" ? "Certificate of Completion" : "Chứng nhận hoàn thành",
    studentName: row.student_name_snapshot,
    programName: locale === "en" ? row.program_name_en_snapshot || row.program_name_vi_snapshot : row.program_name_vi_snapshot,
    completionDate: row.completion_date,
    issueDate: row.issue_date,
    status: row.status,
    verificationUrl: row.verification_url,
  };
}

function weekMeetings(snap, studentId, locale) {
  const ids = new Set(L.studentSessionIds(snap, studentId));
  const start = startOfWeek(new Date());
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const startIso = start.toISOString().slice(0, 10);
  const endIso = end.toISOString().slice(0, 10);
  return alive(snap.class_meetings)
    .filter((m) => ids.has(m.session_id) && m.date >= startIso && m.date < endIso)
    .sort((a, b) => `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`))
    .map((m) => {
      const session = aliveById(snap.sessions, m.session_id);
      const program = aliveById(snap.programs, session?.program_id);
      return {
        ...L.serializeMeeting(m, locale, { program, session }),
        programName: L.programName(program, locale),
        sessionName: session?.session_name,
      };
    });
}

function startOfWeek(d) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
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

function visibleNotifications(snap, studentId, locale) {
  return (snap.notifications || [])
    .filter((n) => n.student_id === studentId)
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
    .map((n) => ({
      id: n.id,
      type: n.type,
      title: locale === "en" ? n.title_en || n.title_vi : n.title_vi,
      body: locale === "en" ? n.body_en || n.body_vi : n.body_vi,
      link: n.link,
      read: !!n.read_at,
      createdAt: n.created_at,
    }));
}

function unreadCount(snap, studentId) {
  const ann = visibleAnnouncements(snap, studentId, "vi").filter((a) => !a.read).length;
  const ntf = (snap.notifications || []).filter((n) => n.student_id === studentId && !n.read_at).length;
  return ann + ntf;
}

module.exports = { createLearnerRouter };
