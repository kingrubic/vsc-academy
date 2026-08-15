const { parseJson, alive, aliveById } = require("./convex-db");

const COPY_KEYS = [
  "name",
  "shortName",
  "level",
  "subtitle",
  "eyebrow",
  "headline",
  "subheadline",
  "description",
  "heroHeadline",
  "tagline",
  "heroOutcomes",
  "heroNote",
  "heroMeta",
  "audience",
  "audienceClosing",
  "outcomes",
  "outcomeClosing",
  "outcomeProgress",
  "curriculum",
  "curriculumOutcomeLabel",
  "outputs",
  "outputDescription",
  "method",
  "final",
  "faq",
  "ctaLabel",
  "ctaHref",
  "courseSummary",
  "infoCard",
  "infoLabel",
  "pageChrome",
  "practiceTools",
];

const PUBLIC_SESSION_STATUS = {
  open: "open",
  upcoming: "upcoming",
  limited: "limited",
  full: "full",
  completed: "ended",
};

function formatPrice(amount) {
  const n = Math.round(Number(amount) || 0);
  return `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}đ`;
}

function parsePrice(label) {
  if (typeof label === "number") return label;
  const digits = String(label || "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function pickCopy(source = {}) {
  const out = {};
  for (const key of COPY_KEYS) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  return out;
}

function formatLabel(format, locale) {
  if (format === "offline") return locale === "en" ? "In person" : "Offline";
  if (format === "hybrid") return locale === "en" ? "Hybrid" : "Hybrid";
  return locale === "en" ? "Live online" : "Online trực tiếp";
}

function detailUrl(program) {
  return `/khoa-hoc/${program.slug_vi}`;
}

function registrationUrl(session) {
  return `/dang-ky?session=${encodeURIComponent(session.slug)}`;
}

function getVenue(snap, id) {
  return aliveById(snap.venues, id);
}

function programInfo(snap, row, locale = "vi") {
  const content = parseJson(locale === "en" ? row.content_en : row.content_vi, {});
  const venue = getVenue(snap, row.venue_default_id);
  const format = row.format;
  const info = {
    name: content.name || row.id,
    shortName: content.shortName || content.name || row.id,
    price: formatPrice(row.price_amount),
    format,
    formatLabel: locale === "en" ? formatLabel(format, "en") : formatLabel(format, "vi"),
    durationLabel:
      locale === "en" ? row.duration_label_en || row.duration_label_vi : row.duration_label_vi,
    totalDuration:
      locale === "en" ? row.total_duration_en || row.total_duration_vi : row.total_duration_vi,
    minCapacity: row.capacity_min,
    maxCapacity: row.capacity_max,
    classSizeLabel:
      locale === "en" ? row.class_size_label_en || row.class_size_label_vi : row.class_size_label_vi,
    primaryPlatform: row.primary_platform,
    location:
      format === "offline"
        ? venue
          ? `${venue.name} · ${locale === "en" ? venue.address_en || venue.address_vi : venue.address_vi}`
          : ""
        : row.location_online || "Google Meet",
  };
  if (row.schedule_label_vi) {
    info.scheduleLabel = locale === "en" ? row.schedule_label_en || row.schedule_label_vi : row.schedule_label_vi;
  }
  if (row.support_label_vi) {
    info.supportLabel = locale === "en" ? row.support_label_en || row.support_label_vi : row.support_label_vi;
  }
  if (row.practice_badge_vi) {
    info.practiceBadge = locale === "en" ? row.practice_badge_en || row.practice_badge_vi : row.practice_badge_vi;
  }
  if (venue && format === "offline") {
    info.venueName = venue.name;
    info.venueAddress = venue.address_vi;
    if (venue.address_en) info.venueAddressDisplay = venue.address_en;
  }
  if (content.practiceTools) info.practiceTools = content.practiceTools;
  return info;
}

function publicSessionStatus(status) {
  return PUBLIC_SESSION_STATUS[status] || status;
}

function isPublicSession(row) {
  return ["open", "upcoming", "limited", "full", "completed"].includes(row.status);
}

function remainingSeats(row) {
  if (row.capacity == null) return row.remaining_seats ?? null;
  if (Number(row.registered_count || 0) > 0) {
    return Math.max(0, Number(row.capacity) - Number(row.registered_count || 0));
  }
  return row.remaining_seats ?? null;
}

function sessionPublic(snap, row, programRow, locale = "vi") {
  const info = programInfo(snap, programRow, locale);
  const venue = getVenue(snap, row.venue_id) || getVenue(snap, programRow.venue_default_id);
  const format = row.format || programRow.format;
  const price = row.price_override != null ? formatPrice(row.price_override) : info.price;
  const desc = locale === "en" ? row.description_en || row.description_vi : row.description_vi;
  const remaining = remainingSeats(row);
  const location =
    format === "offline" && venue
      ? `${venue.name} · ${locale === "en" ? venue.address_en || venue.address_vi : venue.address_vi}`
      : row.online_platform || info.location;
  const item = {
    id: row.id,
    slug: row.slug,
    title: info.name,
    shortTitle: info.shortName,
    programId: row.program_id,
    type: row.type || "course",
    date: row.start_date,
    startDate: row.start_date,
    startTime: row.start_time,
    endTime: row.end_time,
    format,
    formatLabel: formatLabel(format, locale === "en" ? "en" : "vi"),
    location,
    price,
    durationLabel: info.durationLabel,
    totalDuration: info.totalDuration,
    minCapacity: info.minCapacity,
    capacity: row.capacity != null ? row.capacity : info.maxCapacity,
    classSizeLabel: info.classSizeLabel,
    remainingSeats: remaining,
    status: publicSessionStatus(row.status),
    description: desc,
    registrationUrl: registrationUrl(row),
    detailUrl: detailUrl(programRow),
  };
  if (info.scheduleLabel) item.scheduleLabel = info.scheduleLabel;
  if (info.supportLabel) item.supportLabel = info.supportLabel;
  if (info.primaryPlatform) item.primaryPlatform = info.primaryPlatform;
  if (info.practiceTools) item.practiceTools = info.practiceTools;
  if (venue && format === "offline") {
    item.venueName = venue.name;
    item.venueAddress = venue.address_vi;
    if (venue.address_en) item.venueAddressDisplay = venue.address_en;
  }
  return item;
}

function getPrograms(snap) {
  return alive(snap.programs)
    .filter((p) => p.status !== "hidden")
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || String(a.id).localeCompare(String(b.id)));
}

