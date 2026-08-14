(() => {
  const locale = window.VSC_I18N?.locale || "vi";
  const pages = window.VSC_I18N?.PAGES || {};
  const programPage = window.VSC_I18N?.programPage || {
    "ai-starter": "course-ai-starter",
    "ai-foundation": "course-applied-ai",
    "ai-agent-automation": "course-agent",
  };
  const T = window.VSC_UI?.[locale] || window.VSC_UI?.vi;
  window.VSC_T = T;

  const pathFor = (pageId, extra = "") =>
    `${(pages[pageId] || pages.home)[locale]}${extra}`;

  const PROGRAM_LABELS = {
    en: {
      "ai-starter": {
        name: "AI STARTER",
        shortName: "AI Starter",
        formatLabel: "Live online",
        durationLabel: "2 sessions × 120 minutes",
        totalDuration: "4 hours",
        classSizeLabel: "8–25 learners",
      },
      "ai-foundation": {
        name: "APPLIED AI FOR WORK",
        shortName: "Applied AI for Work",
        formatLabel: "Live online",
        durationLabel: "2 sessions × 120 minutes",
        totalDuration: "4 hours",
        classSizeLabel: "8–25 learners",
        scheduleLabel: "Tue & Thu | 19:00–21:00",
        supportLabel: "30-day video access + 14-day Zalo support",
      },
      "ai-agent-automation": {
        name: "AI AGENT & AUTOMATION",
        shortName: "AI Agent & Automation",
        formatLabel: "In person",
        classSizeLabel: "Up to 15 learners",
        practiceBadge: "BUILD A PRACTICAL AI AGENT",
        venueAddressDisplay: "21 Hoa Mai, Cau Kieu Ward, Ho Chi Minh City",
      },
    },
  };

  const SESSION_COPY = {
    en: {
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
    },
  };

  const info = window.VSC_PROGRAM_INFO || {};
  const labels =
    (window.VSC_CMS_LABELS && window.VSC_CMS_LABELS[locale]) ||
    PROGRAM_LABELS[locale] ||
    {};
  Object.keys(labels).forEach((id) => {
    if (info[id]) Object.assign(info[id], labels[id]);
  });

  (window.VSC_SCHEDULES || []).forEach((session) => {
    const program = info[session.programId];
    if (program) {
      session.title = program.name || session.title;
      session.shortTitle = program.shortName || session.shortTitle;
      if (program.formatLabel) session.formatLabel = program.formatLabel;
      if (program.durationLabel) session.durationLabel = program.durationLabel;
      if (program.totalDuration) session.totalDuration = program.totalDuration;
      if (program.classSizeLabel) session.classSizeLabel = program.classSizeLabel;
      if (program.scheduleLabel) session.scheduleLabel = program.scheduleLabel;
      if (program.supportLabel) session.supportLabel = program.supportLabel;
      if (program.venueAddressDisplay) {
        session.venueAddressDisplay = program.venueAddressDisplay;
        session.location = `${session.venueName || program.venueName} · ${program.venueAddressDisplay}`;
      }
    }
    if (session.programId === "ai-workflow-workshop" && locale === "en") {
      session.title = "AI WORKFLOW PRACTICE";
      session.shortTitle = "AI Workflow Practice";
      session.formatLabel = "Live online";
    }
    const copy =
      (window.VSC_CMS_SESSION_COPY &&
        window.VSC_CMS_SESSION_COPY[locale] &&
        window.VSC_CMS_SESSION_COPY[locale][session.slug]) ||
      SESSION_COPY[locale]?.[session.slug];
    if (copy) session.description = copy;
    session.registrationUrl = pathFor("register", `?session=${session.slug}`);
    const detailPage = programPage[session.programId];
    session.detailUrl = pathFor(detailPage || "courses");
  });

  if (locale === "en") {
    const faculty = window.VSC_FACULTY?.["tran-anh-vu"];
    if (faculty) {
      faculty.name = "TRAN ANH VU, M.Sc.";
      faculty.title = "Founder, VSC Academy · Lead Instructor";
      faculty.bio =
        "Research, teaching and applied AI for work, education and real operating contexts.";
    }
    const authors = window.VSC_AUTHORS || {};
    if (authors["tran-anh-vu"]) {
      authors["tran-anh-vu"].name = "Tran Anh Vu, M.Sc.";
      authors["tran-anh-vu"].title = "Founder, VSC Academy · Lead Instructor";
      authors["tran-anh-vu"].bio =
        "Research, teaching and applied AI for work, education and real operating contexts.";
    }
    if (authors["vsc-editorial"]) {
      authors["vsc-editorial"].title = "VSC Academy Editorial";
      authors["vsc-editorial"].bio =
        "Perspectives, analysis and updates on applied AI.";
    }
    if (window.VSC_ARTICLE_CATEGORIES) {
      Object.assign(window.VSC_ARTICLE_CATEGORIES, {
        "ai-ung-dung": "Applied AI",
        "ai-agent": "AI Agent & Automation",
        "ai-giao-duc": "AI in Education",
        "nang-suat": "Work & Productivity",
        "goc-nhin": "Perspective",
        "xu-huong": "AI Trends",
        "tin-vsc": "VSC Academy News",
      });
    }
    if (window.VSC_RESOURCE_LABELS) {
      Object.assign(window.VSC_RESOURCE_LABELS, {
        guide: "Guide",
        framework: "Framework",
        checklist: "Checklist",
        template: "Template",
        report: "Report",
        research: "Research",
        ebook: "Ebook",
        "learning-material": "Learning material",
      });
    }
    (window.VSC_ARTICLES || []).forEach((article) => {
      if (article.titleEn) {
        article.titleVi = article.titleVi || article.title;
        article.excerptVi = article.excerptVi || article.excerpt;
        article.title = article.titleEn;
        article.excerpt = article.excerptEn || article.excerpt;
      }
    });
    (window.VSC_RESOURCES || []).forEach((resource) => {
      if (resource.titleEn) {
        resource.titleVi = resource.titleVi || resource.title;
        resource.excerptVi = resource.excerptVi || resource.excerpt;
        resource.title = resource.titleEn;
        resource.excerpt = resource.excerptEn || resource.excerpt;
      }
    });
  }
})();
