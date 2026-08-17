const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { now, parseJson, alive, aliveById, like, programShortName } = require("../lib/convex-db");
const {
  requireAuth,
  requireRole,
  hashPassword,
  verifyPassword,
  tooManyLogins,
  recordLogin,
  editorLocked,
  randomId,
  refreshStaffSessionUser,
  staffUserFromRow,
} = require("../lib/auth");
const C = require("../lib/lms-core");
const V = require("../lib/validate");
const { remainingSeats, parsePrice, pickCopy } = require("../lib/serialize");
const L = require("../lib/learner");
const Security = require("../lib/lms-security");
const StaffPortal = require("../lib/staff-portal");
const PasswordReset = require("../lib/password-reset");
const { attachLearnerAdmin } = require("./admin-learner");

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads", "cms");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().slice(0, 8);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^(image\/|application\/pdf|application\/zip|text\/)/.test(file.mimetype);
    cb(ok ? null : new Error("Unsupported file type"), ok);
  },
});

function sendErr(res, err) {
  res.status(err.status || 500).json({ error: err.message || "Server error" });
}

function userId(req) {
  return req.session?.user?.id || null;
}

function json(value, fallback) {
  return JSON.stringify(value == null ? fallback : value);
}

function registrationCounts(status) {
  return !["waitlist", "cancelled"].includes(status);
}

function nextRegistrationId(snap) {
  const year = new Date().getFullYear();
  const prefix = `VSC-${year}-`;
  const sequence = (snap.registrations || []).reduce((max, row) => {
    const id = String(row.id || "");
    if (!id.startsWith(prefix)) return max;
    const value = Number(id.slice(prefix.length));
    return Number.isInteger(value) ? Math.max(max, value) : max;
  }, 0) + 1;
  return `${prefix}${String(sequence).padStart(6, "0")}`;
}