function getProgram(snap, slugOrId) {
  return (
    alive(snap.programs).find(
      (row) => row.id === slugOrId || row.slug_vi === slugOrId || row.slug_en === slugOrId,
    ) || null
  );
}

function getSessions(snap) {
  return alive(snap.sessions).sort(
    (a, b) => String(a.start_date).localeCompare(String(b.start_date)) || String(a.start_time).localeCompare(String(b.start_time)),
  );
}

function getSessionsByProgram(snap, programId) {
  return getSessions(snap).filter((row) => row.program_id === programId);
}

function getUpcomingSessions(snap) {
  return getSessions(snap).filter((row) => isPublicSession(row) && row.status !== "completed");
}

function getInstructors(snap) {
  return alive(snap.instructors)
    .filter((row) => Number(row.active) === 1)
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || String(a.name).localeCompare(String(b.name)))
    .map((row) => {
      const copy = { ...row };
      delete copy.email;
      return copy;
    });
}

function facultyMap(snap) {
  const map = {};
  getInstructors(snap).forEach((row) => {
    map[row.id] = {
      name: row.name,
      title: row.role || row.academic_title,
      bio: row.bio_vi,
      image: row.photo,
    };
  });
  return map;
}

function programPublic(snap, row, locale = "vi") {
  const content = parseJson(locale === "en" ? row.content_en : row.content_vi, {});
  const seo = parseJson(locale === "en" ? row.seo_en : row.seo_vi, {});
  const info = programInfo(snap, row, locale);
  const links = (snap.program_instructors || [])
    .filter((x) => x.program_id === row.id)
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    .map((x) => x.instructor_id);
  return {
    ...content,
    ...info,
    id: row.id,
    slug: locale === "en" ? row.slug_en : row.slug_vi,
    seo: Object.keys(seo).length ? seo : content.seo || {},
    instructors: links.length ? links : content.instructors || [],
    thumbnail: row.thumbnail,
    coverImage: row.cover_image,
  };
}

function scheduleDataJs(snap) {
  const programs = getPrograms(snap).filter((p) => p.status === "published");
  const info = {};
  programs.forEach((row) => {
    info[row.id] = programInfo(snap, row, "vi");
  });
  const sessions = getSessions(snap)
    .filter(isPublicSession)
    .map((row) => {
      const program = programs.find((p) => p.id === row.program_id) || getProgram(snap, row.program_id);
      return program ? sessionPublic(snap, row, program, "vi") : null;
    })
    .filter(Boolean);
  const enLabels = {};
  programs.forEach((row) => {
    enLabels[row.id] = programInfo(snap, row, "en");
  });
  const enCopy = {};
  getSessions(snap).forEach((row) => {
    if (row.description_en) enCopy[row.slug] = row.description_en;
  });
  return `window.VSC_PROGRAM_INFO = ${JSON.stringify(info)};
window.VSC_SCHEDULES = ${JSON.stringify(sessions)};
window.VSC_CMS_LABELS = ${JSON.stringify({ en: enLabels })};
window.VSC_CMS_SESSION_COPY = ${JSON.stringify({ en: enCopy })};
`;
}

function courseDataJs(snap) {
  const faculty = facultyMap(snap);
  const programs = getPrograms(snap)
    .filter((p) => p.status === "published" && p.status_vi === "published")
    .map((row) => programPublic(snap, row, "vi"));
  return `window.VSC_FACULTY = ${JSON.stringify(faculty)};\nwindow.VSC_PROGRAMS = ${JSON.stringify(programs)};\n`;
}

