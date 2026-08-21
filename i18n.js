(() => {
  const SITE = "https://vscacademy.vn";
  const PAGES = {
    home: { vi: "/", en: "/en" },
    about: { vi: "/gioi-thieu", en: "/en/about" },
    courses: { vi: "/khoa-hoc", en: "/en/courses" },
    schedule: { vi: "/lich-hoc", en: "/en/schedule" },
    resources: { vi: "/tai-lieu-chuyen-mon", en: "/en/resources" },
    insights: { vi: "/goc-chia-se", en: "/en/insights" },
    contact: { vi: "/lien-he", en: "/en/contact" },
    register: { vi: "/dang-ky", en: "/en/register" },
    verify: { vi: "/verify", en: "/en/verify" },
    privacy: { vi: "/chinh-sach-quyen-rieng-tu", en: "/en/privacy" },
    deletion: { vi: "/huong-dan-xoa-du-lieu", en: "/en/data-deletion" },
    "course-ai-starter": {
      vi: "/khoa-hoc/ai-starter",
      en: "/en/courses/ai-starter",
    },
    "course-applied-ai": {
      vi: "/khoa-hoc/ai-ung-dung-cong-viec",
      en: "/en/courses/applied-ai-for-work",
    },
    "course-agent": {
      vi: "/khoa-hoc/ai-agent-automation",
      en: "/en/courses/ai-agent-automation",
    },
    article: { vi: "/bai-viet", en: "/en/insights/article" },
    "resource-detail": { vi: "/tai-lieu", en: "/en/resources/item" },
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
    return `${spec[locale]}${extra}`;
  }
  function counterpart(target) {
    const spec = PAGES[page] || PAGES.home;
    return `${spec[target]}${location.search}${location.hash}`;
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
