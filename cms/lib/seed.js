const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { openDb, now } = require("./db");
const { hashPassword } = require("./auth");
const { parsePrice, pickCopy } = require("./serialize");

const SITE = path.join(__dirname, "..", "..");
const FORCE = process.argv.includes("--force");

function loadBrowserScript(filename, sandbox) {
  const code = fs.readFileSync(path.join(SITE, filename), "utf8");
  vm.runInNewContext(code, sandbox, { filename });
}

function snapshotPrograms(windowObj) {
  return JSON.parse(JSON.stringify(windowObj.VSC_PROGRAMS || []));
}

function loadSiteData() {
  const sandbox = { window: {}, console };
  loadBrowserScript("schedule-data.js", sandbox);
  loadBrowserScript("course-data.js", sandbox);
  const viPrograms = snapshotPrograms(sandbox.window);
  const faculty = JSON.parse(JSON.stringify(sandbox.window.VSC_FACULTY || {}));
  const info = JSON.parse(JSON.stringify(sandbox.window.VSC_PROGRAM_INFO || {}));
  const schedules = JSON.parse(JSON.stringify(sandbox.window.VSC_SCHEDULES || []));
  loadBrowserScript("course-data-en.js", sandbox);
  const enPrograms = snapshotPrograms(sandbox.window);
  loadBrowserScript("article-data.js", sandbox);
  loadBrowserScript("resource-data.js", sandbox);
  loadBrowserScript("content-en.js", sandbox);
  return {
    viPrograms,
    enPrograms,
    faculty,
    info,
    schedules,
    articles: sandbox.window.VSC_ARTICLES || [],
    authors: sandbox.window.VSC_AUTHORS || {},
    categories: sandbox.window.VSC_ARTICLE_CATEGORIES || {},
    resources: sandbox.window.VSC_RESOURCES || [],
  };
}

function levelKey(id) {
  if (id === "ai-foundation") return "foundation";
  if (id === "ai-agent-automation") return "advanced";
  if (id === "ai-workflow-workshop") return "workshop";
  return "beginner";
}

function slugEn(id, slugVi) {
  if (id === "ai-foundation") return "applied-ai-for-work";
  return slugVi;
}