function createAdminRouter(store) {
  const router = express.Router();

  router.post("/login", async (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    if (tooManyLogins(ip)) {
      return res.status(429).json({ error: "Đăng nhập quá nhiều lần. Thử lại sau." });
    }
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const snap = await store.dump(true);
    const user = (snap.users || []).find((u) => u.email === email && Number(u.active) === 1);
    const ok = user && verifyPassword(password, user.password_hash);
    recordLogin(ip, ok);
    if (!ok) return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });
    req.session.user = staffUserFromRow(user);
    res.json({ user: req.session.user });
  });

  router.post("/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  router.post("/reset-password", async (req, res) => {
    try {
      const token = String(req.body?.token || "");
      const next = String(req.body?.newPassword || req.body?.password || "");
      const confirm = String(req.body?.confirmPassword || next);
      if (next.length < 12) throw V.fail("Mật khẩu mới tối thiểu 12 ký tự");
      if (next !== confirm) throw V.fail("Xác nhận mật khẩu không khớp");
      const claimed = await store.consumePasswordReset({
        tokenHash: C.hashToken(token),
        passwordHash: hashPassword(next),
        now: now(),
        expectedKind: "users",
      });
      if (!claimed?.claimed) {
        throw V.fail("Link đặt lại mật khẩu không còn hiệu lực");
      }
      res.json({ ok: true });
    } catch (err) {
      sendErr(res, err);
    }
  });

  router.use(requireAuth);
  router.use(async (req, res, next) => {
    try {
      const result = await refreshStaffSessionUser(store, req);
      if (!result.ok) return res.status(401).json({ error: "Unauthorized" });
      req.lmsScope = L.instructorScope(result.snap, req.session.user);
      next();
    } catch (err) {
      next(err);
    }
  });

  router.get("/me", (req, res) => {
    res.json({ user: req.session.user });
  });

  router.post("/change-password", async (req, res) => {
    try {
      const current = String(req.body?.currentPassword || "");
      const next = String(req.body?.newPassword || "");
      const confirm = String(req.body?.confirmPassword || "");
      if (next.length < 12) throw V.fail("Mật khẩu mới tối thiểu 12 ký tự");
      if (next !== confirm) throw V.fail("Xác nhận mật khẩu không khớp");
      if (current === next) throw V.fail("Mật khẩu mới phải khác mật khẩu tạm");

      const snap = await store.dump(true);
      const user = (snap.users || []).find((row) => String(row.id) === String(req.session.user.id));
      if (!user || !verifyPassword(current, user.password_hash)) {
        throw V.fail("Mật khẩu hiện tại không đúng");
      }
      if (verifyPassword(next, user.password_hash)) {
        throw V.fail("Mật khẩu mới phải khác mật khẩu tạm");
      }

      const changed = await store.applyPasswordChange({
        table: "users",
        id: user.id,
        passwordHash: hashPassword(next),
        now: now(),
      });
      req.session.user = staffUserFromRow({
        ...user,
        must_change_password: 0,
        session_version: changed.sessionVersion,
      });
      res.json({ user: req.session.user });
    } catch (err) {
      sendErr(res, err);
    }
  });

  router.use((req, res, next) => {
    if (req.session.user.mustChangePassword) {
      return res.status(403).json({
        error: "Cần đổi mật khẩu trước khi tiếp tục",
        code: "MUST_CHANGE_PASSWORD",
      });
    }
    if (req.session.user.role === "INSTRUCTOR" && !StaffPortal.instructorMayAccessAdmin(req.method, req.path)) {
      return res.status(403).json({ error: "Không có quyền thực hiện" });
    }
    next();
  });

  router.get("/dashboard", async (req, res) => {
    const snap = await store.dump();
    const today = now().slice(0, 10);
    const programs = alive(snap.programs).filter(
      (p) => p.status !== "hidden" && Security.instructorOwnsProgram(req.lmsScope, p.id),
    ).length;
    const scopedSessions = alive(snap.sessions).filter(
      (s) => Security.instructorOwnsSession(req.lmsScope, s.id),
    );
    const upcoming = scopedSessions.filter(
      (s) => ["open", "upcoming", "limited"].includes(s.status) && s.start_date >= today,
    ).length;
    const openReg = scopedSessions.filter((s) => ["open", "limited"].includes(s.status)).length;
    const registrations = req.lmsScope?.type === "instructor" ? 0 : alive(snap.registrations).length;
    const newRegs = req.lmsScope?.type === "instructor" ? 0 : alive(snap.registrations).filter((r) => r.status === "new").length;
    const learners = alive(snap.students).filter(
      (student) => Security.instructorOwnsStudent(req.lmsScope, snap, student.id),
    ).length;
    const drafts = alive(snap.insights).filter((i) => ["draft", "review", "ai_draft"].includes(i.status_vi)).length;
    const enIncomplete = alive(snap.programs).filter((p) => p.status === "published" && p.status_en !== "published").length;
    const upcomingRows = scopedSessions
      .filter((s) => ["open", "upcoming", "limited"].includes(s.status))
      .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)))
      .slice(0, 6)
      .map((row) => {
        const program = aliveById(snap.programs, row.program_id);
        return {
          id: row.id,
          session_name: row.session_name,
          start_date: row.start_date,
          capacity: row.capacity,
          registered_count: row.registered_count,
          remaining: remainingSeats(row),
          status: row.status,
          program_id: row.program_id,
          programName: programShortName(program) || row.program_id,
        };
      });
    const latestRegs = req.lmsScope?.type === "instructor" ? [] : alive(snap.registrations)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, 8)
      .map((row) => {
        const session = aliveById(snap.sessions, row.session_id);
        const program = aliveById(snap.programs, row.program_id);
        return {
          id: row.id,
          status: row.status,
          created_at: row.created_at,
          program_id: row.program_id,
          session_id: row.session_id,
          session_name: session?.session_name,
          start_date: session?.start_date,
          programName: programShortName(program),
        };
      });
    res.json({
      stats: { programs, upcoming, openReg, registrations, newRegs, learners, drafts, enIncomplete },
      upcoming: upcomingRows,
      latestRegs,
    });
  });

  router.get("/programs", async (req, res) => {
    const q = String(req.query.q || "").trim();
    const status = req.query.status;
    const snap = await store.dump();
    const rows = alive(snap.programs)
      .filter((row) => Security.instructorOwnsProgram(req.lmsScope, row.id))
      .filter((row) => !status || row.status === status)
      .filter((row) => !q || like(row.id, q) || like(row.slug_vi, q) || like(row.content_vi, q))
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || String(a.id).localeCompare(String(b.id)))
      .map((row) => {
        const vi = parseJson(row.content_vi, {});
        return {
          id: row.id,
          name: vi.shortName || vi.name || row.id,
          level: vi.level || row.level_key,
          format: row.format,
          price: row.price_amount,
          status: row.status,
          statusVi: row.status_vi,
          statusEn: row.status_en,
          sessions: alive(snap.sessions).filter((s) => s.program_id === row.id).length,
        };
      });
    res.json({ items: rows });
  });

  router.get("/programs/:id", async (req, res) => {
    const snap = await store.dump();
    const row = aliveById(snap.programs, req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });
    if (!Security.instructorOwnsProgram(req.lmsScope, row.id)) return res.status(403).json({ error: "Forbidden" });
    const instructors = (snap.program_instructors || [])
      .filter((x) => x.program_id === row.id)
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
    const sessions = alive(snap.sessions)
      .filter((s) => s.program_id === row.id)
      .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)));
    res.json({
      ...row,
      contentVi: parseJson(row.content_vi, {}),
      contentEn: parseJson(row.content_en, {}),
      seoVi: parseJson(row.seo_vi, {}),
      seoEn: parseJson(row.seo_en, {}),
      instructors,
      sessions,
    });
  });

  async function saveProgram(req, res) {
    try {
      const isNew = req.method === "POST";
      const id = isNew ? String(req.body.id || "").trim() : req.params.id;
      const snap = await store.dump(true);
      if (isNew) {
        V.required(req.body, ["id", "slugVi"]);
        V.slug(req.body.id, "id");
        V.slug(req.body.slugVi, "slugVi");
        if (aliveById(snap.programs, id) || (snap.programs || []).some((p) => p.id === id)) {
          throw V.fail("Program id already exists");
        }
      }
      const existing = isNew ? null : aliveById(snap.programs, id);
      if (!isNew && !existing) return res.status(404).json({ error: "Not found" });
      if (editorLocked(req.session.user)) {
        const locked = ["priceAmount", "status", "format", "capacityMin", "capacityMax"];
        for (const key of locked) {
          if (req.body[key] !== undefined) {
            throw Object.assign(V.fail("Editors cannot change configuration"), { status: 403 });
          }
        }
      }
      if (req.body.status) V.oneOf(req.body.status, V.PROGRAM_STATUS, "status");
      if (req.body.statusVi) V.oneOf(req.body.statusVi, V.LANG_STATUS, "statusVi");
      if (req.body.statusEn) V.oneOf(req.body.statusEn, V.LANG_STATUS, "statusEn");
      if (req.body.format) V.oneOf(req.body.format, V.FORMATS, "format");
      const slugVi = req.body.slugVi || existing?.slug_vi;
      const slugEn = req.body.slugEn || existing?.slug_en || slugVi;
      const clash = alive(snap.programs).find(
        (p) => p.id !== id && (p.slug_vi === slugVi || p.slug_en === slugEn),
      );
      if (clash) throw V.fail("Slug already in use");
      const ts = now();
      const contentVi = req.body.contentVi ? pickCopy(req.body.contentVi) : parseJson(existing?.content_vi, {});
      const contentEn = req.body.contentEn ? pickCopy(req.body.contentEn) : parseJson(existing?.content_en, {});
      const row = {
        ...(existing || {}),
        id,
        slug_vi: slugVi,
        slug_en: slugEn,
        level_key: req.body.levelKey ?? existing?.level_key ?? "beginner",
        price_amount: req.body.priceAmount != null ? V.nonNegInt(req.body.priceAmount, "price") : existing?.price_amount,
        currency: req.body.currency || existing?.currency || "VND",
        format: req.body.format || existing?.format || "online",
        duration_label_vi: req.body.durationLabelVi ?? existing?.duration_label_vi ?? "",
        duration_label_en: req.body.durationLabelEn ?? existing?.duration_label_en ?? "",
        session_count: req.body.sessionCount ?? existing?.session_count ?? null,
        total_duration_vi: req.body.totalDurationVi ?? existing?.total_duration_vi ?? "",
        total_duration_en: req.body.totalDurationEn ?? existing?.total_duration_en ?? "",
        capacity_min: req.body.capacityMin ?? existing?.capacity_min ?? null,
        capacity_max: req.body.capacityMax ?? existing?.capacity_max ?? null,
        class_size_label_vi: req.body.classSizeLabelVi ?? existing?.class_size_label_vi ?? "",
        class_size_label_en: req.body.classSizeLabelEn ?? existing?.class_size_label_en ?? "",
        status: req.body.status || existing?.status || "draft",
        featured: req.body.featured != null ? (req.body.featured ? 1 : 0) : existing?.featured ?? 0,
        primary_instructor_id: req.body.primaryInstructorId ?? existing?.primary_instructor_id ?? null,
        primary_platform: req.body.primaryPlatform ?? existing?.primary_platform ?? "",
        venue_default_id: req.body.venueDefaultId ?? existing?.venue_default_id ?? null,
        thumbnail: req.body.thumbnail ?? existing?.thumbnail ?? "",
        cover_image: req.body.coverImage ?? existing?.cover_image ?? "",
        practice_badge_vi: req.body.practiceBadgeVi ?? existing?.practice_badge_vi ?? "",
        practice_badge_en: req.body.practiceBadgeEn ?? existing?.practice_badge_en ?? "",
        schedule_label_vi: req.body.scheduleLabelVi ?? existing?.schedule_label_vi ?? "",
        schedule_label_en: req.body.scheduleLabelEn ?? existing?.schedule_label_en ?? "",
        support_label_vi: req.body.supportLabelVi ?? existing?.support_label_vi ?? "",
        support_label_en: req.body.supportLabelEn ?? existing?.support_label_en ?? "",
        location_online: req.body.locationOnline ?? existing?.location_online ?? "",
        certificate_enabled: req.body.certificateEnabled != null ? (req.body.certificateEnabled ? 1 : 0) : existing?.certificate_enabled ?? 1,
        certificate_code: req.body.certificateCode ?? existing?.certificate_code ?? "",
        minimum_attendance_percent: req.body.minimumAttendancePercent ?? existing?.minimum_attendance_percent ?? 75,
        require_completion: req.body.requireCompletion != null ? (req.body.requireCompletion ? 1 : 0) : existing?.require_completion ?? 1,
        require_payment: req.body.requirePayment != null ? (req.body.requirePayment ? 1 : 0) : existing?.require_payment ?? 1,
        require_admin_approval: req.body.requireAdminApproval != null ? (req.body.requireAdminApproval ? 1 : 0) : existing?.require_admin_approval ?? 1,
        certificate_template_id: req.body.certificateTemplateId ?? existing?.certificate_template_id ?? "tpl-vsc-default",
        join_link_open_minutes_before: req.body.joinLinkOpenMinutesBefore ?? existing?.join_link_open_minutes_before ?? 30,
        sort_order: req.body.sortOrder ?? existing?.sort_order ?? 0,
        status_vi: req.body.statusVi || existing?.status_vi || "draft",
        status_en: req.body.statusEn || existing?.status_en || "not_created",
        content_vi: json(contentVi, {}),
        content_en: json(contentEn, {}),
        seo_vi: json(req.body.seoVi ?? parseJson(existing?.seo_vi, {}), {}),
        seo_en: json(req.body.seoEn ?? parseJson(existing?.seo_en, {}), {}),
        updated_at: ts,
        updated_by: userId(req),
        created_at: existing?.created_at || ts,
        created_by: existing?.created_by || userId(req),
      };
      await store.upsert("programs", row);
      if (Array.isArray(req.body.instructors)) {
        await store.removeWhere("program_instructors", "program_id", id);
        for (const [idx, item] of req.body.instructors.entries()) {
          const instructorId = item.instructorId || item;
          await store.upsert("program_instructors", {
            id: `${id}::${instructorId}`,
            program_id: id,
            instructor_id: instructorId,
            role: item.role || "instructor",
            sort_order: idx,
          });
        }
      }
      res.json({ ok: true, id });
    } catch (err) {
      sendErr(res, err);
    }
  }
  router.post("/programs", requireRole("OWNER", "ADMIN", "EDITOR"), saveProgram);
  router.put("/programs/:id", requireRole("OWNER", "ADMIN", "EDITOR"), saveProgram);

  router.post("/programs/:id/en-draft", requireRole("OWNER", "ADMIN", "EDITOR"), async (req, res) => {
    const snap = await store.dump(true);
    const row = aliveById(snap.programs, req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });
    const vi = parseJson(row.content_vi, {});
    const currentEn = parseJson(row.content_en, {});
    const merged = { ...vi, ...currentEn };
    const statusEn = row.status_en === "published" ? "published" : "ai_draft";
    await store.upsert("programs", {
      ...row,
      content_en: JSON.stringify(merged),
      status_en: statusEn,
      updated_at: now(),
      updated_by: userId(req),
    });
    res.json({ ok: true, statusEn });
  });

  router.delete("/programs/:id", requireRole("OWNER", "ADMIN"), async (req, res) => {
    const snap = await store.dump(true);
    const linked = alive(snap.sessions).filter((s) => s.program_id === req.params.id).length;
    if (linked) return res.status(409).json({ error: `Không thể xóa: còn ${linked} lớp liên kết.` });
    const row = aliveById(snap.programs, req.params.id);
    if (row) {
      await store.upsert("programs", { ...row, deleted_at: now(), updated_at: now(), updated_by: userId(req) });
    }
    res.json({ ok: true });
  });

  router.get("/sessions", async (req, res) => {
    const programId = req.query.programId || null;
    const status = req.query.status || null;
    const snap = await store.dump();
    const rows = alive(snap.sessions)
      .filter((s) => !programId || s.program_id === programId)
      .filter((s) => !status || s.status === status)
      .filter((s) => req.lmsScope?.type !== "instructor" || req.lmsScope.sessionIds.has(s.id))
      .sort((a, b) => `${a.start_date}${a.start_time}`.localeCompare(`${b.start_date}${b.start_time}`))
      .map((row) => {
        const program = aliveById(snap.programs, row.program_id);
        return {
          ...row,
          remaining: remainingSeats(row),
          programName: programShortName(program) || row.program_id,
        };
      });
    res.json({ items: rows });
  });

  router.get("/sessions/:id", async (req, res) => {
    const snap = await store.dump();
    const row = aliveById(snap.sessions, req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });
    if (!Security.instructorOwnsSession(req.lmsScope, row.id)) return res.status(403).json({ error: "Forbidden" });
    res.json(row);
  });

  async function saveSession(req, res) {
    try {
      const isNew = req.method === "POST";
      if (editorLocked(req.session.user)) {
        return res.status(403).json({ error: "Editors cannot manage sessions" });
      }
      const body = req.body || {};
      V.required(body, isNew ? ["programId", "slug", "startDate", "startTime", "endTime"] : []);
      if (body.status) V.oneOf(body.status, V.SESSION_STATUS, "status");
      const id = isNew ? body.id || randomId("ses") : req.params.id;
      const snap = await store.dump(true);
      const existing = isNew ? null : aliveById(snap.sessions, id);
      if (!isNew && !existing) return res.status(404).json({ error: "Not found" });
      const programId = body.programId || existing.program_id;
      if (!aliveById(snap.programs, programId)) throw V.fail("Program not found");
      const slug = V.slug(body.slug || existing?.slug);
      const clash = alive(snap.sessions).find((s) => s.slug === slug && s.id !== id);
      if (clash) throw V.fail("Session slug already in use");
      const registered = existing?.registered_count || 0;
      const capacity = body.capacity != null ? V.nonNegInt(body.capacity, "capacity") : existing?.capacity;
      if (capacity != null && capacity < registered) {
        throw V.fail("Sĩ số không được thấp hơn số đã đăng ký");
      }
      const ts = now();
      await store.upsert("sessions", {
        ...(existing || { registered_count: 0 }),
        id,
        program_id: programId,
        slug,
        session_name: body.sessionName ?? existing?.session_name ?? "",
        start_date: body.startDate || existing?.start_date,
        end_date: body.endDate ?? existing?.end_date ?? body.startDate ?? existing?.start_date,
        days_of_week: body.daysOfWeek ?? existing?.days_of_week ?? "",
        start_time: body.startTime || existing?.start_time,
        end_time: body.endTime || existing?.end_time,
        timezone: body.timezone || existing?.timezone || "Asia/Ho_Chi_Minh",
        format: body.format ?? existing?.format ?? null,
        venue_id: body.venueId ?? existing?.venue_id ?? null,
        online_platform: body.onlinePlatform ?? existing?.online_platform ?? "",
        meeting_url: body.meetingUrl ?? existing?.meeting_url ?? "",
        join_link_open_minutes_before:
          body.joinLinkOpenMinutesBefore != null && body.joinLinkOpenMinutesBefore !== ""
            ? V.nonNegInt(body.joinLinkOpenMinutesBefore, "joinLinkOpenMinutesBefore")
            : existing?.join_link_open_minutes_before ?? null,
        price_override: body.priceOverride != null ? V.nonNegInt(body.priceOverride, "price") : existing?.price_override,
        capacity,
        remaining_seats:
          body.remainingSeats != null ? V.nonNegInt(body.remainingSeats, "remainingSeats") : existing?.remaining_seats,
        status: body.status || existing?.status || "draft",
        type: body.type || existing?.type || "course",
        registration_open_date: body.registrationOpenDate ?? existing?.registration_open_date ?? null,
        registration_close_date: body.registrationCloseDate ?? existing?.registration_close_date ?? null,
        notes: body.notes ?? existing?.notes ?? "",
        description_vi: body.descriptionVi ?? existing?.description_vi ?? "",
        description_en: body.descriptionEn ?? existing?.description_en ?? "",
        updated_at: ts,
        updated_by: userId(req),
        created_at: existing?.created_at || ts,
        created_by: existing?.created_by || userId(req),
      });
      res.json({ ok: true, id });
    } catch (err) {
      sendErr(res, err);
    }
  }
  router.post("/sessions", requireRole("OWNER", "ADMIN"), saveSession);
  router.put("/sessions/:id", requireRole("OWNER", "ADMIN"), saveSession);

  router.delete("/sessions/:id", requireRole("OWNER", "ADMIN"), async (req, res) => {
    const snap = await store.dump(true);
    const regs = alive(snap.registrations).filter(
      (r) => r.session_id === req.params.id && r.status !== "cancelled",
    ).length;
    if (regs) return res.status(409).json({ error: `Không thể xóa: còn ${regs} đăng ký trên lớp này.` });
    const row = aliveById(snap.sessions, req.params.id);
    if (row) {
      await store.upsert("sessions", { ...row, deleted_at: now(), updated_at: now(), updated_by: userId(req) });
    }
    res.json({ ok: true });
  });

  router.get("/venues", async (_req, res) => {
    const snap = await store.dump();
    res.json({ items: alive(snap.venues).sort((a, b) => String(a.name).localeCompare(String(b.name))) });
  });

  router.post("/venues", requireRole("OWNER", "ADMIN"), async (req, res) => {
    try {
      V.required(req.body, ["name", "addressVi"]);
      const id = req.body.id || randomId("venue");
      const ts = now();
      await store.upsert("venues", {
        id,
        name: req.body.name,
        address_vi: req.body.addressVi,
        address_en: req.body.addressEn || "",
        city: req.body.city || "",
        map_url: req.body.mapUrl || "",
        notes: req.body.notes || "",
        active: req.body.active === false ? 0 : 1,
        created_at: ts,
        updated_at: ts,
        created_by: userId(req),
        updated_by: userId(req),
      });
      res.json({ ok: true, id });
    } catch (err) {
      sendErr(res, err);
    }
  });

  router.put("/venues/:id", requireRole("OWNER", "ADMIN"), async (req, res) => {
    const snap = await store.dump(true);
    const row = aliveById(snap.venues, req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });
    await store.upsert("venues", {
      ...row,
      name: req.body.name ?? row.name,
      address_vi: req.body.addressVi ?? row.address_vi,
      address_en: req.body.addressEn ?? row.address_en,
      city: req.body.city ?? row.city,
      map_url: req.body.mapUrl ?? row.map_url,
      notes: req.body.notes ?? row.notes,
      active: req.body.active === false ? 0 : 1,
      updated_at: now(),
      updated_by: userId(req),
    });
    res.json({ ok: true });
  });

  router.delete("/venues/:id", requireRole("OWNER", "ADMIN"), async (req, res) => {
    const snap = await store.dump(true);
    const used = alive(snap.sessions).some((s) => s.venue_id === req.params.id);
    if (used) return res.status(409).json({ error: "Venue đang được dùng bởi một lớp học." });
    const row = aliveById(snap.venues, req.params.id);
    if (row) await store.upsert("venues", { ...row, deleted_at: now(), updated_at: now() });
    res.json({ ok: true });
  });

  router.get("/instructors", async (_req, res) => {
    const snap = await store.dump();
    res.json({
      items: alive(snap.instructors).sort(
        (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || String(a.name).localeCompare(String(b.name)),
      ),
    });
  });

  async function saveInstructor(req, res) {
    try {
      const isNew = req.method === "POST";
      const id = isNew ? req.body.id || randomId("ins") : req.params.id;
      if (isNew) V.required(req.body, ["name", "email"]);
      else V.required(req.body, ["name"]);
      const snap = await store.dump(true);
      const existing = isNew ? null : aliveById(snap.instructors, id);
      if (!isNew && !existing) return res.status(404).json({ error: "Not found" });
      const canManageAccounts = ["OWNER", "ADMIN"].includes(req.session.user.role);
      const linkedUser = (snap.users || []).find(
        (row) => String(row.instructor_id || "") === String(id) && Number(row.active) !== 0,
      );
      const requestedEmail = String(req.body.email ?? "").trim().toLowerCase();
      const loginEmail = canManageAccounts
        ? String(requestedEmail || linkedUser?.email || existing?.email || "").trim().toLowerCase()
        : String(linkedUser?.email || existing?.email || "").trim().toLowerCase();
      const profileEmail = canManageAccounts
        ? loginEmail
        : String(existing?.email || (isNew ? requestedEmail : "") || "").trim().toLowerCase();
      if (loginEmail) V.email(loginEmail);
      if (profileEmail) V.email(profileEmail);
      if (isNew && canManageAccounts && !loginEmail) throw V.fail("Email đăng nhập là bắt buộc");
      const temporaryPassword = String(req.body.temporaryPassword || "");
      if (temporaryPassword && !canManageAccounts) {
        throw V.fail("Không có quyền đặt mật khẩu giảng viên");
      }
      if (isNew && canManageAccounts && temporaryPassword.length < 12) {
        throw V.fail("Mật khẩu tạm tối thiểu 12 ký tự");
      }
      const ts = now();
      const instructor = {
        ...(existing || {}),
        id,
        name: req.body.name || existing?.name,
        email: profileEmail,
        academic_title: req.body.academicTitle ?? existing?.academic_title ?? "",
        role: req.body.role ?? existing?.role ?? "",
        company_role: req.body.companyRole ?? existing?.company_role ?? "",
        bio_vi: req.body.bioVi ?? existing?.bio_vi ?? "",
        bio_en: req.body.bioEn ?? existing?.bio_en ?? "",
        expertise_vi: req.body.expertiseVi ?? existing?.expertise_vi ?? "",
        expertise_en: req.body.expertiseEn ?? existing?.expertise_en ?? "",
        photo: req.body.photo ?? existing?.photo ?? "",
        featured: req.body.featured ? 1 : 0,
        active: req.body.active === false ? 0 : 1,
        website: req.body.website ?? existing?.website ?? "",
        social_links: json(req.body.socialLinks ?? parseJson(existing?.social_links, {}), {}),
        sort_order: req.body.sortOrder ?? existing?.sort_order ?? 0,
        updated_at: ts,
        updated_by: userId(req),
        created_at: existing?.created_at || ts,
        created_by: existing?.created_by || userId(req),
      };
      let user = null;
      if (canManageAccounts && loginEmail && (isNew || temporaryPassword || linkedUser)) {
        const emailOwner = (snap.users || []).find((row) => String(row.email || "").toLowerCase() === loginEmail);
        if (emailOwner && String(emailOwner.instructor_id || "") && String(emailOwner.instructor_id) !== String(id)) {
          throw V.fail("Email đã được dùng cho tài khoản khác");
        }
        const userRow =
          linkedUser ||
          (emailOwner?.role === "INSTRUCTOR" &&
          (!emailOwner.instructor_id || String(emailOwner.instructor_id) === String(id))
            ? emailOwner
            : null);
        if (emailOwner && String(emailOwner.id) !== String(userRow?.id || "")) {
          throw V.fail("Email đã được dùng cho tài khoản khác");
        }
        if (isNew && !userRow && !temporaryPassword) {
          throw V.fail("Mật khẩu tạm tối thiểu 12 ký tự");
        }
        if (userRow || temporaryPassword) {
          if (!userRow && temporaryPassword.length < 12) throw V.fail("Mật khẩu tạm tối thiểu 12 ký tự");
          user = {
            ...(userRow || {}),
            id: userRow?.id || randomId("usr"),
            email: loginEmail,
            name: req.body.name || existing?.name || userRow?.name,
            password_hash: temporaryPassword ? hashPassword(temporaryPassword) : userRow.password_hash,
            role: "INSTRUCTOR",
            active: req.body.active === false ? 0 : 1,
            must_change_password: temporaryPassword ? 1 : userRow?.must_change_password || 0,
            instructor_id: id,
            session_version: temporaryPassword
              ? Number(userRow?.session_version || 0) + 1
              : Number(userRow?.session_version || 0),
            updated_at: ts,
            created_at: userRow?.created_at || ts,
          };
        }
      }
      const result = await store.upsertInstructorAccount({ instructor, user });
      if (!result?.ok) throw V.fail(result?.error || "Không lưu được giảng viên");
      res.json({ ok: true, id });
    } catch (err) {
      sendErr(res, err);
    }
  }
  router.post("/instructors", requireRole("OWNER", "ADMIN", "EDITOR"), saveInstructor);
  router.put("/instructors/:id", requireRole("OWNER", "ADMIN", "EDITOR"), saveInstructor);
  router.delete("/instructors/:id", requireRole("OWNER", "ADMIN"), async (req, res) => {
    const snap = await store.dump(true);
    const row = aliveById(snap.instructors, req.params.id);
    const ts = now();
    if (row) await store.upsert("instructors", { ...row, deleted_at: ts, updated_at: ts });
    const user = (snap.users || []).find((item) => String(item.instructor_id || "") === String(req.params.id));
    if (user) await store.upsert("users", { ...user, active: 0, updated_at: ts });
    res.json({ ok: true });
  });

  router.post("/instructors/:id/reset-password", requireRole("OWNER", "ADMIN"), async (req, res) => {
    try {
      const snap = await store.dump(true);
      const instructor = aliveById(snap.instructors, req.params.id);
      if (!instructor) return res.status(404).json({ error: "Not found" });
      const user = (snap.users || []).find(
        (item) => String(item.instructor_id || "") === String(instructor.id) && Number(item.active) === 1,
      );
      const email = String(user?.email || "").trim().toLowerCase();
      if (!user || !email) {
        return res.status(409).json({ error: "Giảng viên chưa có tài khoản đăng nhập. Lưu email và mật khẩu tạm trước." });
      }
      const result = await PasswordReset.issuePasswordReset(store, req, {
        userId: user.id,
        email,
        name: instructor.name || user.name,
        path: PasswordReset.resetPathForUser(user),
        kind: "password_reset",
        subject: "Đặt lại mật khẩu cổng giảng viên VSC Academy",
      });
      res.json({ ok: true, emailed: result.emailed, to: result.to });
    } catch (err) {
      sendErr(res, err);
    }
  });

  router.get("/registrations", async (req, res) => {
    const programId = req.query.programId || null;
    const sessionId = req.query.sessionId || null;
    const status = req.query.status || null;
    const q = String(req.query.q || "").trim();
    const snap = await store.dump();
    const rows = alive(snap.registrations)
      .filter((r) => !programId || r.program_id === programId)
      .filter((r) => !sessionId || r.session_id === sessionId)
      .filter((r) => !status || r.status === status)
      .filter((r) => !q || like(r.full_name, q) || like(r.email, q) || like(r.phone, q) || like(r.id, q))
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .map((row) => {
        const session = aliveById(snap.sessions, row.session_id);
        const program = aliveById(snap.programs, row.program_id);
        return {
          ...row,
          session_name: session?.session_name,
          start_date: session?.start_date,
          programName: programShortName(program),
          utm: parseJson(row.utm, {}),
          invoice: parseJson(row.invoice, {}),
          notes: parseJson(row.notes, []),
        };
      });
    res.json({ items: rows });
  });

  router.get("/registrations/export.csv", async (req, res) => {
    if (editorLocked(req.session.user)) return res.status(403).json({ error: "Forbidden" });
    const snap = await store.dump();
    const rows = alive(snap.registrations).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    const header = "Name,Phone,Email,Program,Session,Status,Amount,Created At";
    const lines = rows.map((row) => {
      const program = aliveById(snap.programs, row.program_id);
      const session = aliveById(snap.sessions, row.session_id);
      return [
        row.full_name,
        row.phone,
        row.email,
        programShortName(program),
        session?.session_name || "",
        row.status,
        row.amount || "",
        row.created_at,
      ]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",");
    });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=vsc-registrations.csv");
    res.send("\uFEFF" + [header, ...lines].join("\n"));
  });

  router.get("/registrations/:id", async (req, res) => {
    const snap = await store.dump();
    const row = aliveById(snap.registrations, req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });
    const session = aliveById(snap.sessions, row.session_id);
    const program = aliveById(snap.programs, row.program_id);
    res.json({
      ...row,
      session_name: session?.session_name,
      start_date: session?.start_date,
      start_time: session?.start_time,
      end_time: session?.end_time,
      programName: programShortName(program),
      utm: parseJson(row.utm, {}),
      invoice: parseJson(row.invoice, {}),
      notes: parseJson(row.notes, []),
    });
  });

  async function adjustRegistrationCount(snap, sessionId, delta, ts) {
    if (!sessionId || !delta) return;
    const session = aliveById(snap.sessions, sessionId);
    if (!session) return;
    await store.upsert("sessions", {
      ...session,
      registered_count: Math.max(0, Number(session.registered_count || 0) + delta),
      updated_at: ts,
    });
  }

  async function saveRegistration(req, res) {
    try {
      const isNew = req.method === "POST";
      const body = req.body || {};
      const snap = await store.dump(true);
      const row = isNew ? null : aliveById(snap.registrations, req.params.id);
      if (!isNew && !row) return res.status(404).json({ error: "Not found" });
      const value = (key, column, fallback = "") => body[key] !== undefined ? body[key] : row?.[column] ?? fallback;
      const fullName = String(value("fullName", "full_name")).trim();
      const phone = String(value("phone", "phone")).trim();
      const email = String(value("email", "email")).trim().toLowerCase();
      const sessionId = String(value("sessionId", "session_id")).trim();
      const status = String(value("status", "status", "new")).trim();
      const amount = body.amount !== undefined || isNew ? V.nonNegInt(value("amount", "amount", 0), "amount") : row.amount;
      if (isNew) V.required({ fullName, phone, email, sessionId, status, amount }, ["fullName", "phone", "email", "sessionId", "status", "amount"]);
      if (isNew || body.fullName !== undefined) V.required({ fullName }, ["fullName"]);
      if (isNew || body.phone !== undefined) { V.required({ phone }, ["phone"]); V.phone(phone); }
      if (isNew || body.email !== undefined) { V.required({ email }, ["email"]); V.email(email); }
      if (isNew || body.status !== undefined) V.oneOf(status, V.REG_STATUS, "status");
      const session = sessionId ? aliveById(snap.sessions, sessionId) : null;
      if ((isNew || body.sessionId !== undefined) && !session) throw V.fail("Session not found");
      const notes = parseJson(row?.notes, []);
      if (body.note) notes.push({ at: now(), by: req.session.user.email, text: body.note, status });
      const ts = now();
      const updated = {
        ...(row || {}),
        id: row?.id || nextRegistrationId(snap),
        full_name: fullName,
        phone,
        email,
        job_role: String(value("jobRole", "job_role")).trim(),
        organization: String(value("organization", "organization")).trim(),
        goal: String(value("goal", "goal")).trim(),
        source: String(value("source", "source")).trim(),
        session_id: session?.id || row.session_id,
        program_id: session?.program_id || row.program_id,
        student_id: row?.student_id || null,
        amount,
        currency: "VND",
        status,
        consent_privacy: body.consentPrivacy !== undefined ? (body.consentPrivacy ? 1 : 0) : row?.consent_privacy ?? 0,
        consent_marketing: body.consentMarketing !== undefined ? (body.consentMarketing ? 1 : 0) : row?.consent_marketing ?? 0,
        utm: row?.utm || "{}",
        invoice: row?.invoice || "{}",
        notes: JSON.stringify(notes),
        locale: row?.locale || "vi",
        created_at: row?.created_at || ts,
        created_by: row?.created_by || userId(req),
        updated_at: ts,
        updated_by: userId(req),
      };
      const oldCounted = row && registrationCounts(row.status);
      const newCounted = registrationCounts(updated.status);
      let activation = null;
      if (updated.status === "confirmed") activation = await L.ensureStudentAndEnrollment(store, snap, updated);
      else await store.upsert("registrations", updated);
      if (row?.session_id !== updated.session_id) {
        if (oldCounted) await adjustRegistrationCount(snap, row.session_id, -1, ts);
        if (newCounted) await adjustRegistrationCount(snap, updated.session_id, 1, ts);
      } else if (!!oldCounted !== newCounted) {
        await adjustRegistrationCount(snap, updated.session_id, newCounted ? 1 : -1, ts);
      } else if (isNew && newCounted) {
        await adjustRegistrationCount(snap, updated.session_id, 1, ts);
      }
      res.status(isNew ? 201 : 200).json({ ok: true, id: updated.id, emailed: !!activation?.emailed, to: activation?.to });
    } catch (err) {
      sendErr(res, err);
    }
  }

  router.post("/registrations", requireRole("OWNER", "ADMIN"), saveRegistration);
  router.put("/registrations/:id", requireRole("OWNER", "ADMIN"), saveRegistration);

  router.delete("/registrations/:id", requireRole("OWNER", "ADMIN"), async (req, res) => {
    const snap = await store.dump(true);
    const row = aliveById(snap.registrations, req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });
    const linkedStudent = row.student_id && alive(snap.students).some((student) => String(student.id) === String(row.student_id));
    const linked = alive(snap.enrollments).some((enrollment) =>
      String(enrollment.registration_id || "") === String(row.id) ||
      (row.student_id && String(enrollment.student_id || "") === String(row.student_id) && String(enrollment.session_id || "") === String(row.session_id)),
    );
    if (linkedStudent || linked) return res.status(409).json({ error: "Không thể xóa: đăng ký đã liên kết với học viên hoặc ghi danh đang hoạt động." });
    const ts = now();
    await store.upsert("registrations", { ...row, deleted_at: ts, updated_at: ts, updated_by: userId(req) });
    if (registrationCounts(row.status)) await adjustRegistrationCount(snap, row.session_id, -1, ts);
    res.json({ ok: true });
  });

  router.get("/insights", async (req, res) => {
    const status = req.query.status || null;
    const category = req.query.category || null;
    const snap = await store.dump();
    const items = alive(snap.insights)
      .filter((row) => !status || row.status_vi === status || row.status_en === status)
      .filter((row) => !category || row.category === category)
      .sort((a, b) => String(b.published_at || "").localeCompare(String(a.published_at || "")));
    res.json({ items });
  });

  async function saveInsight(req, res) {
    try {
      const isNew = req.method === "POST";
      const id = isNew ? req.body.id || randomId("art") : req.params.id;
      if (isNew) V.required(req.body, ["titleVi", "slugVi"]);
      const snap = await store.dump(true);
      const existing = isNew ? null : aliveById(snap.insights, id);
      if (!isNew && !existing) return res.status(404).json({ error: "Not found" });
      if (req.body.slugVi) V.slug(req.body.slugVi, "slugVi");
      const ts = now();
      await store.upsert("insights", {
        ...(existing || {}),
        id,
        slug_vi: req.body.slugVi || existing?.slug_vi,
        slug_en: req.body.slugEn || existing?.slug_en || req.body.slugVi || existing?.slug_vi,
        title_vi: req.body.titleVi || existing?.title_vi,
        title_en: req.body.titleEn ?? existing?.title_en ?? "",
        excerpt_vi: req.body.excerptVi ?? existing?.excerpt_vi ?? "",
        excerpt_en: req.body.excerptEn ?? existing?.excerpt_en ?? "",
        content_vi: req.body.contentVi ?? existing?.content_vi ?? "",
        content_en: req.body.contentEn ?? existing?.content_en ?? "",
        cover_image: req.body.coverImage ?? existing?.cover_image ?? "",
        category: req.body.category ?? existing?.category ?? "",
        tags: json(req.body.tags ?? parseJson(existing?.tags, []), []),
        author_id: req.body.authorId || existing?.author_id || "vsc-editorial",
        content_type: req.body.contentType || existing?.content_type || "knowledge",
        published_at: req.body.publishedAt || existing?.published_at || ts.slice(0, 10),
        reading_time: req.body.readingTime ?? existing?.reading_time ?? null,
        status_vi: req.body.statusVi || existing?.status_vi || "draft",
        status_en: req.body.statusEn || existing?.status_en || "not_created",
        featured: req.body.featured ? 1 : 0,
        seo: json(req.body.seo ?? parseJson(existing?.seo, {}), {}),
        noindex: req.body.noindex ? 1 : 0,
        updated_at: ts,
        updated_by: userId(req),
        created_at: existing?.created_at || ts,
        created_by: existing?.created_by || userId(req),
      });
      res.json({ ok: true, id });
    } catch (err) {
      sendErr(res, err);
    }
  }
  router.post("/insights", requireRole("OWNER", "ADMIN", "EDITOR"), saveInsight);
  router.put("/insights/:id", requireRole("OWNER", "ADMIN", "EDITOR"), saveInsight);
  router.post("/insights/:id/en-draft", requireRole("OWNER", "ADMIN", "EDITOR"), async (req, res) => {
    const snap = await store.dump(true);
    const row = aliveById(snap.insights, req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });
    await store.upsert("insights", {
      ...row,
      title_en: row.title_en || row.title_vi,
      excerpt_en: row.excerpt_en || row.excerpt_vi,
      content_en: row.content_en || row.content_vi,
      status_en: row.status_en === "published" ? "published" : "ai_draft",
      updated_at: now(),
    });
    res.json({ ok: true });
  });
  router.delete("/insights/:id", requireRole("OWNER", "ADMIN"), async (req, res) => {
    const snap = await store.dump(true);
    const row = aliveById(snap.insights, req.params.id);
    if (row) await store.upsert("insights", { ...row, deleted_at: now(), updated_at: now() });
    res.json({ ok: true });
  });

  router.get("/resources", async (_req, res) => {
    const snap = await store.dump();
    res.json({
      items: alive(snap.resources).sort((a, b) => String(b.published_at || "").localeCompare(String(a.published_at || ""))),
    });
  });
  async function saveResource(req, res) {
    try {
      const isNew = req.method === "POST";
      const id = isNew ? req.body.id || randomId("res") : req.params.id;
      if (isNew) V.required(req.body, ["titleVi", "slug"]);
      const snap = await store.dump(true);
      const existing = isNew ? null : aliveById(snap.resources, id);
      if (!isNew && !existing) return res.status(404).json({ error: "Not found" });
      const ts = now();
      await store.upsert("resources", {
        ...(existing || {}),
        id,
        slug: req.body.slug || existing?.slug,
        title_vi: req.body.titleVi || existing?.title_vi,
        title_en: req.body.titleEn ?? existing?.title_en ?? "",
        description_vi: req.body.descriptionVi ?? existing?.description_vi ?? "",
        description_en: req.body.descriptionEn ?? existing?.description_en ?? "",
        category: req.body.category ?? existing?.category ?? "",
        type: req.body.type || existing?.type || "guide",
        cover_image: req.body.coverImage ?? existing?.cover_image ?? "",
        file_url: req.body.fileUrl ?? existing?.file_url ?? "",
        external_url: req.body.externalUrl ?? existing?.external_url ?? "",
        access_type: req.body.accessType || existing?.access_type || "public",
        published_at: req.body.publishedAt || existing?.published_at || ts.slice(0, 10),
        status: req.body.status || existing?.status || "draft",
        featured: req.body.featured ? 1 : 0,
        tags: json(req.body.tags ?? parseJson(existing?.tags, []), []),
        gated: req.body.accessType === "registration" || req.body.gated ? 1 : 0,
        updated_at: ts,
        updated_by: userId(req),
        created_at: existing?.created_at || ts,
        created_by: existing?.created_by || userId(req),
      });
      res.json({ ok: true, id });
    } catch (err) {
      sendErr(res, err);
    }
  }
  router.post("/resources", requireRole("OWNER", "ADMIN", "EDITOR"), saveResource);
  router.put("/resources/:id", requireRole("OWNER", "ADMIN", "EDITOR"), saveResource);
  router.delete("/resources/:id", requireRole("OWNER", "ADMIN"), async (req, res) => {
    const snap = await store.dump(true);
    const row = aliveById(snap.resources, req.params.id);
    if (row) await store.upsert("resources", { ...row, deleted_at: now(), updated_at: now() });
    res.json({ ok: true });
  });

  router.get("/media", async (req, res) => {
    const q = String(req.query.q || "").trim();
    const snap = await store.dump();
    res.json({
      items: (snap.media || [])
        .filter((row) => !q || like(row.original_name, q) || like(row.alt_vi, q))
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))),
    });
  });
  router.post("/media", requireRole("OWNER", "ADMIN", "EDITOR"), upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const id = randomId("media");
    const url = `/uploads/cms/${req.file.filename}`;
    await store.upsert("media", {
      id,
      filename: req.file.filename,
      original_name: req.file.originalname,
      mime: req.file.mimetype,
      size: req.file.size,
      url,
      alt_vi: req.body.altVi || "",
      alt_en: req.body.altEn || "",
      created_at: now(),
      created_by: userId(req),
    });
    res.json({ ok: true, id, url });
  });
  router.delete("/media/:id", requireRole("OWNER", "ADMIN"), async (req, res) => {
    const snap = await store.dump(true);
    const row = (snap.media || []).find((m) => m.id === req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });
    try {
      fs.unlinkSync(path.join(UPLOAD_DIR, row.filename));
    } catch {}
    await store.remove("media", row.id);
    res.json({ ok: true });
  });

  router.get("/settings", requireRole("OWNER"), async (_req, res) => {
    const snap = await store.dump();
    const out = {};
    (snap.settings || []).forEach((row) => {
      out[row.key || row.id] = parseJson(row.value, row.value);
    });
    res.json(out);
  });
  router.put("/settings", requireRole("OWNER"), async (req, res) => {
    const allowed = ["brand", "contact", "seo", "footer", "registration"];
    const snap = await store.dump(true);
    for (const key of allowed) {
      if (req.body[key] != null) {
        const existing = (snap.settings || []).find((s) => s.key === key || s.id === key) || { key, id: key };
        await store.upsert("settings", { ...existing, id: key, key, value: JSON.stringify(req.body[key]) });
      }
    }
    res.json({ ok: true });
  });

  attachLearnerAdmin(router, store);
  router.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  return router;
}

module.exports = { createAdminRouter };
