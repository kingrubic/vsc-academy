(() => {
  const I = window.VSC_I18N || { locale: "vi", root: "" };
  const T = window.VSC_T || window.VSC_UI?.vi || {};
  const siteRoot = I.root || "";
  const sessions = window.VSC_SCHEDULES || [],
    params = new URLSearchParams(location.search),
    form = document.querySelector("#registrationForm"),
    summary = document.querySelector("#classSummary"),
    success = document.querySelector("#registrationSuccess");
  let step = 1,
    selected = null,
    submitting = false,
    lastRegistration = null;
  const $ = (s) => document.querySelector(s),
    all = (s) => [...document.querySelectorAll(s)],
    pad = (n) => String(n).padStart(2, "0"),
    date = (e) => {
      const [y, m, d] = e.date.split("-");
      return `${d}.${m}.${y}`;
    };
  function bankName(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/[^A-Za-z0-9 ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  function bankPhone(value) {
    return String(value || "").replace(/\D/g, "");
  }
  function transferContent(session, student) {
    const code = String(session?.slug || session?.sessionId || "VSC").trim();
    const name = bankName(student?.fullName);
    const phone = bankPhone(student?.phone);
    return [code, name, phone].filter(Boolean).join("_");
  }
  function sameKey(a, b) {
    return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
  }
  function pickSession() {
    const key = params.get("session");
    const programKey = params.get("program");
    selected =
      sessions.find((e) => sameKey(e.slug, key) || sameKey(e.id, key)) ||
      (programKey &&
        sessions.find(
          (e) =>
            sameKey(e.programId, programKey) &&
            e.remainingSeats !== 0 &&
            e.status !== "upcoming",
        )) ||
      sessions.find((e) => sameKey(e.programId, programKey)) ||
      sessions.find((e) => e.remainingSeats > 0 && e.status !== "upcoming") ||
      sessions[0] ||
      null;
  }
  function summaryRender() {
    if (!selected) {
      summary.innerHTML =
        `<small>${I.locale === "en" ? "CLASS YOU ARE REGISTERING FOR" : "LỚP BẠN ĐANG ĐĂNG KÝ"}</small><h2>${I.locale === "en" ? "PLEASE CHOOSE A CLASS" : "VUI LÒNG CHỌN MỘT LỚP"}</h2>`;
      return;
    }
    const scheduleHref = I.href ? I.href("schedule") : "/lich-hoc";
    summary.innerHTML = `<small>${I.locale === "en" ? "CLASS YOU ARE REGISTERING FOR" : "LỚP BẠN ĐANG ĐĂNG KÝ"}</small><h2>${selected.title}</h2><div class="summary-meta"><div><span>${I.locale === "en" ? "Date" : "Ngày học"}</span><b>${date(selected)}</b></div><div><span>${T.time || "Thời gian"}</span><b>${selected.startTime} – ${selected.endTime}</b></div><div><span>${T.format || "Hình thức"}</span><b>${selected.formatLabel || (selected.format === "online" ? (T.online || "Online") : (T.offline || "Offline"))}</b></div>${selected.durationLabel ? `<div><span>${T.duration || "Thời lượng"}</span><b>${selected.durationLabel} · ${selected.totalDuration}</b></div>` : ""}${selected.scheduleLabel ? `<div><span>${T.schedule || "Lịch chính"}</span><b>${selected.scheduleLabel}</b></div>` : ""}<div><span>${T.platform || "Nền tảng"}</span><b>${selected.location}</b></div>${selected.supportLabel ? `<div><span>${T.supportAfter || "Hỗ trợ sau khóa"}</span><b>${selected.supportLabel}</b></div>` : ""}</div><p class="summary-price">${(T.tuition || "Học phí").toUpperCase()}<strong>${selected.price}</strong></p><p class="summary-seats">${selected.classSizeLabel ? `${T.seats || "Sĩ số"} ${selected.classSizeLabel}` : selected.remainingSeats ? `${pad(selected.remainingSeats)} / ${selected.capacity} ${T.remaining || "chỗ còn lại"}` : (I.locale === "en" ? "Class is full · Join the waitlist" : "Lớp đã đầy · Đăng ký danh sách chờ")}</p><a class="summary-change" href="${scheduleHref}">${I.locale === "en" ? "← Choose another class" : "← Chọn lịch khác"}</a>`;
  }
  function selectors() {
    const programSelect = $("#programSelect");
    const sessionSelect = $("#sessionSelect");
    if (!programSelect || !sessionSelect) return;
    const programs = [
      ...new Map(sessions.map((e) => [e.programId, e])).values(),
    ];
    if (!programs.length) {
      const empty = I.locale === "en" ? "No classes available" : "Chưa có lớp khai giảng";
      programSelect.innerHTML = `<option value="">${empty}</option>`;
      sessionSelect.innerHTML = `<option value="">${empty}</option>`;
      if ($("#formNext")) $("#formNext").disabled = true;
      if ($("#formSubmit")) $("#formSubmit").disabled = true;
      return;
    }
    programSelect.innerHTML = programs
      .map(
        (e) =>
          `<option value="${e.programId}">${(T.programNames && T.programNames[e.programId]) || e.title}</option>`,
      )
      .join("");
    if (!selected) selected = sessions.find((e) => e.programId === programs[0].programId) || sessions[0];
    if (!selected) return;
    programSelect.value = selected.programId;
    renderSessionOptions();
    if (params.has("session")) $("#sessionSelectors").hidden = true;
  }
  function renderSessionOptions() {
    const list = sessions.filter(
      (e) => e.programId === $("#programSelect").value,
    );
    $("#sessionSelect").innerHTML = list
      .map(
        (e) =>
          `<option value="${e.id}">${date(e)} · ${e.startTime} · ${e.formatLabel || (e.format === "online" ? "Online" : "Offline")}</option>`,
      )
      .join("");
    if (!selected) selected = list[0] || null;
    else if (list.some((e) => e.id === selected.id))
      $("#sessionSelect").value = selected.id;
    else selected = list[0] || null;
    summaryRender();
  }
  function saveDraft() {
    const data = Object.fromEntries(new FormData(form));
    localStorage.setItem(
      "vsc_registration_draft",
      JSON.stringify({
        expires: Date.now() + 86400000,
        data,
        step,
        session: selected?.slug,
      }),
    );
  }
  function loadDraft() {
    try {
      const d = JSON.parse(localStorage.getItem("vsc_registration_draft"));
      if (!d || d.expires < Date.now()) return;
      Object.entries(d.data).forEach(([k, v]) => {
        const el = form.elements[k];
        if (!el) return;
        if (el.type === "checkbox") el.checked = v === "on";
        else if (el.length && el[0]?.type === "radio")
          [...el].forEach((r) => (r.checked = r.value === v));
        else el.value = v;
      });
    } catch {}
  }
  function validate() {
    let ok = true;
    all(".form-step.active [required]").forEach((el) => {
      el.classList.remove("field-error");
      el.parentElement.querySelector(".error-text")?.remove();
      if (!el.checkValidity()) {
        ok = false;
        el.classList.add("field-error");
        el.insertAdjacentHTML(
          "afterend",
          `<span class="error-text">${el.type === "email" ? (I.locale === "en" ? "Please enter a valid email address" : "Vui lòng nhập email hợp lệ") : (I.locale === "en" ? "Please complete this field" : "Vui lòng hoàn tất thông tin này")}</span>`,
        );
      }
    });
    return ok;
  }
  function go(n) {
    step = n;
    all(".form-step").forEach((e) =>
      e.classList.toggle("active", +e.dataset.step === n),
    );
    all(".form-progress button").forEach((e, i) =>
      e.classList.toggle("active", i < n),
    );
    $("#formBack").hidden = n === 1;
    $("#formNext").hidden = n === 3;
    $("#formSubmit").hidden = n !== 3;
    saveDraft();
    scrollTo({ top: $("#enrollment").offsetTop - 90, behavior: "smooth" });
  }

  function selectSession(session) {
    if (!session) return;
    selected = session;
    const programSelect = $("#programSelect");
    const sessionSelect = $("#sessionSelect");
    const sessionSelectors = $("#sessionSelectors");
    if (programSelect) programSelect.value = session.programId;
    renderSessionOptions();
    if (sessionSelect) sessionSelect.value = session.id;
    if (sessionSelectors) sessionSelectors.hidden = false;
    summaryRender();
  }
  function initHeroFeed() {
    const track = $("#registrationHeroFeed");
    const counter = $("#registrationHeroCounter");
    const box = document.querySelector(".registration-hero-feed");
    if (!track || !sessions.length) {
      box?.remove();
      return;
    }
    const feedEvents = [...sessions]
      .filter((e) => e.status !== "ended")
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);
    if (!feedEvents.length) {
      box.remove();
      return;
    }
    const statusLabel = (e) =>
      (T.status && T.status[e.status]) ||
      (e.status === "full"
        ? "Đã đầy"
        : e.status === "limited"
          ? "Sắp hết chỗ"
          : e.status === "upcoming"
            ? "Sắp mở"
            : "Còn chỗ");
    track.innerHTML = feedEvents
      .map(
        (e, index) =>
          `<button class="registration-hero-feed-item${index === 0 ? " active" : ""}" type="button" data-hero-session="${e.slug}"><time datetime="${e.date}"><b>${e.date.slice(8)}</b><span>${(T.monthShort && T.monthShort[Number(e.date.slice(5, 7)) - 1]) || ("THG " + e.date.slice(5, 7))}</span></time><span class="registration-hero-feed-copy"><small>${e.type === "workshop" ? "WORKSHOP" : (T.course || "KHÓA HỌC").toUpperCase()} · ${e.format === "online" ? "ONLINE" : "OFFLINE"}</small><strong>${e.title}</strong><em>${e.startTime} – ${e.endTime} · ${statusLabel(e)}</em></span><i aria-hidden="true">↗</i></button>`,
      )
      .join("");
    const items = [...track.querySelectorAll(".registration-hero-feed-item")];
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let feedIndex = 0,
      feedTimer;
    const showFeed = (index) => {
      feedIndex = (index + items.length) % items.length;
      items.forEach((item, i) =>
        item.classList.toggle("active", i === feedIndex),
      );
      track.style.transform = `translate3d(0,calc(${feedIndex} * -104px),0)`;
      if (counter)
        counter.textContent = `${pad(feedIndex + 1)} / ${pad(items.length)}`;
    };
    const startFeed = () => {
      clearInterval(feedTimer);
      if (!reduceMotion.matches && items.length > 1)
        feedTimer = setInterval(() => showFeed(feedIndex + 1), 3600);
    };
    items.forEach((item, index) =>
      item.addEventListener("click", () => {
        selectSession(
          sessions.find((event) => event.slug === item.dataset.heroSession),
        );
        showFeed(index);
        startFeed();
        $("#enrollment")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }),
    );
    box.addEventListener("mouseenter", () => clearInterval(feedTimer));
    box.addEventListener("mouseleave", startFeed);
    reduceMotion.addEventListener?.("change", startFeed);
    showFeed(0);
    startFeed();
  }
  pickSession();
  summaryRender();
  selectors();
  loadDraft();
  initHeroFeed();
  form.addEventListener("input", saveDraft);
  $("#programSelect").addEventListener("change", renderSessionOptions);
  $("#sessionSelect").addEventListener("change", (e) => {
    selected = sessions.find((x) => x.id === e.target.value);
    summaryRender();
  });
  $("#sourceSelect").addEventListener(
    "change",
    (e) => ($("#referralField").hidden = !/giới thiệu|referral|referred/i.test(e.target.value)),
  );
  all('[name="invoiceRequired"]').forEach((r) =>
    r.addEventListener(
      "change",
      () => ($("#invoiceFields").hidden = r.value !== "true"),
    ),
  );
  $("#formNext").onclick = () => validate() && go(step + 1);
  $("#formBack").onclick = () => go(step - 1);
  all("[data-go]").forEach(
    (b) => (b.onclick = () => +b.dataset.go < step && go(+b.dataset.go)),
  );
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (submitting || !validate()) return;
    if (!selected) {
      const submitError = $("#registrationSubmitError");
      if (submitError) {
        submitError.hidden = false;
        submitError.textContent =
          I.locale === "en"
            ? "Please choose a class before submitting."
            : "Vui lòng chọn một lớp trước khi gửi đăng ký.";
      }
      return;
    }
    submitting = true;
    const btn = $("#formSubmit");
    const submitError = $("#registrationSubmitError");
    submitError.hidden = true;
    submitError.textContent = "";
    btn.disabled = true;
    btn.textContent = I.locale === "en" ? "PROCESSING..." : "ĐANG XỬ LÝ...";
    const f = Object.fromEntries(new FormData(form)),
      record = {
        createdAt: new Date().toISOString(),
        locale: I.locale || "vi",
        student: {
          fullName: f.fullName,
          phone: f.phone,
          email: f.email,
          role: f.role,
          organization: f.organization,
        },
        learningProfile: { aiLevel: f.aiLevel, goal: f.goal },
        program: { programId: selected.programId, programName: selected.title },
        session: {
          sessionId: selected.id,
          slug: selected.slug,
          date: selected.date,
          startTime: selected.startTime,
          endTime: selected.endTime,
          format: selected.format,
          location: selected.location,
          price: selected.price,
        },
        marketing: {
          source: f.source,
          utmSource: params.get("utm_source"),
          utmMedium: params.get("utm_medium"),
          utmCampaign: params.get("utm_campaign"),
          utmContent: params.get("utm_content"),
          utmTerm: params.get("utm_term"),
          referralCode: params.get("ref"),
          landingPage:
            sessionStorage.getItem("vsc_first_touch") || document.referrer,
          registrationPage: location.href,
        },
        invoice: {
          required: f.invoiceRequired === "true",
          companyName: f.companyName,
          taxCode: f.taxCode,
          invoiceEmail: f.invoiceEmail,
          companyAddress: f.companyAddress,
        },
        status: "pending_payment",
        paymentStatus: "unpaid",
        consentPrivacy: !!f.consentPrivacy,
        consentMarketing: !!f.consentMarketing,
      };
    const finish = (registrationId) => {
      record.registrationId = registrationId;
      lastRegistration = record;
      localStorage.removeItem("vsc_registration_draft");
      $("#enrollment").hidden = true;
      success.hidden = false;
      $("#successDetails").innerHTML =
        `<div><small>${I.locale === "en" ? "REGISTRATION ID" : "MÃ ĐĂNG KÝ"}</small><strong>${registrationId}</strong></div><div><small>${I.locale === "en" ? "CLASS" : "LỚP"}</small><strong>${selected.shortTitle}</strong></div><div><small>${I.locale === "en" ? "DATE · TIME" : "NGÀY · GIỜ"}</small><strong>${date(selected)} · ${selected.startTime}</strong></div><div><small>${(T.tuition || "Học phí").toUpperCase()}</small><strong>${selected.price}</strong></div>`;
      success.scrollIntoView({ behavior: "smooth" });
      submitting = false;
    };
    fetch("/api/public/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    })
      .then((res) =>
        res.json()
          .catch(() => ({}))
          .then((data) => ({ ok: res.ok, data })),
      )
      .then(({ ok, data }) => {
        if (!ok || !data.id) throw new Error(data.error || "Registration could not be saved");
        finish(data.id);
      })
      .catch(() => {
        submitError.textContent =
          I.locale === "en"
            ? "We could not save your registration. Please check your connection and try again."
            : "Chưa thể lưu đăng ký. Vui lòng kiểm tra kết nối và thử lại.";
        submitError.hidden = false;
        submitting = false;
      })
      .finally(() => {
        btn.disabled = false;
        btn.textContent = I.locale === "en" ? "SUBMIT REGISTRATION" : "GỬI ĐĂNG KÝ";
      });
  });
  const paymentModal = $("#paymentModal"),
    paymentTrigger = $("#openPaymentGuide"),
    closePayment = () => {
      paymentModal.hidden = true;
      document.body.classList.remove("payment-modal-open");
      paymentTrigger?.focus();
    };
  paymentTrigger?.addEventListener("click", () => {
    if (!lastRegistration) return;
    $("#paymentAmount").textContent = lastRegistration.session.price;
    $("#paymentContent").textContent = transferContent(
      lastRegistration.session,
      lastRegistration.student,
    );
    paymentModal.hidden = false;
    document.body.classList.add("payment-modal-open");
    paymentModal.querySelector(".payment-close")?.focus();
  });
  all("[data-payment-close]").forEach((el) =>
    el.addEventListener("click", closePayment),
  );
  all("[data-copy]").forEach((button) =>
    button.addEventListener("click", async () => {
      const value = document.getElementById(button.dataset.copy)?.textContent;
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        const field = document.createElement("textarea");
        field.value = value;
        document.body.appendChild(field);
        field.select();
        document.execCommand("copy");
        field.remove();
      }
      button.textContent = I.locale === "en" ? "COPIED" : "ĐÃ SAO CHÉP";
      button.classList.add("is-copied");
      setTimeout(() => {
        button.textContent = I.locale === "en" ? "COPY" : "SAO CHÉP";
        button.classList.remove("is-copied");
      }, 1600);
    }),
  );
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !paymentModal.hidden) closePayment();
  });
  const toggle = $(".menu-toggle"),
    mobile = $(".mobile-nav");
  toggle?.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!open));
    mobile?.classList.toggle("open", !open);
  });
  if (!sessionStorage.getItem("vsc_first_touch"))
    sessionStorage.setItem("vsc_first_touch", location.href);
})();
