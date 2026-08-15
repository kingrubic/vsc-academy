(() => {
  const EN = location.pathname.startsWith("/en/student");
  const BASE = EN ? "/en/student" : "/hoc-vien";
  const t = EN
    ? {
        portal: "LEARNER PORTAL",
        welcomeBack: "WELCOME BACK TO VSC ACADEMY.",
        loginLead: "Sign in to continue your course, see your schedule and open your materials.",
        email: "EMAIL",
        password: "PASSWORD",
        submit: "SIGN IN →",
        remember: "Remember me",
        forgot: "Forgot password?",
        needHelp: "Need login help?",
        activateCta: "ACTIVATE ACCOUNT",
        activate: "Activate account",
        activateLead: "Choose a password to open your portal.",
        newPassword: "NEW PASSWORD",
        forgotTitle: "Reset password",
        forgotLead: "Enter your email. If an account exists, we will send a reset link.",
        sendReset: "SEND RESET LINK",
        resetTitle: "Set a new password",
        hello: "HELLO",
        continue: "Continue your learning journey at VSC Academy.",
        next: "NEXT CLASS",
        join: "JOIN CLASS →",
        details: "VIEW CLASS DETAILS →",
        map: "VIEW LOCATION →",
        replay: "WATCH RECORDING →",
        myCourses: "MY COURSES",
        week: "THIS WEEK",
        viewAll: "View all",
        announcements: "NEW ANNOUNCEMENTS",
        materials: "NEW MATERIALS",
        progress: "LEARNING PROGRESS",
        enter: "OPEN COURSE →",
        dashboard: "Overview",
        courses: "My courses",
        schedule: "Schedule",
        files: "Materials",
        notes: "Announcements",
        certs: "Certificates",
        account: "Account",
        support: "Support",
        more: "More",
        active: "In progress",
        done: "Completed",
        overview: "Overview",
        classSchedule: "Schedule",
        attendanceTab: "Attendance",
        classInfo: "Class info",
        before: "BEFORE CLASS",
        during: "CLASS MATERIALS",
        after: "AFTER CLASS",
        extra: "ADDITIONAL",
        open: "VIEW →",
        download: "DOWNLOAD →",
        watch: "WATCH VIDEO →",
        empty: "Nothing here yet.",
        emptyNext: "NO UPCOMING CLASS YET.",
        emptyFiles: "NO NEW MATERIALS YET.",
        emptyFilesHint: "Your instructor will add materials during the programme.",
        emptyNotes: "YOU ARE UP TO DATE.",
        emptyCert: "NO CERTIFICATES YET.",
        emptyCertHint: "A certificate appears after you complete the programme and meet the issue requirements.",
        logout: "Sign out",
        save: "Save",
        markRead: "Mark as read",
        markAll: "Mark all as read",
        contact: "CONTACT VSC ACADEMY →",
        upcoming: "Scheduled",
        live: "Live",
        completed: "Completed",
        cancelled: "Cancelled",
        rescheduled: "Rescheduled",
        sessions: "sessions completed",
        present: "Present",
        absent: "Absent",
        excused: "Excused",
        not_recorded: "Not recorded",
        author: "VSC Academy",
        langVi: "VI",
        langEn: "EN",
        weekView: "WEEK",
        listView: "LIST",
        startsAt: "STARTS AT",
        platform: "PLATFORM",
        instructor: "Instructor",
        format: "Format",
        changePassword: "Change password",
        currentPassword: "CURRENT PASSWORD",
        language: "LANGUAGE",
        issued: "Issued",
        eligible: "Eligible",
        pending: "Being processed",
        revoked: "Revoked",
        viewCert: "VIEW CERTIFICATE →",
        downloadPdf: "DOWNLOAD PDF ↓",
        verify: "VERIFY →",
        finished: "YOU HAVE COMPLETED THE PROGRAMME",
        certReady: "YOUR CERTIFICATE IS READY",
        certProcessing: "CERTIFICATE IS BEING PROCESSED",
        unread: "Unread",
        important: "Important",
        all: "All",
        supportHours: "Support hours: 09:00–18:00 (GMT+7)",
      }
    : {
        portal: "LEARNER PORTAL",
        welcomeBack: "CHÀO MỪNG BẠN TRỞ LẠI VSC ACADEMY.",
        loginLead: "Đăng nhập để tiếp tục khóa học, xem lịch học và truy cập tài liệu của bạn.",
        email: "EMAIL",
        password: "MẬT KHẨU",
        submit: "ĐĂNG NHẬP →",
        remember: "Ghi nhớ đăng nhập",
        forgot: "Quên mật khẩu?",
        needHelp: "Cần hỗ trợ đăng nhập?",
        activateCta: "KÍCH HOẠT TÀI KHOẢN",
        activate: "Kích hoạt tài khoản",
        activateLead: "Tạo mật khẩu để vào cổng học viên.",
        newPassword: "MẬT KHẨU MỚI",
        forgotTitle: "Quên mật khẩu",
        forgotLead: "Nhập email. Nếu tài khoản tồn tại, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.",
        sendReset: "GỬI LINK ĐẶT LẠI",
        resetTitle: "Đặt mật khẩu mới",
        hello: "XIN CHÀO",
        continue: "Tiếp tục hành trình học tập của bạn tại VSC Academy.",
        next: "BUỔI HỌC TIẾP THEO",
        join: "VÀO LỚP HỌC →",
        details: "XEM THÔNG TIN BUỔI HỌC →",
        map: "XEM ĐỊA ĐIỂM →",
        replay: "XEM LẠI BUỔI HỌC →",
        myCourses: "KHÓA HỌC CỦA TÔI",
        week: "LỊCH TUẦN NÀY",
        viewAll: "Xem tất cả",
        announcements: "THÔNG BÁO MỚI",
        materials: "TÀI LIỆU MỚI",
        progress: "TIẾN ĐỘ HỌC TẬP",
        enter: "VÀO KHÓA HỌC →",
        dashboard: "Tổng quan",
        courses: "Khóa học của tôi",
        schedule: "Thời khóa biểu",
        files: "Tài liệu",
        notes: "Thông báo",
        certs: "Chứng nhận",
        account: "Tài khoản",
        support: "Hỗ trợ",
        more: "Thêm",
        active: "Đang học",
        done: "Đã hoàn thành",
        overview: "Tổng quan",
        classSchedule: "Lịch học",
        attendanceTab: "Điểm danh",
        classInfo: "Thông tin lớp",
        before: "TRƯỚC BUỔI HỌC",
        during: "TÀI LIỆU BUỔI HỌC",
        after: "SAU BUỔI HỌC",
        extra: "TÀI LIỆU BỔ SUNG",
        open: "XEM →",
        download: "TẢI XUỐNG →",
        watch: "XEM VIDEO →",
        empty: "Chưa có nội dung.",
        emptyNext: "CHƯA CÓ BUỔI HỌC SẮP TỚI.",
        emptyFiles: "CHƯA CÓ TÀI LIỆU MỚI.",
        emptyFilesHint: "Tài liệu sẽ được giảng viên cập nhật trong quá trình học.",
        emptyNotes: "BẠN ĐÃ XEM HẾT THÔNG BÁO.",
        emptyCert: "CHƯA CÓ CHỨNG NHẬN.",
        emptyCertHint: "Chứng nhận sẽ xuất hiện sau khi bạn hoàn thành chương trình và đáp ứng điều kiện cấp chứng nhận.",
        logout: "Đăng xuất",
        save: "Lưu",
        markRead: "Đánh dấu đã đọc",
        markAll: "Đánh dấu đã đọc hết",
        contact: "LIÊN HỆ VSC ACADEMY →",
        upcoming: "Đã lên lịch",
        live: "Đang diễn ra",
        completed: "Đã hoàn thành",
        cancelled: "Đã hủy",
        rescheduled: "Đổi lịch",
        sessions: "buổi hoàn thành",
        present: "Có mặt",
        absent: "Vắng",
        excused: "Có phép",
        not_recorded: "Chưa ghi nhận",
        author: "VSC Academy",
        langVi: "VI",
        langEn: "EN",
        weekView: "LỊCH TUẦN",
        listView: "DANH SÁCH",
        startsAt: "BẮT ĐẦU LÚC",
        platform: "NỀN TẢNG",
        instructor: "Giảng viên",
        format: "Hình thức",
        changePassword: "Đổi mật khẩu",
        currentPassword: "MẬT KHẨU HIỆN TẠI",
        language: "NGÔN NGỮ",
        issued: "Đã cấp",
        eligible: "Đủ điều kiện",
        pending: "Đang được xử lý",
        revoked: "Đã thu hồi",
        viewCert: "XEM CHỨNG NHẬN →",
        downloadPdf: "TẢI PDF ↓",
        verify: "XÁC MINH →",
        finished: "BẠN ĐÃ HOÀN THÀNH CHƯƠNG TRÌNH",
        certReady: "CHỨNG NHẬN CỦA BẠN ĐÃ SẴN SÀNG",
        certProcessing: "CHỨNG NHẬN ĐANG ĐƯỢC XỬ LÝ",
        unread: "Chưa đọc",
        important: "Quan trọng",
        all: "Tất cả",
        supportHours: "Giờ hỗ trợ: 09:00–18:00 (GMT+7)",
      };

  const NAV = [
    ["home", t.dashboard],
    ["courses", t.courses],
    ["schedule", t.schedule],
    ["materials", t.files],
    ["announcements", t.notes],
    ["certificates", t.certs],
    ["account", t.account],
    ["support", t.support],
  ];
  const state = { student: null, unread: 0, moreOpen: false };
  const $ = (s, el = document) => el.querySelector(s);
  const app = $("#app");
  const toastEl = $("#toast");

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    setTimeout(() => toastEl.classList.remove("show"), 2400);
  }
  function esc(s) {
    return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }
  function fmtDate(d) {
    if (!d) return "—";
    const [y, m, day] = String(d).slice(0, 10).split("-");
    return `${day}/${m}/${y}`;
  }
  function initials(name) {
    return String(name || "HV")
      .split(/\s+/)
      .slice(-2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
  }
  function statusLabel(s) {
    return t[s] || s;
  }
  async function api(path, opts = {}) {
    const join = path.includes("?") ? "&" : "?";
    const res = await fetch(`/api/learner${path}${join}locale=${EN ? "en" : "vi"}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      state.student = null;
      showAuth();
      throw new Error("Unauthorized");
    }
    if (!res.ok) throw new Error(data.error || "Error");
    return data;
  }
  function route() {
    const raw = location.pathname.replace(BASE, "") || "/";
    const parts = raw.split("/").filter(Boolean);
    const q = new URLSearchParams(location.search);
    return { parts, q, path: raw };
  }
  function go(href) {
    history.pushState({}, "", href.startsWith("http") ? href : BASE + href);
    render();
  }
  function navHref(key) {
    const vi = {
      home: "/",
      courses: "/khoa-hoc",
      schedule: "/lich-hoc",
      materials: "/tai-lieu",
      announcements: "/thong-bao",
      certificates: "/chung-nhan",
      account: "/tai-khoan",
      support: "/ho-tro",
    };
    const en = {
      home: "/",
      courses: "/courses",
      schedule: "/schedule",
      materials: "/materials",
      announcements: "/announcements",
      certificates: "/certificates",
      account: "/account",
      support: "/support",
    };
    return (EN ? en : vi)[key] || "/";
  }
  document.body.addEventListener("click", (e) => {
    const a = e.target.closest("[data-nav]");
    if (!a) return;
    e.preventDefault();
    if (a.dataset.href) return go(a.dataset.href);
    if (a.dataset.nav === "more") {
      state.moreOpen = !state.moreOpen;
      renderMore();
      return;
    }
    go(navHref(a.dataset.nav));
    document.querySelector(".sidebar")?.classList.remove("open");
    state.moreOpen = false;
    $("#more-sheet")?.remove();
  });
  window.addEventListener("popstate", render);

  function otherLocaleHref() {
    const { parts } = route();
    const viToEn = {
      "khoa-hoc": "courses",
      "lich-hoc": "schedule",
      "tai-lieu": "materials",
      "thong-bao": "announcements",
      "chung-nhan": "certificates",
      "tai-khoan": "account",
      "ho-tro": "support",
      "dang-nhap": "login",
      "kich-hoat": "activate",
      "quen-mat-khau": "forgot-password",
      "dat-lai-mat-khau": "reset-password",
    };
    const enToVi = Object.fromEntries(Object.entries(viToEn).map(([a, b]) => [b, a]));
    const mapped = parts.map((p, i) => (i === 0 ? (EN ? enToVi[p] || p : viToEn[p] || p) : p));
    const dest = EN ? "/hoc-vien" : "/en/student";
    return dest + (mapped.length ? `/${mapped.join("/")}` : "") + location.search;
  }
  function currentNav() {
    const { parts } = route();
    if (!parts.length) return "home";
    const map = {
      "khoa-hoc": "courses",
      courses: "courses",
      "lich-hoc": "schedule",
      schedule: "schedule",
      "tai-lieu": "materials",
      materials: "materials",
      "thong-bao": "announcements",
      announcements: "announcements",
      "chung-nhan": "certificates",
      certificates: "certificates",
      "tai-khoan": "account",
      account: "account",
      "ho-tro": "support",
      support: "support",
    };
    return map[parts[0]] || "home";
  }

  function layout() {
    const navKey = currentNav();
    $("#brand-sub").textContent = t.portal;
    $("#nav").innerHTML = NAV.map(
      ([key, label]) =>
        `<a data-nav="${key}" class="${key === navKey ? "active" : ""}">${label}${
          key === "announcements" && state.unread ? ` <b>●${state.unread}</b>` : ""
        }</a>`,
    ).join("");
    $("#bottom-nav").innerHTML = [
      ["home", t.dashboard],
      ["courses", t.courses],
      ["schedule", EN ? "Schedule" : "Lịch"],
      ["materials", t.files],
      ["more", t.more],
    ]
      .map(([key, label]) => `<a data-nav="${key}" class="${key === navKey || (key === "more" && ["announcements", "certificates", "account", "support"].includes(navKey)) ? "active" : ""}">${label}</a>`)
      .join("");
    $("#who-name").textContent = state.student.fullName;
    $("#side-name").textContent = state.student.fullName;
    $("#side-logout").textContent = t.logout;
    const ini = initials(state.student.fullName);
    $("#avatar").textContent = ini;
    $("#side-avatar").textContent = ini;
    $("#unread-dot").classList.toggle("hidden", !state.unread);
    $("#lang-switch").innerHTML = EN
      ? `<a href="${otherLocaleHref()}">${t.langVi}</a><span>EN</span>`
      : `<span>VI</span><a href="${otherLocaleHref()}">${t.langEn}</a>`;
    document.documentElement.lang = EN ? "en" : "vi";
    document.title = `VSC Academy | ${t.portal}`;
  }

  function renderMore() {
    $("#more-sheet")?.remove();
    if (!state.moreOpen) return;
    const sheet = document.createElement("div");
    sheet.id = "more-sheet";
    sheet.className = "more-sheet";
    sheet.innerHTML = NAV.slice(4)
      .map(([key, label]) => `<a data-nav="${key}">${label}</a>`)
      .join("");
    document.body.appendChild(sheet);
  }

  async function logout() {
    await api("/logout", { method: "POST", body: {} });
    state.student = null;
    showAuth("login");
  }

  function authShell(inner, visualLead) {
    return `<div class="auth-visual">
        <img src="/assets/logo-vsc-academy-white.webp" alt="VSC Academy" width="640" height="463" />
        <small>VSC ACADEMY · LEARNER PORTAL</small>
        <h2>${esc(t.welcomeBack)}</h2>
        <p>${esc(visualLead || t.loginLead)}</p>
      </div>
      <div class="auth-panel">${inner}</div>`;
  }

  function showAuth(mode) {
    $("#shell").classList.add("hidden");
    const auth = $("#auth");
    auth.classList.remove("hidden");
    const { parts, q } = route();
    const token = q.get("token");
    const activate =
      mode === "activate" || parts[0] === "kich-hoat" || parts[0] === "activate" || (token && parts[0] !== "dat-lai-mat-khau" && parts[0] !== "reset-password");
    const forgot = mode === "forgot" || parts[0] === "quen-mat-khau" || parts[0] === "forgot-password";
    const reset = mode === "reset" || parts[0] === "dat-lai-mat-khau" || parts[0] === "reset-password";
    let card = "";
    if (activate) {
      card = `<form class="auth-card" id="activate-form">
        <img class="auth-logo" src="/assets/logo-vsc-academy-white.webp" alt="" width="640" height="463" />
        <h1>${t.activate}</h1>
        <p>${t.activateLead}</p>
        <label>${t.newPassword}</label>
        <input name="password" type="password" minlength="8" required />
        <p class="auth-error" id="auth-error"></p>
        <button type="submit">${t.activateCta}</button>
      </form>`;
    } else if (forgot) {
      card = `<form class="auth-card" id="forgot-form">
        <img class="auth-logo" src="/assets/logo-vsc-academy-white.webp" alt="" width="640" height="463" />
        <h1>${t.forgotTitle}</h1>
        <p>${t.forgotLead}</p>
        <label>${t.email}</label>
        <input name="email" type="email" required />
        <p class="auth-error" id="auth-error"></p>
        <button type="submit">${t.sendReset}</button>
        <div class="auth-links"><a data-auth="login">${t.submit}</a></div>
      </form>`;
    } else if (reset) {
      card = `<form class="auth-card" id="reset-form">
        <img class="auth-logo" src="/assets/logo-vsc-academy-white.webp" alt="" width="640" height="463" />
        <h1>${t.resetTitle}</h1>
        <label>${t.newPassword}</label>
        <input name="password" type="password" minlength="8" required />
        <p class="auth-error" id="auth-error"></p>
        <button type="submit">${t.save}</button>
      </form>`;
    } else {
      card = `<form class="auth-card" id="login-form">
        <img class="auth-logo" src="/assets/logo-vsc-academy-white.webp" alt="" width="640" height="463" />
        <h1>${t.welcomeBack}</h1>
        <p>${t.loginLead}</p>
        <label>${t.email}</label>
        <input name="email" type="email" autocomplete="username" required />
        <label>${t.password}</label>
        <input name="password" type="password" autocomplete="current-password" required />
        <label class="check"><input type="checkbox" name="remember" /> ${t.remember}</label>
        <p class="auth-error" id="auth-error"></p>
        <button type="submit">${t.submit}</button>
        <div class="auth-links">
          <a data-auth="forgot">${t.forgot}</a>
          <a href="mailto:vscacademy8@gmail.com">${t.needHelp}</a>
        </div>
        <button type="button" class="btn" data-auth="activate">${t.activateCta}</button>
      </form>`;
    }
    auth.innerHTML = authShell(card);
    auth.querySelectorAll("[data-auth]").forEach((el) => {
      el.addEventListener("click", () => {
        const m = el.dataset.auth;
        if (m === "forgot") go(EN ? "/forgot-password" : "/quen-mat-khau");
        else if (m === "activate") go(EN ? "/activate" : "/kich-hoat");
        else go(EN ? "/login" : "/dang-nhap");
      });
    });
    $("#login-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const fd = new FormData(e.target);
        const data = await api("/login", {
          method: "POST",
          body: { email: fd.get("email"), password: fd.get("password"), rememberMe: fd.get("remember") === "on" },
        });
        state.student = data.student;
        history.replaceState({}, "", BASE + "/");
        render();
      } catch (err) {
        $("#auth-error").textContent = err.message;
      }
    });
    $("#activate-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const fd = new FormData(e.target);
        const data = await api("/activate", { method: "POST", body: { token, password: fd.get("password") } });
        state.student = data.student;
        history.replaceState({}, "", BASE + "/");
        render();
      } catch (err) {
        $("#auth-error").textContent = err.message;
      }
    });
    $("#forgot-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const fd = new FormData(e.target);
        const data = await api("/forgot-password", { method: "POST", body: { email: fd.get("email") } });
        $("#auth-error").textContent = data.message;
      } catch (err) {
        $("#auth-error").textContent = err.message;
      }
    });
    $("#reset-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const fd = new FormData(e.target);
        const data = await api("/reset-password", { method: "POST", body: { token, password: fd.get("password") } });
        state.student = data.student;
        history.replaceState({}, "", BASE + "/");
        render();
      } catch (err) {
        $("#auth-error").textContent = err.message;
      }
    });
  }

  async function joinMeeting(id) {
    try {
      const data = await api(`/meetings/${id}/join`);
      if (data.url) window.open(data.url, "_blank", "noopener");
    } catch (err) {
      toast(err.message);
    }
  }

  function nextCta(enr) {
    const m = enr?.nextMeeting;
    if (!m) return "";
    if (m.format === "offline") {
      return `<button class="btn-light" data-href="${EN ? `/courses/${enr.id}` : `/khoa-hoc/${enr.id}`}">${t.map}</button>`;
    }
    if (m.status === "completed" && m.hasRecording) {
      return m.recordingUrl
        ? `<a class="btn-light" href="${esc(m.recordingUrl)}" target="_blank" rel="noopener">${t.replay}</a>`
        : "";
    }
    if (m.canJoin) return `<button class="btn-light" data-join="${m.id}">${t.join}</button>`;
    return `<button class="btn-light" data-href="${EN ? `/courses/${enr.id}` : `/khoa-hoc/${enr.id}`}">${t.details}</button>`;
  }

  function courseCard(enr) {
    const p = enr.progress || { percent: 0, completed: 0, total: 0 };
    const href = EN ? `/courses/${enr.id}` : `/khoa-hoc/${enr.id}`;
    return `<article class="card">
      <small>${esc(enr.session?.name || "")}</small>
      <h3>${esc(enr.program?.name || "")}</h3>
      <p>${esc(enr.instructor?.name || "")}</p>
      <div class="progress"><i style="width:${p.percent}%"></i></div>
      <small>${p.completed} / ${p.total} ${t.sessions} · ${p.percent}%</small>
      <p>${enr.nextMeeting ? `${fmtDate(enr.nextMeeting.date)} · ${enr.nextMeeting.startTime}` : statusLabel(enr.status)}</p>
      <button class="btn" data-href="${href}">${t.enter}</button>
    </article>`;
  }

  function materialRow(m) {
    const file = `/api/learner/materials/${m.id}/file`;
    const video = m.type === "video" || m.type === "recording";
    return `<article class="item">
      <small>${esc(m.type).toUpperCase()} · ${fmtDate(m.publishedAt)}</small>
      <b>${esc(m.title)}</b>
      <p>${esc(m.description)}</p>
      <div>
        ${m.hasFile ? `<a class="btn" href="${m.externalUrl || file}" target="_blank" rel="noopener">${video ? t.watch : t.open}</a>` : ""}
        ${m.downloadable && m.hasFile && !m.externalUrl ? `<a class="btn" href="${file}" target="_blank" rel="noopener">${t.download}</a>` : ""}
      </div>
    </article>`;
  }

  function setStickyJoin(next) {
    const el = $("#sticky-join");
    if (!el) return;
    if (next?.nextMeeting?.canJoin) {
      el.classList.remove("hidden");
      el.textContent = EN ? "JOIN CLASS →" : "VÀO LỚP →";
      el.onclick = (e) => {
        e.preventDefault();
        joinMeeting(next.nextMeeting.id);
      };
    } else {
      el.classList.add("hidden");
    }
  }

  async function viewHome() {
    const d = await api("/dashboard");
    state.unread = d.unread || 0;
    layout();
    const next = d.nextClass;
    setStickyJoin(next);
    const m = next?.nextMeeting;
    app.innerHTML = `
      <section class="welcome">
        <h1>${t.hello}, ${esc(state.student.fullName)}</h1>
        <p>${t.continue}</p>
      </section>
      ${
        next && m
          ? `<section class="next-card">
              <small>${t.next}</small>
              <h2>${esc(next.program?.name || "")}</h2>
              <div class="meta">${EN ? "Meeting" : "Buổi"} ${String(m.meetingNumber).padStart(2, "0")} · ${esc(m.title)}</div>
              <div class="meta">${fmtDate(m.date)} · ${esc(m.startTime)}–${esc(m.endTime)}</div>
              <div class="meta">${t.instructor}: ${esc(next.instructor?.name || "—")} · ${esc(m.format || next.session?.format || "")}</div>
              <div class="meta">${
                m.format === "offline"
                  ? esc(next.venue?.name || "") + (next.venue?.address ? " · " + esc(next.venue.address) : "")
                  : `${t.platform}: ${esc(m.onlinePlatform || next.session?.onlinePlatform || "Google Meet")}`
              }</div>
              ${nextCta(next)}
            </section>`
          : `<p class="empty">${t.emptyNext}</p>`
      }
      <div class="section-title"><h3>${t.myCourses}</h3><a data-nav="courses">${t.viewAll}</a></div>
      <div class="cards">${d.enrollments.map(courseCard).join("") || `<p class="empty">${t.empty}</p>`}</div>
      <div class="section-title" style="margin-top:28px"><h3>${t.week}</h3><a data-nav="schedule">${t.viewAll}</a></div>
      ${weekGrid(d.week || [])}
      <div class="section-title"><h3>${t.announcements}</h3><a data-nav="announcements">${t.viewAll}</a></div>
      <div class="list">${d.announcements.map((a) => `<article class="item"><small>${fmtDate(a.publishedAt)} · ${esc(a.priority)} · ${t.author}</small><b>${esc(a.title)}</b><p>${esc(a.content)}</p></article>`).join("") || `<p class="empty">${t.emptyNotes}</p>`}</div>
      <div class="section-title" style="margin-top:28px"><h3>${t.materials}</h3><a data-nav="materials">${t.viewAll}</a></div>
      <div class="list">${d.materials.map((m) => materialRow(m)).join("") || `<p class="empty">${t.emptyFiles}</p>`}</div>
      <div class="section-title" style="margin-top:28px"><h3>${t.progress}</h3></div>
      <div class="cards">${d.enrollments
        .map((e) => {
          const p = e.progress || {};
          return `<article class="card"><h3>${esc(e.program?.name || "")}</h3><div class="progress"><i style="width:${p.percent || 0}%"></i></div><small>${p.completed || 0} / ${p.total || 0} · ${p.percent || 0}%</small></article>`;
        })
        .join("")}</div>
    `;
    bindApp();
  }

  function weekGrid(items) {
    const days = EN
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
    const start = new Date();
    const day = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - day);
    const cells = days.map((label, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const hits = items.filter((x) => x.date === iso);
      return `<div class="week-day"><b>${label} ${d.getDate()}</b>${
        hits
          .map(
            (x) =>
              `<div class="week-item"><b>${esc(x.programName || x.title)}</b><span>${esc(x.startTime)} · ${esc(x.format || "")}</span></div>`,
          )
          .join("") || `<span class="empty" style="padding:0">—</span>`
      }</div>`;
    });
    return `<div class="week">${cells.join("")}</div>`;
  }

  async function viewCourses() {
    const d = await api("/enrollments");
    setStickyJoin(d.items.find((x) => x.nextMeeting?.canJoin));
    const active = d.items.filter((x) => x.status !== "completed" && x.status !== "cancelled");
    const done = d.items.filter((x) => x.status === "completed");
    app.innerHTML = `<h1>${t.courses}</h1>
      <h3 style="margin:18px 0 10px">${t.active}</h3>
      <div class="cards">${active.map(courseCard).join("") || `<p class="empty">${t.empty}</p>`}</div>
      <h3 style="margin:24px 0 10px">${t.done}</h3>
      <div class="cards">${done.map(courseCard).join("") || `<p class="empty">${t.empty}</p>`}</div>`;
    bindApp();
  }

  async function viewCourse(id) {
    const d = await api(`/enrollments/${id}`);
    const e = d.enrollment;
    const tab = new URLSearchParams(location.search).get("tab") || "overview";
    const p = e.progress || {};
    setStickyJoin(e);
    const tabs = [
      ["overview", t.overview],
      ["schedule", t.classSchedule],
      ["materials", t.files],
      ["announcements", t.notes],
      ["attendance", t.attendanceTab],
      ["info", t.classInfo],
    ];
    app.innerHTML = `
      <header class="welcome">
        <small>${esc(e.session?.name || "")}</small>
        <h1>${esc(e.program?.name || "")}</h1>
        <p>${esc(e.instructor?.name || "")} · ${esc(e.session?.format || e.program?.format || "")} · ${p.completed || 0} / ${p.total || 0} ${t.sessions}</p>
        <div class="progress" style="max-width:280px"><i style="width:${p.percent || 0}%"></i></div>
      </header>
      ${completionBanner(e)}
      <div class="tabs">${tabs.map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? "active" : ""}">${l}</button>`).join("")}</div>
      <div id="pane"></div>`;
    const pane = $("#pane");
    const show = (k) => {
      app.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("active", b.dataset.tab === k));
      if (k === "overview") {
        pane.innerHTML = `
          <p>${esc(e.program?.description || "")}</p>
          ${e.instructor ? `<div class="card instructor-card" style="margin:16px 0">${e.instructor.photo ? `<img class="instructor-photo" src="${esc(e.instructor.photo)}" alt="">` : ""}<div><small>${esc(e.instructor.title || "")} · ${esc(e.instructor.role || "")}</small><h3>${esc(e.instructor.name)}</h3><p>${esc(e.instructor.bio || "")}</p></div></div>` : ""}
          ${e.nextMeeting ? `<p><b>${t.next}:</b> ${fmtDate(e.nextMeeting.date)} · ${esc(e.nextMeeting.startTime)}–${esc(e.nextMeeting.endTime)}</p>${nextCta(e)}` : ""}
          ${e.session?.format === "offline" && e.venue ? `<div class="card"><h3>${esc(e.venue.name)}</h3><p>${esc(e.venue.address)}</p>${e.venue.mapUrl ? `<a class="btn" href="${esc(e.venue.mapUrl)}" target="_blank">${t.map}</a>` : ""}</div>` : ""}
          <div class="list" style="margin-top:16px">${(d.materials || []).slice(0, 3).map(materialRow).join("")}</div>
        `;
      } else if (k === "schedule") {
        pane.innerHTML = `<div class="list">${d.meetings.map((m) => meetingRow(m)).join("")}</div>`;
      } else if (k === "materials") {
        const groups = { before: [], during: [], after: [], extra: [] };
        d.materials.forEach((m) => (groups[m.phase] || groups.extra).push(m));
        pane.innerHTML = ["before", "during", "after", "extra"]
          .map((phase) => `<h3 style="margin:16px 0 8px">${t[phase]}</h3>${groups[phase].map(materialRow).join("") || `<p class="empty">${t.emptyFiles}</p>`}`)
          .join("");
      } else if (k === "announcements") {
        pane.innerHTML = `<div class="list">${d.announcements.map((a) => `<article class="item"><small>${fmtDate(a.publishedAt)}</small><b>${esc(a.title)}</b><p>${esc(a.content)}</p></article>`).join("") || `<p class="empty">${t.emptyNotes}</p>`}</div>`;
      } else if (k === "attendance") {
        pane.innerHTML = `<div class="list">${d.meetings
          .map(
            (m) => `<article class="item"><small>${fmtDate(m.date)} · ${esc(m.title)}</small><b>${statusLabel(m.attendance || "not_recorded")}</b></article>`,
          )
          .join("")}</div>`;
      } else {
        pane.innerHTML = `
          <div class="card">
            <p><b>${esc(e.program?.name)}</b></p>
            <p>${esc(e.session?.name)} · ${fmtDate(e.session?.startDate)}</p>
            <p>${esc(e.program?.duration || "")}</p>
            ${e.venue ? `<p>${esc(e.venue.name)} · ${esc(e.venue.address)}</p>` : `<p>${t.platform}: ${esc(e.session?.onlinePlatform || "Google Meet")}</p>`}
          </div>`;
      }
      bindApp();
    };
    show(tab);
    app.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => show(b.dataset.tab)));
  }

  function completionBanner(e) {
    if (e.status !== "completed" && e.completionStatus !== "completed") return "";
    const cert = e.certificate || {};
    if (cert.status === "issued") {
      return `<div class="card" style="margin-bottom:18px"><h3>${t.finished}</h3><p>${t.certReady}</p><button class="btn btn-primary" data-nav="certificates">${t.viewCert}</button></div>`;
    }
    return `<div class="card" style="margin-bottom:18px"><h3>${t.finished}</h3><p>${t.certProcessing}</p></div>`;
  }

  function meetingRow(m) {
    const cta =
      m.format === "offline"
        ? ""
        : m.status === "completed" && m.recordingUrl
          ? `<a class="btn" href="${esc(m.recordingUrl)}" target="_blank" rel="noopener">${t.replay}</a>`
          : m.canJoin
            ? `<button class="btn btn-primary" data-join="${m.id}">${t.join}</button>`
            : m.hasMeetingUrl
              ? `<span class="badge">${t.startsAt} ${esc(m.startTime)}</span>`
              : "";
    return `<article class="item">
      <small>${EN ? "MEETING" : "BUỔI"} ${String(m.meetingNumber).padStart(2, "0")} · ${statusLabel(m.status)}</small>
      <b>${esc(m.title)}</b>
      <p>${fmtDate(m.date)} · ${esc(m.startTime)}–${esc(m.endTime)} · ${esc(m.format || "")} · ${statusLabel(m.attendance || "not_recorded")}</p>
      ${m.onlinePlatform ? `<p>${t.platform}: ${esc(m.onlinePlatform)}</p>` : ""}
      ${cta}
    </article>`;
  }

  async function viewSchedule() {
    const d = await api("/schedule");
    const live = d.items.find((x) => x.canJoin);
    setStickyJoin(live ? { nextMeeting: live } : null);
    const view = new URLSearchParams(location.search).get("view") || (window.innerWidth < 860 ? "list" : "week");
    app.innerHTML = `<h1>${t.schedule}</h1>
      <div class="view-toggle">
        <button class="${view === "week" ? "btn btn-primary" : "btn"}" data-href="${EN ? "/schedule?view=week" : "/lich-hoc?view=week"}">${t.weekView}</button>
        <button class="${view === "list" ? "btn btn-primary" : "btn"}" data-href="${EN ? "/schedule?view=list" : "/lich-hoc?view=list"}">${t.listView}</button>
      </div>
      ${view === "week" ? weekGrid(d.week || d.items) : ""}
      <div class="list">${d.items.map((m) => `<article class="item">
        <small>${statusLabel(m.status)} · ${esc(m.programName || m.sessionName || "")}</small>
        <b>${esc(m.title)}</b>
        <p>${fmtDate(m.date)} · ${esc(m.startTime)}–${esc(m.endTime)} · ${esc(m.instructorName || "")}</p>
        <p>${m.format === "offline" ? esc(m.venueName || "") : `${t.platform}: ${esc(m.onlinePlatform || "Google Meet")}`}</p>
        ${m.canJoin ? `<button class="btn btn-primary" data-join="${m.id}">${t.join}</button>` : ""}
        ${m.format === "offline" && m.mapUrl ? `<a class="btn" href="${esc(m.mapUrl)}" target="_blank">${t.map}</a>` : ""}
        ${m.recordingUrl ? `<a class="btn" href="${esc(m.recordingUrl)}" target="_blank">${t.replay}</a>` : ""}
      </article>`).join("") || `<p class="empty">${t.emptyNext}</p>`}</div>`;
    bindApp();
  }

  async function viewMaterials() {
    const d = await api("/materials");
    const groups = { before: [], during: [], after: [], extra: [] };
    d.items.forEach((m) => (groups[m.phase] || groups.extra).push(m));
    app.innerHTML = `<h1>${t.files}</h1>
      <h3 style="margin:18px 0 8px">${EN ? "NEW MATERIALS" : "TÀI LIỆU MỚI"}</h3>
      <div class="list">${d.items.slice(0, 4).map(materialRow).join("") || `<p class="empty">${t.emptyFiles}<br>${t.emptyFilesHint}</p>`}</div>
      ${["before", "during", "after", "extra"]
        .map((phase) => `<h3 style="margin:18px 0 8px">${t[phase]}</h3><div class="list">${groups[phase].map(materialRow).join("") || `<p class="empty">${t.emptyFiles}</p>`}</div>`)
        .join("")}`;
  }

  async function viewAnnouncements() {
    const d = await api("/announcements");
    state.unread = d.unread || 0;
    layout();
    const filter = new URLSearchParams(location.search).get("f") || "all";
    let items = d.items;
    if (filter === "unread") items = items.filter((a) => !a.read);
    if (filter === "important") items = items.filter((a) => a.priority === "important" || a.priority === "urgent");
    app.innerHTML = `<h1>${t.announcements}</h1>
      <div class="filters">
        <button class="${filter === "unread" ? "active" : ""}" data-href="${EN ? "/announcements?f=unread" : "/thong-bao?f=unread"}">${t.unread}</button>
        <button class="${filter === "important" ? "active" : ""}" data-href="${EN ? "/announcements?f=important" : "/thong-bao?f=important"}">${t.important}</button>
        <button class="${filter === "all" ? "active" : ""}" data-href="${EN ? "/announcements" : "/thong-bao"}">${t.all}</button>
        <button class="btn" id="read-all">${t.markAll}</button>
      </div>
      <div class="list">${items
        .map(
          (a) => `<article class="item">
          ${!a.read ? `<span class="badge">NEW</span>` : ""}
          <span class="badge ${a.priority}">${esc(a.priority).toUpperCase()}</span>
          <b>${esc(a.title)}</b>
          <small>${fmtDate(a.publishedAt)} · ${t.author}</small>
          <p>${esc(a.content)}</p>
          ${a.read ? "" : `<button class="btn" data-read="${a.id}">${t.markRead}</button>`}
        </article>`,
        )
        .join("") || `<p class="empty">${t.emptyNotes}</p>`}</div>`;
    app.querySelectorAll("[data-read]").forEach((b) =>
      b.addEventListener("click", async () => {
        const data = await api(`/announcements/${b.dataset.read}/read`, { method: "POST", body: {} });
        state.unread = data.unread;
        viewAnnouncements();
      }),
    );
    $("#read-all")?.addEventListener("click", async () => {
      const data = await api("/announcements/read-all", { method: "POST", body: {} });
      state.unread = data.unread;
      viewAnnouncements();
    });
    bindApp();
  }

  async function viewCertificates() {
    const d = await api("/certificates");
    app.innerHTML = `<h1>${t.certs}</h1>
      <div class="cards">${d.items
        .map(
          (c) => `<article class="card cert-card">
            <small>${esc(c.title)}</small>
            <h3>${esc(c.studentName)}</h3>
            <p>${esc(c.programName)}</p>
            <p>${fmtDate(c.completionDate)} · ${fmtDate(c.issueDate)}</p>
            <div class="cert-code">${esc(c.certificateCode)}</div>
            <p>${statusLabel(c.status)}</p>
            ${
              c.status === "issued"
                ? `<div>
                    <a class="btn btn-primary" href="/api/learner/certificates/${c.id}/pdf">${t.downloadPdf}</a>
                    <a class="btn" href="${esc(c.verificationUrl || `/verify/${c.certificateCode}`)}" target="_blank">${t.verify}</a>
                  </div>`
                : ""
            }
          </article>`,
        )
        .join("") || `<p class="empty">${t.emptyCert}<br>${t.emptyCertHint}</p>`}</div>`;
  }

  async function viewAccount() {
    app.innerHTML = `<h1>${t.account}</h1>
      <form class="card" id="acc" style="max-width:480px">
        <div class="field"><label>${EN ? "Full name" : "Họ tên"}</label><input name="fullName" value="${esc(state.student.fullName)}" /></div>
        <div class="field"><label>Email</label><input value="${esc(state.student.email)}" disabled /></div>
        <div class="field"><label>${EN ? "Phone" : "Điện thoại"}</label><input name="phone" value="${esc(state.student.phone || "")}" /></div>
        <div class="field"><label>${t.language}</label>
          <select name="languagePreference"><option value="vi" ${!EN ? "selected" : ""}>Tiếng Việt</option><option value="en" ${EN ? "selected" : ""}>English</option></select>
        </div>
        <button class="btn btn-primary" type="submit">${t.save}</button>
      </form>
      <form class="card" id="pw" style="max-width:480px;margin-top:16px">
        <h3>${t.changePassword}</h3>
        <div class="field"><label>${t.currentPassword}</label><input name="currentPassword" type="password" required /></div>
        <div class="field"><label>${t.newPassword}</label><input name="newPassword" type="password" minlength="8" required /></div>
        <button class="btn" type="submit">${t.save}</button>
      </form>`;
    $("#acc").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = await api("/me", {
        method: "PUT",
        body: { fullName: fd.get("fullName"), phone: fd.get("phone"), languagePreference: fd.get("languagePreference") },
      });
      state.student = data.student;
      toast(EN ? "Saved" : "Đã lưu");
      if (fd.get("languagePreference") === "en" && !EN) location.href = "/en/student/account";
      if (fd.get("languagePreference") === "vi" && EN) location.href = "/hoc-vien/tai-khoan";
      layout();
    };
    $("#pw").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        await api("/me/password", {
          method: "POST",
          body: { currentPassword: fd.get("currentPassword"), newPassword: fd.get("newPassword") },
        });
        toast(EN ? "Password updated" : "Đã đổi mật khẩu");
        e.target.reset();
      } catch (err) {
        toast(err.message);
      }
    };
  }

  async function viewSupport() {
    const d = await api("/support");
    const c = d.contact || {};
    app.innerHTML = `<h1>${t.support}</h1>
      <div class="card" style="max-width:520px">
        <h3>VSC ACADEMY SUPPORT</h3>
        <p>${esc(c.email || "vscacademy8@gmail.com")}</p>
        <p>${esc(c.phone || "+84888833887")}</p>
        ${c.zalo ? `<p>Zalo: <a href="${esc(c.zalo)}" target="_blank">Zalo</a></p>` : "<p>Zalo: 0888 833 887</p>"}
        <p>${t.supportHours}</p>
        <p><a class="btn btn-primary" href="mailto:${esc(c.email || "vscacademy8@gmail.com")}">${t.contact}</a></p>
      </div>`;
  }

  function bindApp() {
    app.querySelectorAll("[data-href]").forEach((el) =>
      el.addEventListener("click", (e) => {
        e.preventDefault();
        go(el.dataset.href);
      }),
    );
    app.querySelectorAll("[data-join]").forEach((el) =>
      el.addEventListener("click", (e) => {
        e.preventDefault();
        joinMeeting(el.dataset.join);
      }),
    );
  }

  async function render() {
    const { parts, q } = route();
    const publicAuth =
      parts[0] === "dang-nhap" ||
      parts[0] === "login" ||
      parts[0] === "kich-hoat" ||
      parts[0] === "activate" ||
      parts[0] === "quen-mat-khau" ||
      parts[0] === "forgot-password" ||
      parts[0] === "dat-lai-mat-khau" ||
      parts[0] === "reset-password" ||
      q.get("token");
    if (!state.student) {
      const mode =
        parts[0] === "kich-hoat" || parts[0] === "activate"
          ? "activate"
          : parts[0] === "quen-mat-khau" || parts[0] === "forgot-password"
            ? "forgot"
            : parts[0] === "dat-lai-mat-khau" || parts[0] === "reset-password"
              ? "reset"
              : "login";
      return showAuth(mode);
    }
    $("#auth").classList.add("hidden");
    $("#shell").classList.remove("hidden");
    layout();
    app.innerHTML = `<p class="empty">…</p>`;
    try {
      if (!parts.length) return viewHome();
      if ((parts[0] === "khoa-hoc" || parts[0] === "courses") && parts[1]) return viewCourse(parts[1]);
      if (parts[0] === "khoa-hoc" || parts[0] === "courses") return viewCourses();
      if (parts[0] === "lich-hoc" || parts[0] === "schedule") return viewSchedule();
      if (parts[0] === "tai-lieu" || parts[0] === "materials") return viewMaterials();
      if (parts[0] === "thong-bao" || parts[0] === "announcements") return viewAnnouncements();
      if (parts[0] === "chung-nhan" || parts[0] === "certificates") return viewCertificates();
      if (parts[0] === "tai-khoan" || parts[0] === "account") return viewAccount();
      if (parts[0] === "ho-tro" || parts[0] === "support") return viewSupport();
      if (publicAuth) return viewHome();
      return viewHome();
    } catch (err) {
      if (err.message !== "Unauthorized") app.innerHTML = `<p class="empty">${esc(err.message)}</p>`;
    }
  }

  $("#menu-btn").onclick = () => document.querySelector(".sidebar").classList.toggle("open");
  $("#side-logout").onclick = logout;

  (async () => {
    try {
      const me = await fetch("/api/learner/me", { credentials: "include" }).then((r) => (r.ok ? r.json() : null));
      if (me?.student) {
        state.student = me.student;
        state.unread = me.unread || 0;
      }
    } catch {}
    render();
  })();
})();