function seed(db) {
  const existing = db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
  if (existing && !FORCE) {
    console.log("CMS already seeded. Use npm run seed:force to replace.");
    return { seeded: false };
  }

  const data = loadSiteData();
  const ts = now();
  const password = process.env.ADMIN_PASSWORD || "VscAcademy!2026";

  const tx = db.transaction(() => {
    if (FORCE) {
      db.exec(`
        DELETE FROM registrations;
        DELETE FROM program_instructors;
        DELETE FROM sessions;
        DELETE FROM programs;
        DELETE FROM instructors;
        DELETE FROM venues;
        DELETE FROM insights;
        DELETE FROM resources;
        DELETE FROM media;
        DELETE FROM settings;
        DELETE FROM users;
      `);
    }

    db.prepare(
      `INSERT INTO users (email, name, password_hash, role, active, created_at, updated_at)
       VALUES (?, ?, ?, 'OWNER', 1, ?, ?)`,
    ).run("owner@vsc.academy", "VSC Owner", hashPassword(password), ts, ts);

    db.prepare(
      `INSERT INTO venues (id, name, address_vi, address_en, city, map_url, notes, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, '', '', 1, ?, ?)`,
    ).run(
      "the-comma-coffee",
      "The Comma Coffee",
      "21 Hoa Mai, Phường Cầu Kiệu, TP.HCM",
      "21 Hoa Mai, Cau Kieu Ward, Ho Chi Minh City",
      "Ho Chi Minh City",
      ts,
      ts,
    );

    for (const [id, person] of Object.entries(data.faculty)) {
      db.prepare(
        `INSERT INTO instructors (id, name, academic_title, role, company_role, bio_vi, bio_en, photo, featured, active, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, '', ?, ?, ?, 1, 1, 0, ?, ?)`,
      ).run(
        id,
        person.name,
        "",
        person.title || "",
        person.bio || "",
        person.bio || "",
        person.image || "",
        ts,
        ts,
      );
    }

    if (!data.faculty["vsc-editorial"] && data.authors["vsc-editorial"]) {
      const a = data.authors["vsc-editorial"];
      db.prepare(
        `INSERT OR IGNORE INTO instructors (id, name, academic_title, role, bio_vi, bio_en, featured, active, sort_order, created_at, updated_at)
         VALUES (?, ?, '', ?, ?, ?, 0, 1, 99, ?, ?)`,
      ).run(a.authorId, a.name, a.title || "", a.bio || "", a.bio || "", ts, ts);
    }

    const viById = Object.fromEntries(data.viPrograms.map((p) => [p.id, p]));
    const enById = Object.fromEntries(data.enPrograms.map((p) => [p.id, p]));
    const programIds = new Set([...Object.keys(viById), ...Object.keys(data.info)]);

    data.schedules.forEach((s) => programIds.add(s.programId));

    let order = 0;
    for (const id of programIds) {
      const vi = viById[id] || {};
      const en = enById[id] || {};
      const info = data.info[id] || {};
      const slugVi = vi.slug || id;
      const published = Boolean(viById[id]);
      db.prepare(
        `INSERT INTO programs (
          id, slug_vi, slug_en, level_key, price_amount, currency, format,
          duration_label_vi, duration_label_en, session_count, total_duration_vi, total_duration_en,
          capacity_min, capacity_max, class_size_label_vi, class_size_label_en,
          status, featured, primary_instructor_id, primary_platform, venue_default_id,
          practice_badge_vi, practice_badge_en, schedule_label_vi, schedule_label_en,
          support_label_vi, support_label_en, location_online, sort_order,
          status_vi, status_en, content_vi, content_en, seo_vi, seo_en, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'VND', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        slugVi,
        slugEn(id, slugVi),
        levelKey(id),
        parsePrice(info.price || vi.price),
        info.format || vi.format || "online",
        info.durationLabel || "",
        en.durationLabel || info.durationLabel || "",
        null,
        info.totalDuration || "",
        en.totalDuration || info.totalDuration || "",
        info.minCapacity ?? vi.minCapacity ?? null,
        info.maxCapacity ?? vi.maxCapacity ?? null,
        info.classSizeLabel || "",
        en.classSizeLabel || info.classSizeLabel || "",
        published ? "published" : "hidden",
        published ? 1 : 0,
        (vi.instructors && vi.instructors[0]) || "tran-anh-vu",
        info.primaryPlatform || "",
        info.venueName ? "the-comma-coffee" : null,
        info.practiceBadge || "",
        en.practiceBadge || "",
        info.scheduleLabel || "",
        en.scheduleLabel || "",
        info.supportLabel || "",
        en.supportLabel || "",
        info.format === "offline" ? "" : info.location || "Google Meet",
        order++,
        published ? "published" : "draft",
        en.name ? "published" : "not_created",
        JSON.stringify(pickCopy(vi)),
        JSON.stringify(pickCopy(en)),
        JSON.stringify(vi.seo || {}),
        JSON.stringify(en.seo || {}),
        ts,
        ts,
      );

      const instructors = vi.instructors || ["tran-anh-vu"];
      instructors.forEach((instructorId, idx) => {
        const exists = db.prepare("SELECT id FROM instructors WHERE id = ?").get(instructorId);
        if (!exists) return;
        db.prepare(
          `INSERT OR IGNORE INTO program_instructors (program_id, instructor_id, role, sort_order)
           VALUES (?, ?, ?, ?)`,
        ).run(id, instructorId, idx === 0 ? "lead" : "instructor", idx);
      });
    }

    const EN_SESSION_COPY = {
      "ai-starter-thang-8":
        "A practical introduction to thinking, communicating and working with AI through one focused real-world task, across two live online sessions.",
      "ai-ung-dung-cong-viec":
        "Build the mindset, skills and workflows needed to make AI a practical part of everyday work.",
      "ai-agent-automation":
        "For learners ready to design workflows, automation and an AI Agent around a real work context.",
      "ai-workflow-online":
        "Design a repeatable AI workflow you can keep using in your own work.",
      "ai-starter-thang-9":
        "A practical introduction to thinking, communicating and working with AI through one focused real-world task, across two live online sessions.",
    };
    const EN_FACTS = {
      "ai-starter": {
        duration_label_en: "2 sessions × 120 minutes",
        total_duration_en: "4 hours",
        class_size_label_en: "8–25 learners",
      },
      "ai-foundation": {
        duration_label_en: "2 sessions × 120 minutes",
        total_duration_en: "4 hours",
        class_size_label_en: "8–25 learners",
        schedule_label_en: "Tue & Thu | 19:00–21:00",
        support_label_en: "30-day video access + 14-day Zalo support",
      },
      "ai-agent-automation": {
        class_size_label_en: "Up to 15 learners",
        practice_badge_en: "BUILD A PRACTICAL AI AGENT",
      },
    };

    for (const [id, facts] of Object.entries(EN_FACTS)) {
      const sets = Object.keys(facts).map((k) => `${k} = ?`).join(", ");
      db.prepare(`UPDATE programs SET ${sets} WHERE id = ?`).run(...Object.values(facts), id);
    }

    for (const event of data.schedules) {
      const remaining =
        event.remainingSeats == null ? null : Number(event.remainingSeats);
      const capacity = event.capacity ?? null;
      const registered =
        remaining == null || capacity == null ? 0 : Math.max(0, capacity - remaining);
      db.prepare(
        `INSERT INTO sessions (
          id, program_id, slug, session_name, start_date, end_date, start_time, end_time,
          timezone, format, venue_id, online_platform, price_override, capacity,
          registered_count, remaining_seats, status, type, description_vi, description_en,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Asia/Ho_Chi_Minh', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        event.id,
        event.programId,
        event.slug,
        event.shortTitle || event.title,
        event.date,
        event.date,
        event.startTime,
        event.endTime,
        event.format,
        event.format === "offline" ? "the-comma-coffee" : null,
        event.format === "online" ? event.location || "Google Meet" : "",
        null,
        capacity,
        registered,
        remaining,
        event.status === "ended" ? "completed" : event.status,
        event.type || "course",
        event.description || "",
        EN_SESSION_COPY[event.slug] || "",
        ts,
        ts,
      );
    }

    for (const article of data.articles) {
      db.prepare(
        `INSERT INTO insights (
          id, slug_vi, slug_en, title_vi, title_en, excerpt_vi, excerpt_en, category, tags,
          author_id, content_type, published_at, reading_time, status_vi, status_en, featured,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        article.id,
        article.slug,
        article.slug,
        article.title,
        article.titleEn || "",
        article.excerpt || "",
        article.excerptEn || "",
        article.category || "",
        JSON.stringify(article.tags || []),
        article.authorId || "vsc-editorial",
        article.contentType || "knowledge",
        article.publishedAt || ts,
        article.readingTime || null,
        article.status === "published" ? "published" : "draft",
        article.titleEn ? "published" : "not_created",
        article.featured ? 1 : 0,
        ts,
        ts,
      );
    }

    for (const resource of data.resources) {
      db.prepare(
        `INSERT INTO resources (
          id, slug, title_vi, title_en, description_vi, description_en, category, type,
          access_type, published_at, status, featured, tags, gated, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        resource.id,
        resource.slug,
        resource.title,
        resource.titleEn || "",
        resource.excerpt || "",
        resource.excerptEn || "",
        resource.category || "",
        resource.type || "guide",
        resource.gated ? "registration" : "public",
        resource.publishedAt || ts,
        resource.status === "published" ? "published" : "draft",
        resource.featured ? 1 : 0,
        JSON.stringify(resource.tags || []),
        resource.gated ? 1 : 0,
        ts,
        ts,
      );
    }

    const settings = {
      brand: {
        logo: "assets/logo-vsc-academy-white.webp",
        logoFooter: "assets/logo-vsc-academy-white-footer.webp",
        favicon: "assets/favicon-32.png",
        ogImage: "",
      },
      contact: {
        email: "vscacademy8@gmail.com",
        phone: "+84888833887",
        phoneLabel: "Anh Vũ",
        address: "The Comma Coffee, 21 Hoa Mai, Phường Cầu Kiệu, TP.HCM",
        zalo: "https://zalo.me/84888833887",
        facebook: "",
        linkedin: "",
        website: "https://vscacademy.vn",
      },
      seo: {
        titleVi: "VSC Academy | Applied AI Education",
        titleEn: "VSC Academy | Applied AI Education",
        descriptionVi: "Học AI ứng dụng qua thực hành — VSC Academy.",
        descriptionEn: "Learn applied AI through practice — VSC Academy.",
      },
      footer: {
        vi: "Applied AI Learning for Real Work.",
        en: "Applied AI Learning for Real Work.",
      },
      registration: {
        confirmationVi: "Đăng ký đã được ghi nhận. VSC Academy sẽ liên hệ để xác nhận lớp và hướng dẫn thanh toán.",
        confirmationEn: "Your registration has been received. VSC Academy will contact you to confirm the class and payment.",
        supportContact: "vscacademy8@gmail.com · +84 8888 33 887",
        policyVi: "",
        policyEn: "",
      },
      article_categories: data.categories,
    };
    const insertSetting = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
    for (const [key, value] of Object.entries(settings)) {
      insertSetting.run(key, JSON.stringify(value));
    }
  });

  tx();
  return { seeded: true, password };
}

if (require.main === module) {
  const db = openDb();
  const result = seed(db);
  if (result.seeded) {
    console.log("Seeded VSC Academy CMS.");
    console.log("Login: owner@vsc.academy");
    console.log(`Password: ${result.password}`);
    console.log("Change this password before production.");
  }
  db.close();
}

module.exports = { seed, loadSiteData };
