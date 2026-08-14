(() => {
  const SITE = "https://vscacademy.vn";
  const PAGES = {
    home: { vi: "index.html", en: "en/index.html" },
    about: { vi: "gioi-thieu.html", en: "en/about/index.html" },
    courses: { vi: "khoa-hoc/index.html", en: "en/courses/index.html" },
    schedule: { vi: "lich-hoc.html", en: "en/schedule/index.html" },
    resources: { vi: "tai-lieu-chuyen-mon.html", en: "en/resources/index.html" },
    insights: { vi: "goc-chia-se.html", en: "en/insights/index.html" },
    contact: { vi: "lien-he.html", en: "en/contact/index.html" },
    register: { vi: "dang-ky.html", en: "en/register/index.html" },
    "course-ai-starter": {
      vi: "khoa-hoc/ai-starter/index.html",
      en: "en/courses/ai-starter/index.html",
    },
    "course-applied-ai": {
      vi: "khoa-hoc/ai-ung-dung-cong-viec/index.html",
      en: "en/courses/applied-ai-for-work/index.html",
    },
    "course-agent": {
      vi: "khoa-hoc/ai-agent-automation/index.html",
      en: "en/courses/ai-agent-automation/index.html",
    },
    article: { vi: "bai-viet.html", en: "en/insights/article.html" },
    "resource-detail": { vi: "tai-lieu.html", en: "en/resources/item.html" },
  };
  const PROGRAM_PAGE = {
    "ai-starter": "course-ai-starter",
    "ai-foundation": "course-applied-ai",
    "ai-agent-automation": "course-agent",
  };
  const locale =
    document.documentElement.lang === "en" ||
    document.body?.dataset.locale === "en"
      ? "en"
      : "vi";
  const root = document.body?.dataset.root || "";
  const page = document.body?.dataset.page || "home";

  function href(pageId, extra = "") {
    const spec = PAGES[pageId] || PAGES.home;
    return `${root}${spec[locale]}${extra}`;
  }
  function counterpart(target) {
    const spec = PAGES[page] || PAGES.home;
    const path = `${root}${spec[target]}${location.search}${location.hash}`;
    return path;
  }
  function programHref(programId, extra = "") {
    return href(PROGRAM_PAGE[programId] || "home", extra);
  }

  window.VSC_I18N = {
    SITE,
    PAGES,
    locale,
    root,
    page,
    href,
    counterpart,
    programHref,
    programPage: PROGRAM_PAGE,
  };

  const selects = document.querySelectorAll(".language-select");
  selects.forEach((select) => {
    select.value = locale;
    select.addEventListener("change", (event) => {
      const language = event.target.value;
      localStorage.setItem("vsc-language", language);
      if (language === locale) return;
      location.href = counterpart(language);
    });
  });
  localStorage.setItem("vsc-language", locale);
})();
