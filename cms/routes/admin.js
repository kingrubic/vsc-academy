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
} = require("../lib/auth");
const V = require("../lib/validate");
const { remainingSeats, parsePrice, pickCopy } = require("../lib/serialize");
const L = require("../lib/learner");
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

function createAdminRouter(store) {
  const router = express.Router();

  router.post("/login", async (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    if (tooManyLogins(ip)) {
      return res.status(429).json({ error: "Too many login attempts. Try again later." });
    }
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const snap = await store.dump(true);
    const user = (snap.users || []).find((u) => u.email === email && Number(u.active) === 1);
    const ok = user && verifyPassword(password, user.password_hash);
    recordLogin(ip, ok);
    if (!ok) return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });
    const mustChangePassword = Number(user.must_change_password) === 1;
    req.session.user = {
      id: String(user.id),
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword,
    };
    res.json({ user: req.session.user });
  });

  router.post("/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  router.get("/me", requireAuth, (req, res) => {
    res.json({ user: req.session.user });
  });

  router.post("/change-password", requireAuth, async (req, res) => {
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

      await store.upsert("users", {
        ...user,
        password_hash: hashPassword(next),
        must_change_password: 0,
        updated_at: now(),
      });
      req.session.user = { ...req.session.user, mustChangePassword: false };
      res.json({ user: req.session.user });
    } catch (err) {
      sendErr(res, err);
    }
  });

  router.use(requireAuth);
  router.use(async (req, res, next) => {
    try {
      const snap = await store.dump(true);
      const currentUser = (snap.users || []).find(
        (row) => String(row.id) === String(req.session.user.id),
      );
      if (!currentUser || Number(currentUser.active) !== 1) {
        req.session.destroy(() => {});
        return res.status(401).json({ error: "Unauthorized" });
      }
      req.session.user = {
        ...req.session.user,
        email: currentUser.email,
        name: currentUser.name,
        role: currentUser.role,
        instructorId: currentUser.instructor_id || null,
        mustChangePassword: Number(currentUser.must_change_password) === 1,
      };
      req.lmsScope = L.instructorScope(snap, req.session.user);
    } catch (err) {
      return next(err);
    }
    if (req.session.user.mustChangePassword) {
      return res.status(403).json({
        error: "Cần đổi mật khẩu trước khi tiếp tục",
        code: "MUST_CHANGE_PASSWORD",
      });
    }
    if (req.session.user.role === "INSTRUCTOR") {
      const p = req.path || "";
      if (p.startsWith("/settings")) return res.status(403).json({ error: "Forbidden" });
      if (req.method !== "GET" && (p.startsWith("/programs") || p.startsWith("/venues") || p.startsWith("/registrations"))) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }
    next();
  });

  router.get("/dashboard", async (_req, res) => {
    const snap = await store.dump();
    const today = now().slice(0, 10);
    const programs = alive(snap.programs).filter((p) => p.status !== "hidden").length;
    const upcoming = alive(snap.sessions).filter(
      (s) => ["open", "upcoming", "limited"].includes(s.status) && s.start_date >= today,
    ).length;
    const openReg = alive(snap.sessions).filter((s) => ["open", "limited"].includes(s.status)).length;
    const registrations = alive(snap.registrations).length;
    const newRegs = alive(snap.registrations).filter((r) => r.status === "new").length;
    const learners = alive(snap.students).length;
    const drafts = alive(snap.insights).filter((i) => ["draft", "review", "ai_draft"].includes(i.status_vi)).length;
    const enIncomplete = alive(snap.programs).filter((p) => p.status === "published" && p.status_en !== "published").length;
    const upcomingRows = alive(snap.sessions)
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
    const latestRegs = alive(snap.registrations)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, 8)
      .map((row) => {
        const session = aliveById(snap.sessions, row.session_id);
        const program = aliveById(snap.programs, row.program_id);
        return {
          ...row,
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
      if (body.slug) V.slug(body.slug);
      if (body.status) V.oneOf(body.status, V.SESSION_STATUS, "status");
      const id = isNew ? body.id || randomId("ses") : req.params.id;
      const snap = await store.dump(true);
      const existing = isNew ? null : aliveById(snap.sessions, id);
      if (!isNew && !existing) return res.status(404).json({ error: "Not found" });
      const programId = body.programId || existing.program_id;
      if (!aliveById(snap.programs, programId)) throw V.fail("Program not found");
      const slug = body.slug || existing?.slug;
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
      if (isNew) V.required(req.body, ["name"]);
      const snap = await store.dump(true);
      const existing = isNew ? null : aliveById(snap.instructors, id);
      if (!isNew && !existing) return res.status(404).json({ error: "Not found" });
      const ts = now();
      await store.upsert("instructors", {
        ...(existing || {}),
        id,
        name: req.body.name || existing?.name,
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
      });
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
    if (row) await store.upsert("instructors", { ...row, deleted_at: now(), updated_at: now() });
    res.json({ ok: true });
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

  router.put("/registrations/:id", requireRole("OWNER", "ADMIN"), async (req, res) => {
    const snap = await store.dump(true);
    const row = aliveById(snap.registrations, req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });
    if (req.body.status) V.oneOf(req.body.status, V.REG_STATUS, "status");
    const notes = parseJson(row.notes, []);
    if (req.body.note) {
      notes.push({ at: now(), by: req.session.user.email, text: req.body.note, status: req.body.status || row.status });
    }
    let sessionId = req.body.sessionId ?? row.session_id;
    let programId = req.body.programId ?? row.program_id;
    if (req.body.sessionId && req.body.sessionId !== row.session_id) {
      const session = aliveById(snap.sessions, req.body.sessionId);
      if (!session) return res.status(400).json({ error: "Session not found" });
      programId = session.program_id;
      sessionId = session.id;
    }
    const updated = {
      ...row,
      status: req.body.status || row.status,
      session_id: sessionId,
      program_id: programId,
      notes: JSON.stringify(notes),
      updated_at: now(),
      updated_by: userId(req),
    };
    await store.upsert("registrations", updated);
    let activation = null;
    if (updated.status === "confirmed") {
      const fresh = await store.dump(true);
      activation = await L.ensureStudentAndEnrollment(store, fresh, updated);
    }
    res.json({ ok: true, activation });
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
  router.post("/insights", saveInsight);
  router.put("/insights/:id", saveInsight);
  router.post("/insights/:id/en-draft", async (req, res) => {
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
  router.post("/resources", saveResource);
  router.put("/resources/:id", saveResource);
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

  return router;
}

module.exports = { createAdminRouter };