function courseDataEnJs(snap) {
  const en = {};
  getPrograms(snap)
    .filter((p) => p.status === "published" && p.status_en === "published")
    .forEach((row) => {
      en[row.id] = programPublic(snap, row, "en");
    });
  return `(() => {
  const programs = window.VSC_PROGRAMS || [];
  const overlay = ${JSON.stringify(en)};
  programs.forEach((program) => {
    if (overlay[program.id]) Object.assign(program, overlay[program.id]);
  });
})();\n`;
}

function articleDataJs(snap) {
  const authors = {};
  getInstructors(snap).forEach((row) => {
    authors[row.id] = {
      authorId: row.id,
      name: row.name,
      title: row.role || row.academic_title,
      bio: row.bio_vi,
    };
  });
  if (!authors["vsc-editorial"]) {
    authors["vsc-editorial"] = {
      authorId: "vsc-editorial",
      name: "VSC Academy Editorial",
      title: "Ban biên tập VSC Academy",
      bio: "Chia sẻ kiến thức, phân tích và cập nhật về AI ứng dụng.",
    };
  }
  const articles = alive(snap.insights)
    .sort((a, b) => String(b.published_at || "").localeCompare(String(a.published_at || "")))
    .filter((row) => row.status_vi === "published")
    .map((row) => ({
      id: row.id,
      slug: row.slug_vi,
      slugEn: row.slug_en,
      title: row.title_vi,
      titleEn: row.title_en || undefined,
      excerpt: row.excerpt_vi,
      excerptEn: row.excerpt_en || undefined,
      contentType: row.content_type,
      category: row.category,
      tags: parseJson(row.tags, []),
      authorId: row.author_id,
      publishedAt: row.published_at,
      updatedAt: row.updated_at,
      readingTime: row.reading_time,
      featured: !!row.featured,
      status: "published",
    }));
  const categories = parseJson(
    aliveById(snap.settings, "article_categories")?.value ||
      (snap.settings || []).find((row) => row.key === "article_categories")?.value,
    {
      "ai-ung-dung": "AI ứng dụng",
      "ai-agent": "AI Agent & Automation",
      "ai-giao-duc": "AI trong Giáo dục",
      "nang-suat": "Năng suất & Công việc",
      "goc-nhin": "Góc nhìn",
      "xu-huong": "Xu hướng AI",
      "tin-vsc": "Tin VSC Academy",
    },
  );
  return `window.VSC_AUTHORS = ${JSON.stringify(authors)};\nwindow.VSC_ARTICLES = ${JSON.stringify(articles)};\nwindow.VSC_ARTICLE_CATEGORIES = ${JSON.stringify(categories)};\n`;
}

function resourceDataJs(snap) {
  const resources = alive(snap.resources)
    .filter((row) => row.status === "published")
    .sort((a, b) => String(b.published_at || "").localeCompare(String(a.published_at || "")))
    .map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title_vi,
      titleEn: row.title_en || undefined,
      excerpt: row.description_vi,
      excerptEn: row.description_en || undefined,
      type: row.type,
      category: row.category,
      tags: parseJson(row.tags, []),
      publishedAt: row.published_at,
      updatedAt: row.updated_at,
      downloadable: row.access_type !== "private" && !!row.file_url,
      gated: row.access_type === "registration" || !!row.gated,
      featured: !!row.featured,
      status: "published",
    }));
  const labels = {
    guide: "Cẩm nang",
    framework: "Framework",
    checklist: "Checklist",
    template: "Template",
    report: "Báo cáo",
    research: "Tài liệu nghiên cứu",
    ebook: "Ebook",
    "learning-material": "Tài liệu học tập",
  };
  return `window.VSC_RESOURCES = ${JSON.stringify(resources)};\nwindow.VSC_RESOURCE_LABELS = ${JSON.stringify(labels)};\n`;
}

function getInsights(snap, locale) {
  return alive(snap.insights)
    .sort((a, b) => String(b.published_at || "").localeCompare(String(a.published_at || "")))
    .filter((row) => (locale === "en" ? row.status_en === "published" && row.title_en : row.status_vi === "published"));
}

function getResources(snap, locale) {
  return alive(snap.resources)
    .filter((row) => row.status === "published")
    .sort((a, b) => String(b.published_at || "").localeCompare(String(a.published_at || "")))
    .filter((row) => (locale === "en" ? !!row.title_en : true));
}

function bootstrap(snap) {
  return {
    programs: getPrograms(snap).filter((p) => p.status === "published").map((row) => programPublic(snap, row, "vi")),
    sessions: getUpcomingSessions(snap),
    instructors: getInstructors(snap),
  };
}

module.exports = {
  formatPrice,
  parsePrice,
  pickCopy,
  programInfo,
  sessionPublic,
  getPrograms,
  getProgram,
  getSessions,
  getSessionsByProgram,
  getUpcomingSessions,
  getInstructors,
  getInsights,
  getResources,
  programPublic,
  scheduleDataJs,
  courseDataJs,
  courseDataEnJs,
  articleDataJs,
  resourceDataJs,
  bootstrap,
  remainingSeats,
};
