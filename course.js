(() => {
  const programs = window.VSC_PROGRAMS || [],
    sessions = window.VSC_SCHEDULES || [],
    faculty = window.VSC_FACULTY || {};
  const I = window.VSC_I18N || {};
  const T = window.VSC_T || window.VSC_UI?.vi || {};
  const root = I.root || document.body?.dataset.root || "../../";
  const registerPath = (extra = "") =>
    I.href ? I.href("register", extra) : `${root}dang-ky.html${extra}`;
  const schedulePath = (extra = "") =>
    I.href ? I.href("schedule", extra) : `${root}lich-hoc.html${extra}`;
  const SLUG_ALIAS = { "applied-ai-for-work": "ai-ung-dung-cong-viec" };
  const pathParts = location.pathname.split("/").filter(Boolean);
  let slug = pathParts.pop()?.replace(/\.html$/, "");
  if (slug === "index") slug = pathParts.pop();
  if (slug === "khoa-hoc" || slug === "courses")
    slug = new URLSearchParams(location.search).get("course");
  if (SLUG_ALIAS[slug]) slug = SLUG_ALIAS[slug];
  const p =
      programs.find((x) => x.slug === slug || x.id === slug) || programs[0],
    chrome = p.pageChrome || {},
    ps = sessions
      .filter((x) => x.programId === p.id)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  const open = ps.filter((x) =>
      ["open", "limited", "upcoming"].includes(x.status),
    ),
    nearest = open[0] || ps[0],
    $ = (s) => document.querySelector(s),
    fmt = (d) =>
      new Intl.DateTimeFormat(T.dateLocale || "vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(d));
  const venueAddress = (item) =>
    item?.venueAddressDisplay || item?.venueAddress || "";
  document.title = p.seo.title;
  document.querySelector('meta[name="description"]').content =
    p.seo.description;
  document.body.dataset.program = p.id;

  const setText = (sel, value, html = false) => {
    const el = document.querySelector(sel);
    if (!el || !value) return;
    if (html) el.innerHTML = value;
    else el.textContent = value;
  };
  if (chrome.audienceEyebrow) setText(".audience-section .course-heading .eyebrow", `<span></span> ${chrome.audienceEyebrow}`, true);
  if (p.id === "ai-starter" && chrome.audienceTitle) setText(".audience-section .course-heading h2", chrome.audienceTitle, true);
  if (chrome.outcomeEyebrow) setText(".learning-outcomes-section .course-heading .eyebrow", `<span></span> ${chrome.outcomeEyebrow}`, true);
  if (p.id === "ai-starter" && chrome.outcomeTitle) setText(".learning-outcomes-section .course-heading h2", chrome.outcomeTitle, true);
  if (chrome.curriculumEyebrow) setText(".curriculum-section .course-heading .eyebrow", `<span></span> ${chrome.curriculumEyebrow}`, true);
  if (p.id === "ai-starter" && chrome.curriculumTitle) setText(".curriculum-section .course-heading h2", chrome.curriculumTitle, true);
  if (p.id === "ai-starter" && chrome.curriculumIntro) setText(".curriculum-intro small", chrome.curriculumIntro);
  if (chrome.outputEyebrow) setText(".featured-output-copy .eyebrow", `<span></span> ${chrome.outputEyebrow}`, true);
  if (p.id === "ai-starter" && chrome.outputTitle) setText(".featured-output-copy h2", chrome.outputTitle, true);
  if (p.id === "ai-starter" && chrome.outputDescription) setText(".featured-output-description", chrome.outputDescription);
  if (p.id === "ai-starter" && chrome.outputClosing) setText(".featured-output-closing", chrome.outputClosing);
  if (p.id === "ai-starter" && chrome.blueprintLabel) {
    const head = document.querySelector(".blueprint-head div");
    if (head) head.innerHTML = `<small>${chrome.blueprintLabel}</small><h3>${chrome.blueprintTitle || ""}</h3>`;
  }
  if (p.id === "ai-starter" && chrome.blueprintResult) {
    const result = document.querySelector(".blueprint-result strong");
    if (result) result.textContent = chrome.blueprintResult;
  }
  if (chrome.methodEyebrow) setText(".method-heading .eyebrow", `<span></span> ${chrome.methodEyebrow}`, true);
  if (p.id === "ai-starter" && chrome.methodTitle) setText(".method-heading h2", chrome.methodTitle);
  if (p.id === "ai-starter" && chrome.methodDescription) setText(".method-heading > p:last-child", chrome.methodDescription);
  if (chrome.scheduleEyebrow) setText(".schedule-heading .eyebrow", `<span></span> ${chrome.scheduleEyebrow}`, true);
  if (p.id === "ai-starter" && chrome.scheduleTitle) setText(".schedule-heading h2", chrome.scheduleTitle);
  if (p.id === "ai-starter" && chrome.scheduleIntro) setText(".schedule-intro", chrome.scheduleIntro);
  if (chrome.scheduleLink) setText(".schedule-all-link", chrome.scheduleLink);
  if (chrome.faqEyebrow) setText(".faq-intro-course .eyebrow", `<span></span> ${chrome.faqEyebrow}`, true);
  if (p.id === "ai-starter" && chrome.faqTitle) setText(".faq-intro-course h2", chrome.faqTitle, true);
  if (p.id === "ai-starter" && chrome.faqIntro) setText(".faq-intro-course > p:not(.eyebrow)", chrome.faqIntro);
  if (chrome.faqContact) setText(".faq-intro-course a", chrome.faqContact);
  if (chrome.finalEyebrow) setText(".course-final .eyebrow", `<span></span> ${chrome.finalEyebrow}`, true);
  if (p.id === "ai-starter" && chrome.finalTitle) setText(".course-final h2", chrome.finalTitle, true);
  if (p.id === "ai-starter" && chrome.finalDescription) setText(".final-description", chrome.finalDescription);
  if (chrome.instructorEyebrow) setText(".faculty-intro .eyebrow", `<span></span> ${chrome.instructorEyebrow}`, true);

  // The three course pages share one premium page structure. Course-specific
  // copy below is derived from the selected program instead of the HTML shell.
  if (p.id !== "ai-starter") {
    const audienceTitle = document.querySelector(".audience-section .course-heading h2");
    if (audienceTitle) {
      audienceTitle.innerHTML =
        chrome.audienceTitle ||
        (p.id === "ai-foundation"
          ? "ĐÂY LÀ NHỮNG TÌNH HUỐNG<br>BẠN CÓ THỂ ĐANG GẶP"
          : `${p.shortName}<br>PHÙ HỢP VỚI BẠN NẾU...`);
    }

    const outcomeTitle = document.querySelector(".learning-outcomes-section .course-heading h2");
    if (outcomeTitle && (chrome.outcomeTitle || p.id === "ai-foundation")) {
      outcomeTitle.innerHTML = chrome.outcomeTitle || "HỌC XONG, BẠN LÀM ĐƯỢC GÌ?";
    }

    const curriculumTitle = document.querySelector(".curriculum-section .course-heading h2");
    if (curriculumTitle && (chrome.curriculumTitle || p.id === "ai-foundation" || p.id === "ai-agent-automation")) {
      curriculumTitle.innerHTML =
        chrome.curriculumTitle ||
        (p.id === "ai-foundation"
          ? "MỘT LỘ TRÌNH ĐƯỢC XÂY<br>THEO NĂNG LỰC"
          : "TỪ BÀI TOÁN CÔNG VIỆC<br>ĐẾN MỘT AI AGENT CÓ THỂ VẬN&nbsp;HÀNH");
    }

    const curriculumIntro = document.querySelector(".curriculum-intro small");
    if (curriculumIntro) {
      curriculumIntro.textContent =
        chrome.curriculumIntro ||
        `${String(p.curriculum.length).padStart(2, "0")} GIAI ĐOẠN HỌC TẬP`;
    }
    const curriculumProgress = document.querySelector(".curriculum-progress");
    if (curriculumProgress) curriculumProgress.innerHTML = p.curriculum
      .map((item, index) => `${index ? "<i>→</i>" : ""}<span data-step="${index}">${item.progressLabel || item.title}</span>`)
      .join("");

    const outputCopy = document.querySelector(".featured-output-copy");
    if (outputCopy) {
      outputCopy.querySelector("h2").innerHTML =
        chrome.outputTitle ||
        `KHÔNG CHỈ HỌC<br>BẠN XÂY DỰNG MỘT ĐẦU RA CÓ THỂ TIẾP TỤC SỬ DỤNG`;
      outputCopy.querySelector(".featured-output-description").textContent =
        chrome.outputDescription || p.outputDescription || p.description;
      const outputClosingEl = outputCopy.querySelector(".featured-output-closing");
      if (outputClosingEl) {
        outputClosingEl.textContent =
          chrome.outputClosing ||
          "Đầu ra được phát triển từ chính bối cảnh và bài toán thực tế của người học.";
      }
    }
    const blueprintHead = document.querySelector(".blueprint-head div");
    if (blueprintHead) blueprintHead.innerHTML = `<small>OUTPUT CANVAS · ${p.shortName}</small><h3>${p.outputs[0]}</h3>`;
    const blueprintFlow = document.querySelector(".blueprint-flow");
    if (blueprintFlow) blueprintFlow.innerHTML = `<div class="blueprint-line"></div>${p.curriculum.slice(0, 5).map((item, index) => `<div class="blueprint-node"><b>${String(index + 1).padStart(2, "0")}</b><span>${item.progressLabel || item.title}</span></div>`).join("")}`;
    const blueprintResult = document.querySelector(".blueprint-result strong");
    if (blueprintResult) blueprintResult.textContent = p.outputs[0];

    if (p.id === "ai-agent-automation") {
      if (outputCopy) {
        outputCopy.querySelector("h2").innerHTML =
          chrome.outputTitle ||
          "KHÔNG CHỈ HỌC<br><span>BẠN XÂY MỘT AI AGENT</span><br><span>CHO CHÍNH CÔNG VIỆC CỦA MÌNH</span>";
        outputCopy.querySelector(".featured-output-description").textContent =
          chrome.outputDescription ||
          "Trong chương trình, bạn trực tiếp xây và cá nhân hóa một AI Agent trên Hermes, dựa trên một bài toán và bối cảnh công việc thực tế của mình.";
        outputCopy.querySelector(".featured-output-closing").textContent =
          chrome.outputClosing ||
          "Agent có thể tiếp tục được kiểm thử, điều chỉnh và phát triển sau chương trình.";
      }
      if (blueprintHead) {
        blueprintHead.innerHTML = `<small>${chrome.blueprintLabel || "OUTPUT CANVAS · AI AGENT &amp; AUTOMATION"}</small><h3>${chrome.blueprintTitle || "AI AGENT CÁ NHÂN HÓA"}</h3>`;
      }
      if (blueprintFlow) {
        blueprintFlow.innerHTML = `<div class="blueprint-line"></div>${p.curriculum.slice(0, 5).map((item, index) => {
          const focus = index === 2;
          return `<div class="blueprint-node${focus ? " is-focus" : ""}">${focus ? "<small>HERMES</small>" : ""}<b>${String(index + 1).padStart(2, "0")}</b><span>${item.progressLabel || item.title}</span></div>`;
        }).join("")}`;
      }
      const resultBox = document.querySelector(".blueprint-result");
      if (resultBox) {
        resultBox.innerHTML = `<i aria-hidden="true"></i><div><strong>${chrome.blueprintResultTitle || "AI AGENT CÁ NHÂN HÓA"}</strong><span>${chrome.blueprintResultNote || "Workflow cho một nhóm nhiệm vụ cụ thể"}</span></div><i aria-hidden="true"></i>`;
      }
      document.querySelector(".output-blueprint")?.setAttribute("aria-label", "Quy trình xây Hermes AI Agent cá nhân hóa");
    }

    if (p.id === "ai-foundation") {
      const outputLayout = document.querySelector(".featured-output-layout");
      outputLayout?.classList.add("foundation-output-layout");
      if (outputCopy) {
        outputCopy.querySelector("h2").innerHTML =
          chrome.outputTitle ||
          "RỜI KHÓA HỌC VỚI<br>ĐẦU RA CÓ THỂ<br>TIẾP TỤC SỬ DỤNG";
        outputCopy.querySelector(".featured-output-description").textContent =
          chrome.outputDescription ||
          "Không chỉ hiểu cách dùng AI, bạn trực tiếp xây và thử nghiệm những đầu ra gắn với chính công việc của mình.";
        outputCopy.querySelector(".featured-output-closing").remove();
      }
      const blueprint = document.querySelector(".output-blueprint");
      if (blueprint) blueprint.outerHTML = `<div class="foundation-output-cards">${p.outputs.map((item,index)=>`<article class="${index===0?"is-primary":""}"><span><small>OUTPUT</small> 0${index+1}</span><div class="foundation-output-copy"><h3>${item.title}</h3><p>${item.description}</p></div></article>`).join("")}</div>`;
    }

    if (p.method) {
      const methodHeading = document.querySelector(".method-heading");
      methodHeading.querySelector("h2").textContent = p.method.headline;
      methodHeading.querySelector(":scope > p:last-child").textContent = p.method.description;
      const methodGraphic = document.querySelector(".method-infographic-v2");
      const focusLabel = I.locale === "en" ? " · FOCUS" : " · TRỌNG TÂM";
      methodGraphic.innerHTML = `<div class="method-flow-track" aria-hidden="true"><i></i></div>${p.method.items.map((item,index)=>`<article tabindex="0"><header><span>0${index+1}${index===2?focusLabel:""}</span><b>${item[0]}</b></header><div class="method-node"><i></i></div><h3>${item[1]}</h3><p>${item[2]}</p></article>`).join("")}`;
    }

    const scheduleIntro = document.querySelector(".schedule-intro");
    if (scheduleIntro) {
      scheduleIntro.textContent =
        chrome.scheduleIntro ||
        `Các lớp ${p.shortName} sắp khai giảng được cập nhật trực tiếp từ hệ thống lịch học của VSC Academy.`;
    }
    const scheduleTitle = document.querySelector(".schedule-heading h2");
    if (scheduleTitle && (chrome.scheduleTitle || p.id === "ai-foundation")) {
      scheduleTitle.textContent = chrome.scheduleTitle || "CHỌN LỚP PHÙ HỢP VỚI BẠN";
    }
    const scheduleLink = document.querySelector(".schedule-all-link");
    if (scheduleLink) scheduleLink.href = schedulePath(`?program=${p.id}`);

    const faqIntro = document.querySelector(".faq-intro-course > p:not(.eyebrow)");
    if (faqIntro) {
      faqIntro.textContent =
        chrome.faqIntro ||
        (p.id === "ai-agent-automation"
          ? "Một vài điều cần biết trước khi bạn bắt đầu xây workflow, automation và AI Agent cho công việc của mình."
          : `Một vài thông tin cần biết trước khi bạn quyết định bắt đầu với ${p.shortName}.`);
    }
    const faqTitle = document.querySelector(".faq-intro-course h2");
    if (faqTitle && chrome.faqTitle) faqTitle.innerHTML = chrome.faqTitle;
    else if (faqTitle) {
      if (p.id === "ai-foundation") faqTitle.innerHTML = "CÂU HỎI VỀ<br>CHƯƠNG TRÌNH";
      else if (p.id === "ai-agent-automation") faqTitle.innerHTML = "TRƯỚC KHI BẠN<br>BẮT ĐẦU XÂY<br>AI&nbsp;AGENT";
    }

    const final = document.querySelector(".course-final");
    if (final) {
      final.classList.remove("ai-starter-final");
      if (p.id === "ai-foundation") final.classList.add("foundation-final");
      if (p.id === "ai-agent-automation") final.classList.add("agent-final");
      final.querySelector("h2").innerHTML = p.final?.headline || `BẮT ĐẦU XÂY NĂNG LỰC AI<br>CÙNG ${p.shortName}`;
      final.querySelector(".final-description").textContent = p.final?.description || p.description;
      final.querySelector(".button-outline-light").href = schedulePath(`?program=${p.id}`);
    }
  }
  $("#courseLevel").textContent =
    `${p.level}${p.subtitle ? ` · ${p.subtitle}` : ""}`;
  const courseMeta = $("#courseMeta");
  if (courseMeta) {
    courseMeta.innerHTML = (p.heroMeta || [p.level, nearest?.format === "online" ? "Online" : "Offline"])
      .filter(Boolean)
      .map((x) => typeof x === "object" ? `<span class="${x.featured ? "is-featured" : ""}">${x.label}</span>` : `<span>${x}</span>`)
      .join("");
  }
  $("#courseName").innerHTML = (p.heroHeadline || p.name).replace(
    /\n/g,
    "<br>",
  );
  $("#courseTagline").textContent = p.tagline;
  $("#courseDescription").textContent = p.description;
  $("#heroOutcomes").innerHTML = p.heroOutcomes
    .map((x, i) => `<li class="${i === p.heroOutcomeHighlight ? "is-highlighted" : ""}">${x}</li>`)
    .join("");
  const courseMicroNote = $("#courseMicroNote");
  if (courseMicroNote) courseMicroNote.textContent = p.heroNote || "";
  const sessionButton = (s) =>
    s.status === "full"
      ? (T.waitlist || "Tham gia danh sách chờ").toUpperCase()
      : s.status === "upcoming"
        ? (T.notify || "Nhận thông báo").toUpperCase()
        : (T.register || "Đăng ký").toUpperCase();
  function summary(s) {
    if (!s && !p.infoCard && !p.courseSummary) {
      $("#enrollmentPanel").innerHTML =
        `<p>${T.noSchedule || "Chưa có lịch khai giảng. Vui lòng theo dõi lịch học mới."}</p>`;
      return;
    }
    if (p.infoCard) {
      const registerHref = s?.registrationUrl ? `${root}${s.registrationUrl}` : registerPath(`?program=${p.slug}`);
      const rows = [
        [(T.format || "Hình thức").toUpperCase(), p.formatLabel],
        [(T.duration || "Thời lượng").toUpperCase(), p.durationLabel ? `${p.durationLabel}${p.totalDuration ? ` · ${T.total || "Tổng"} ${p.totalDuration}` : ""}` : ""],
        [(T.schedule || "Lịch chính").toUpperCase(), p.scheduleLabel],
        [(T.venue || "Địa điểm").toUpperCase(), p.venueName ? `<strong>${p.venueName}</strong>${venueAddress(p) ? `<span class="venue-address">${venueAddress(p)}</span>` : ""}` : p.location],
        [(T.tuition || "Học phí").toUpperCase(), p.price, "summary-price"],
        [(T.classSize || "Quy mô lớp").toUpperCase(), p.classSizeLabel],
        [(T.support || "Hỗ trợ").toUpperCase(), p.supportLabel]
      ].filter(([, value]) => value);
      $("#enrollmentPanel").classList.add("course-summary-card", "program-info-card");
      if (p.id === "ai-foundation") $("#enrollmentPanel").classList.add("foundation-info-card");
      $("#enrollmentPanel").innerHTML = `<header><small>${(T.courseInfo || "Thông tin khóa học").toUpperCase()}</small><h2>${p.name}</h2>${p.infoLabel ? `<p class="summary-label">${p.infoLabel}</p>` : ""}</header><dl>${rows.map(([label,value,className])=>`<div><dt>${label}</dt><dd${className?` class="${className}"`:""}>${value}</dd></div>`).join("")}</dl><a class="button" href="${registerHref}">${(T.registerCourse || "Đăng ký khóa học").toUpperCase()} →</a><a class="panel-link" href="${schedulePath(`?program=${p.id}`)}">${(T.viewSchedule || "Xem lịch khai giảng").toUpperCase()} →</a>`;
      return;
    }
    if (p.courseSummary) {
      const formatLabel = p.formatLabel || s.formatLabel || (s.format === "online" ? "Online trực tiếp" : "Offline");
      const durationLabel = p.durationLabel || s.durationLabel;
      const totalDuration = p.totalDuration || s.totalDuration;
      const location = p.location || s.location;
      const price = p.price || s.price;
      const classSize = p.classSizeLabel || s.classSizeLabel || `${p.minCapacity || s.minCapacity}–${p.maxCapacity || s.capacity} ${T.learners || "học viên"}`;
      $("#enrollmentPanel").classList.add("course-summary-card");
      $("#enrollmentPanel").setAttribute("aria-label", `${p.shortName}`);
      $("#enrollmentPanel").innerHTML =
        `<header><h2>${p.shortName}</h2><p class="summary-label">${p.courseSummary.label}</p></header><dl><div><dt>${(T.format || "Hình thức").toUpperCase()}</dt><dd>${formatLabel}</dd></div><div><dt>${(T.duration || "Thời lượng").toUpperCase()}</dt><dd>${durationLabel} <span>· ${T.total || "Tổng"} ${String(totalDuration).replace(/^4\b/, "04")}</span></dd></div>${location ? `<div><dt>${(T.platform || "Nền tảng").toUpperCase()}</dt><dd>${location}</dd></div>` : ""}<div><dt>${(T.tuition || "Học phí").toUpperCase()}</dt><dd class="summary-price">${price}</dd></div><div><dt>${(T.classSize || "Quy mô lớp").toUpperCase()}</dt><dd>${classSize}</dd></div></dl><p class="summary-note">${p.courseSummary.note}</p><a class="button" href="${root}${s.registrationUrl}">${(T.registerNow || "Đăng ký ngay").toUpperCase()} →</a><a class="panel-link" href="${schedulePath(`?program=${p.id}`)}">${(T.viewSchedule || "Xem lịch khai giảng").toUpperCase()} →</a>`;
      return;
    }
    $("#enrollmentPanel").innerHTML =
      `<small>${(T.nearestClass || "Lớp gần nhất").toUpperCase()}</small><h2>${p.shortName}</h2><strong>${fmt(s.date)}</strong><dl><div><dt>${(T.time || "Thời gian").toUpperCase()}</dt><dd>${s.startTime} – ${s.endTime}</dd></div><div><dt>${(T.format || "Hình thức").toUpperCase()}</dt><dd>${s.formatLabel || (s.format === "online" ? T.online : T.offline)}</dd></div>${s.durationLabel ? `<div><dt>${(T.duration || "Thời lượng").toUpperCase()}</dt><dd>${s.durationLabel} · ${s.totalDuration}</dd></div>` : ""}<div><dt>${(T.venue || "Địa điểm").toUpperCase()}</dt><dd>${s.location}</dd></div><div><dt>${(T.tuition || "Học phí").toUpperCase()}</dt><dd>${s.price}</dd></div><div class="seat-row"><dt>${(T.seats || "Sĩ số").toUpperCase()}</dt><dd>${s.classSizeLabel || `${s.remainingSeats} / ${s.capacity} ${T.remaining || "chỗ còn lại"}`}</dd></div></dl><a class="button" href="${root}${s.registrationUrl}">${sessionButton(s)} →</a><a class="panel-link" href="${schedulePath(`?event=${s.slug}`)}">${(T.viewAllSchedule || "Xem toàn bộ lịch").toUpperCase()} →</a>`;
  }
  summary(nearest);
  $("#audienceGrid").innerHTML = p.audience
    .map((x, i) => {
      const item = typeof x === "string" ? { title: x } : x;
      return `<article><span>${String(i + 1).padStart(2, "0")}</span><div><h3>${item.title}</h3>${item.description ? `<p>${item.description}</p>` : ""}</div></article>`;
    })
    .join("");
  document.querySelector(".audience-closing")?.remove();
  if (p.audienceClosing) {
    $("#audienceGrid").insertAdjacentHTML("afterend", `<div class="audience-closing"><small>${p.audienceClosing.label}</small><p>${p.audienceClosing.lead}<strong>${p.audienceClosing.highlight}</strong>${p.audienceClosing.tail || ""}</p></div>`);
  }
  const outcomeHeading = document.querySelector(".learning-outcomes-section .course-heading");
  if (outcomeHeading && p.outcomeProgress) {
    outcomeHeading.insertAdjacentHTML(
      "afterend",
      `<div class="outcome-progress" aria-label="Lộ trình năng lực">${p.outcomeProgress
        .map((step, index) => `${index ? '<i aria-hidden="true">→</i>' : ""}<span>${step}</span>`)
        .join("")}</div>`,
    );
  }
  $("#outcomeGrid").innerHTML = p.outcomes
    .map((x, i) => {
      const item = typeof x === "string" ? { title: x } : x;
      const featured = Boolean(item.featured);
      return `<article${featured ? ' class="is-core"' : ""}><b>${String(i + 1).padStart(2, "0")}</b><div>${item.label ? `<small class="outcome-core-label">${item.label}</small>` : ""}<h3>${item.title}</h3>${item.description ? `<p>${item.description}</p>` : ""}</div></article>`;
    })
    .join("");
  const outcomeClosing = $("#outcomeClosing");
  if (outcomeClosing) {
    outcomeClosing.innerHTML = p.outcomeClosing
      ? `<small>${p.outcomeClosing.label}</small><p>${p.outcomeClosing.lead}<strong>${p.outcomeClosing.highlight}</strong></p>`
      : "";
    outcomeClosing.hidden = !p.outcomeClosing;
  }
  const curriculumDuration = p.id === "ai-agent-automation" ? 240 : 340;
  $("#curriculum").innerHTML = p.curriculum
    .map((x, i) => {
      const featured = Boolean(x.featured);
      const open = i === 0;
      const label = x.label ? `<small class="curriculum-core-label">${x.label}</small>` : "";
      const detail = p.id === "ai-foundation"
        ? `<div class="curriculum-detail capability-detail"><div><small>${(T.goal || "Mục tiêu").toUpperCase()}</small><p>${x.goal}</p></div><div><small>${(T.practice || "Thực hành").toUpperCase()}</small><p>${x.content}</p></div><div class="capability-result"><small>${(T.result || "Kết quả").toUpperCase()}</small><b>${x.output}</b></div></div>`
        : `<div class="curriculum-detail"><p>${x.content}</p><small>${p.curriculumOutcomeLabel || "OUTPUT"}</small><b>${x.output}</b></div>`;
      return `<details data-step="${i}"${featured ? ' class="is-core"' : ""}${open ? " open" : ""}><summary><span>${String(i + 1).padStart(2, "0")}</span><strong>${x.title}${label}</strong><em>${x.goal}</em><i aria-hidden="true">${open ? "–" : "+"}</i></summary>${detail}</details>`;
    })
    .join("");
  const curriculumItems = [...document.querySelectorAll("#curriculum details")];
  const setCurriculumProgress = (index) => {
    document.querySelectorAll(".curriculum-progress span").forEach((step, stepIndex) => {
      step.classList.toggle("is-active", stepIndex === index);
      step.classList.toggle("is-complete", stepIndex < index);
    });
  };
  setCurriculumProgress(0);
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const setCurriculumIcon = (item, expanded) => {
    const icon = item.querySelector("summary i");
    if (icon) icon.textContent = expanded ? "–" : "+";
  };
  const animateCurriculum = (item, expand) => {
    const interruptedHeight = item.getBoundingClientRect().height;
    item._curriculumAnimation?.cancel();
    const startHeight = interruptedHeight;
    if (expand) item.open = true;
    const endHeight = expand
      ? item.scrollHeight
      : item.querySelector("summary").getBoundingClientRect().height;
    setCurriculumIcon(item, expand);
    if (prefersReducedMotion) {
      item.open = expand;
      return;
    }
    item.classList.add("is-animating");
    item.style.height = `${startHeight}px`;
    item._curriculumAnimation = item.animate(
      [{ height: `${startHeight}px` }, { height: `${endHeight}px` }],
      { duration: curriculumDuration, easing: "cubic-bezier(.22, 1, .36, 1)" },
    );
    item._curriculumAnimation.onfinish = () => {
      item.open = expand;
      item.style.height = "";
      item.classList.remove("is-animating");
      item._curriculumAnimation = null;
    };
    item._curriculumAnimation.oncancel = () => {
      item.style.height = "";
      item.classList.remove("is-animating");
    };
  };
  curriculumItems.forEach((item) => {
    item.querySelector("summary").addEventListener("click", (event) => {
      event.preventDefault();
      const shouldExpand = !item.open;
      if (shouldExpand) {
        setCurriculumProgress(Number(item.dataset.step));
        curriculumItems.forEach((other) => {
          if (other !== item && other.open) animateCurriculum(other, false);
        });
      }
      animateCurriculum(item, shouldExpand);
    });
  });
  const outputGrid = $("#outputGrid");
  if (outputGrid) {
    outputGrid.innerHTML = p.outputs
      .map(
        (x, i) =>
          `<article><span>0${i + 1}</span><h3>${x}</h3>${p.outputDescription ? `<p>${p.outputDescription}</p>` : ""}</article>`,
      )
      .join("");
  }
  const instructors = $("#instructors");
  if (instructors) {
    instructors.innerHTML = p.instructors
      .map((id) => {
        const f = faculty[id];
        return `<article><img src="${root}${f.image}" alt="${f.name}"><div><small>${(T.leadInstructor || "Giảng viên dẫn dắt").toUpperCase()}</small><h3>${f.name}</h3><b>${f.title}</b><p>${f.bio}</p></div></article>`;
      })
      .join("");
  }
  const statusMeta = {
    open: { label: T.statusBanner?.open || "ĐANG MỞ ĐĂNG KÝ", cta: (T.register || "Đăng ký").toUpperCase() },
    upcoming: { label: T.statusBanner?.upcoming || "SẮP MỞ", cta: (T.notify || "Nhận thông báo").toUpperCase() },
    limited: { label: T.statusBanner?.limited || "SẮP HẾT CHỖ", cta: (T.register || "Đăng ký").toUpperCase() },
    full: { label: T.statusBanner?.full || "ĐÃ ĐẦY", cta: (T.waitlist || "Danh sách chờ").toUpperCase() },
    ended: { label: T.statusBanner?.ended || "ĐÃ KẾT THÚC", cta: "" },
  };
  const activeSessions = ps.filter((s) => s.status !== "ended");
  const displayedSessions = (activeSessions.length ? activeSessions : ps.slice(-3)).slice(0, 3);
  $("#sessionList").innerHTML = displayedSessions.length
    ? displayedSessions
        .map((s) => {
          const sessionDate = s.startDate || s.date;
          const [year, month, day] = sessionDate.split("-");
          const meta = statusMeta[s.status] || statusMeta.open;
          const courseTitle = I.locale === "en" ? `${s.title} — ${month}/${year}` : `${s.title} — KHÓA ${month}/${year}`;
          const scheduleText = (s.scheduleLabel || `${s.startTime} – ${s.endTime}`).replace(" | ", " · ");
          const monthLabel = T.monthShort ? T.monthShort[Number(month) - 1] : `THG ${month}`;
          const cta = meta.cta && s.registrationUrl
            ? `<a class="session-cta" href="${root}${s.registrationUrl}">${meta.cta} →</a>`
            : "";
          return `<article class="session-row status-${s.status}"><time datetime="${sessionDate}"><b>${day}</b><span>${monthLabel}</span><small>${year}</small></time><div class="session-info"><h3>${courseTitle}</h3><strong>${scheduleText}</strong><p>${s.formatLabel || (s.format === "online" ? (T.liveOnline || "Online trực tiếp") : T.offline)} · ${s.location}${p.id === "ai-foundation" ? ` · ${s.price}` : ""}</p></div><div class="session-action"><span class="session-status"><i></i>${meta.label}</span>${cta}</div></article>`;
        })
        .join("")
    : `<p>${T.noSchedule || "Chưa có lịch học được công bố."}</p>`;
  $("#faqList").innerHTML = p.faq
    .map(
      (x, i) =>
        `<details ${i === 0 ? "open" : ""}><summary><span>${String(i + 1).padStart(2, "0")}</span><strong>${x.q}</strong><i>${i === 0 ? "−" : "+"}</i></summary><div class="faq-answer"><p>${x.a}</p></div></details>`,
    )
    .join("");
  const faqItems = [...document.querySelectorAll(".faq-course-list details")];
  const animateFaq = (item, expand) => {
    if (item.classList.contains("is-animating")) return;
    const summary = item.querySelector("summary");
    const toggle = summary.querySelector("i");
    const startHeight = item.offsetHeight;
    if (expand) item.open = true;
    const endHeight = expand ? summary.offsetHeight + item.querySelector(".faq-answer").offsetHeight : summary.offsetHeight;
    item.classList.add("is-animating");
    item.style.height = `${startHeight}px`;
    requestAnimationFrame(() => {
      item.style.height = `${endHeight}px`;
      item.classList.toggle("is-open", expand);
      toggle.textContent = expand ? "−" : "+";
    });
    const finish = (event) => {
      if (event.propertyName !== "height") return;
      if (!expand) item.open = false;
      item.style.height = "";
      item.classList.remove("is-animating");
      item.removeEventListener("transitionend", finish);
    };
    item.addEventListener("transitionend", finish);
  };
  faqItems.forEach((item, index) => {
    item.classList.toggle("is-open", index === 0);
    item.querySelector("summary").addEventListener("click", (event) => {
      event.preventDefault();
      const expand = !item.open;
      if (expand) faqItems.forEach((other) => {
        if (other !== item && other.open) animateFaq(other, false);
      });
      animateFaq(item, expand);
    });
  });
  const finalCourse = $("#finalCourse");
  const finalSession = $("#finalSession");
  if (finalCourse) finalCourse.textContent = p.name;
  if (finalSession) finalSession.textContent = nearest
    ? `${T.nearestClass || "Lớp gần nhất"} · ${fmt(nearest.date)} · ${nearest.startTime}`
    : (I.locale === "en" ? "New dates will be published soon" : "Lịch mới đang được cập nhật");
  const primaryHref =
    p.ctaHref ||
    (nearest ? `${root}${nearest.registrationUrl}` : p.id === "ai-foundation" ? registerPath(`?program=${p.slug}`) : schedulePath());
  $("#finalRegister").href = primaryHref;
  $("#finalRegister").textContent = p.final?.cta
    ? `${p.final.cta} →`
    : p.id === "ai-starter"
      ? (I.locale === "en" ? "REGISTER FOR AI STARTER →" : "ĐĂNG KÝ AI STARTER →")
      : `${p.ctaLabel || T.registerCourse || "ĐĂNG KÝ KHÓA HỌC"} →`;
  const finalMicro = $("#finalMicro");
  if (finalMicro) {
    if (p.id === "ai-agent-automation") {
      finalMicro.textContent = [p.formatLabel, p.final?.practiceNote, p.price]
        .filter(Boolean)
        .map((part) => String(part).toUpperCase())
        .join(" · ");
      document.querySelector(".final-venue")?.remove();
      if (p.venueName) {
        finalMicro.insertAdjacentHTML(
          "afterend",
          `<p class="final-venue"><strong>${p.venueName}</strong>${venueAddress(p) ? `<span>${venueAddress(p)}</span>` : ""}</p>`,
        );
      }
    } else {
      finalMicro.textContent = p.final?.micro || `${(p.formatLabel || "Online trực tiếp").toUpperCase()} · ${(p.durationLabel || "02 buổi × 120 phút").toUpperCase()} · ${(p.price || nearest?.price || "").toUpperCase()}`;
    }
  }
  $("#mobileCourse").textContent = p.shortName;
  $("#mobilePrice").textContent = nearest?.price || (I.locale === "en" ? "See schedule" : "Xem lịch");
  $("#mobileRegister").href = primaryHref;
  $("#mobileRegister").textContent = p.ctaLabel || (T.register || "Đăng ký").toUpperCase();
  document.querySelector(".menu-toggle")?.addEventListener("click", (e) => {
    const n = document.querySelector(".mobile-nav"),
      o = n.classList.toggle("open");
    e.currentTarget.setAttribute("aria-expanded", String(o));
  });
  const obs = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          obs.unobserve(e.target);
        }
      }),
    { threshold: 0.08 },
  );
  document.querySelectorAll(".reveal").forEach((x) => obs.observe(x));
  const header = document.querySelector(".site-header");
  const updateHeader = () => header?.classList.toggle("scrolled", window.scrollY > 24);
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });
})();
