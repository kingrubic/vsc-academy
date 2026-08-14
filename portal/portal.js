(() => {
  const EN = location.pathname.startsWith("/en/student");
  const BASE = EN ? "/en/student" : "/hoc-vien";
  const t = EN
    ? {
        portal: "LEARNER PORTAL",
        login: "Sign in",
        loginLead: "Continue your learning at VSC Academy.",
        email: "EMAIL",
        password: "PASSWORD",
        submit: "SIGN IN",
        activate: "Activate account",
        activateLead: "Choose a password to open your portal.",
        newPassword: "NEW PASSWORD",
        hello: "Hello",
        continue: "Continue your learning journey at VSC Academy.",
        next: "NEXT CLASS",
        join: "JOIN CLASS",
        details: "VIEW DETAILS",
        myCourses: "MY COURSES",
        viewAll: "View all",
        announcements: "ANNOUNCEMENTS",
        materials: "NEW MATERIALS",
        enter: "OPEN COURSE",
        dashboard: "Dashboard",
        courses: "My courses",
        schedule: "Schedule",
        files: "Materials",
        notes: "Announcements",
        account: "Account",
        support: "Support",
        active: "In progress",
        done: "Completed",
        overview: "Overview",
        classSchedule: "Schedule",
        classInfo: "Class info",
        meet: "JOIN GOOGLE MEET",
        map: "VIEW MAP",
        before: "BEFORE CLASS",
        during: "DURING THE COURSE",
        after: "AFTER CLASS",
        open: "OPEN",
        download: "DOWNLOAD",
        cert: "Certificate is being prepared",
        empty: "Nothing here yet.",
        logout: "Sign out",
        save: "Save",
        markRead: "Mark as read",
        contact: "CONTACT VSC ACADEMY",
        issue: "REPORT AN ISSUE",
        upcoming: "Upcoming",
        live: "Live now",
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
        replay: "WATCH AGAIN",
      }
    : {
        portal: "CỔNG HỌC VIÊN",
        login: "Đăng nhập",
        loginLead: "Tiếp tục hành trình học tập tại VSC Academy.",
        email: "EMAIL",
        password: "MẬT KHẨU",
        submit: "ĐĂNG NHẬP",
        activate: "Kích hoạt tài khoản",
        activateLead: "Tạo mật khẩu để vào cổng học viên.",
        newPassword: "MẬT KHẨU MỚI",
        hello: "Xin chào",
        continue: "Tiếp tục hành trình học tập của bạn tại VSC Academy.",
        next: "LỚP TIẾP THEO",
        join: "VÀO LỚP",
        details: "XEM CHI TIẾT",
        myCourses: "KHÓA HỌC CỦA TÔI",
        viewAll: "Xem tất cả",
        announcements: "THÔNG BÁO MỚI",
        materials: "TÀI LIỆU MỚI",
        enter: "VÀO KHÓA HỌC",
        dashboard: "Tổng quan",
        courses: "Khóa học của tôi",
        schedule: "Lịch học",
        files: "Tài liệu",
        notes: "Thông báo",
        account: "Tài khoản",
        support: "Hỗ trợ",
        active: "Đang học",
        done: "Đã hoàn thành",
        overview: "Tổng quan",
        classSchedule: "Lịch học",
        classInfo: "Thông tin lớp",
        meet: "VÀO GOOGLE MEET",
        map: "XEM BẢN ĐỒ",
        before: "TRƯỚC BUỔI HỌC",
        during: "TRONG KHÓA HỌC",
        after: "SAU BUỔI HỌC",
        open: "XEM",
        download: "TẢI XUỐNG",
        cert: "Chứng nhận đang được cập nhật",
        empty: "Chưa có nội dung.",
        logout: "Đăng xuất",
        save: "Lưu",
        markRead: "Đánh dấu đã đọc",
        contact: "LIÊN HỆ VSC ACADEMY",
        issue: "BÁO VẤN ĐỀ",
        upcoming: "Sắp diễn ra",
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
        replay: "XEM LẠI",
      };

  const NAV = [
    ["home", t.dashboard],
    ["courses", t.courses],
    ["schedule", t.schedule],
    ["materials", t.files],
    ["announcements", t.notes],
    ["account", t.account],
    ["support", t.support],
  ];
  const state = { student: null, unread: 0 };
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
  function countdown(date, time) {
    if (!date || !time) return "";
    const ms = new Date(`${date}T${time}:00+07:00`).getTime() - Date.now();
    if (ms <= 0 || Number.isNaN(ms)) return "";
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    if (days > 0) return EN ? `In ${days}d ${hours}h` : `Còn ${days} ngày ${hours} giờ`;
    return EN ? `In ${hours}h ${mins}m` : `Còn ${hours} giờ ${mins} phút`;
  }
  function otherLocaleHref() {
    const { parts } = route();
    const viToEn = {
      "khoa-hoc": "courses",
      "lich-hoc": "schedule",
      "tai-lieu": "materials",
      "thong-bao": "announcements",
      "tai-khoan": "account",
      "ho-tro": "support",
      "dang-nhap": "login",
      "kich-hoat": "activate",
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
      "tai-khoan": "account",
      account: "account",
      "ho-tro": "support",
      support: "support",
    };
    return map[parts[0]] || "home";
  }
  function statusLabel(s) {
    return t[s] || s;
  }
  async function api(path, opts = {}) {
    const res = await fetch(`/api/learner${path}${path.includes("?") ? "&" : "?"}locale=${EN ? "en" : "vi"}`, {
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
  document.body.addEventListener("click", (e) => {
    const a = e.target.closest("[data-nav]");
    if (!a) return;
    e.preventDefault();
    const key = a.dataset.nav;
    const map = {
      home: "/",
      courses: "/khoa-hoc",
      schedule: "/lich-hoc",
      materials: "/tai-lieu",
      announcements: "/thong-bao",
      account: "/tai-khoan",
      support: "/ho-tro",
    };
    if (EN) {
      Object.assign(map, {
        courses: "/courses",
        schedule: "/schedule",
        materials: "/materials",
        announcements: "/announcements",
        account: "/account",
        support: "/support",
      });
    }
    if (a.dataset.href) return go(a.dataset.href);
    go(map[key] || "/");
    document.querySelector(".sidebar")?.classList.remove("open");
  });
  window.addEventListener("popstate", render);

  function layout() {
    const navKey = currentNav();
    $("#brand-sub").textContent = t.portal;
    $("#nav").innerHTML = NAV.map(
      ([key, label]) => `<a data-nav="${key}" class="${key === navKey ? "active" : ""}">${label}</a>`,
    ).join("");
    $("#bottom-nav").innerHTML = NAV.slice(0, 5)
      .map(([key, label]) => `<a data-nav="${key}" class="${key === navKey ? "active" : ""}">${label}</a>`)
      .join("");
    $("#who-name").textContent = state.student.fullName;
    $("#avatar").textContent = state.student.fullName.slice(0, 2).toUpperCase();
    $("#unread-dot").classList.toggle("hidden", !state.unread);
    $("#lang-switch").innerHTML = EN
      ? `<a href="${otherLocaleHref()}">${t.langVi}</a><span>EN</span>`
      : `<span>VI</span><a href="${otherLocaleHref()}">${t.langEn}</a>`;
    document.documentElement.lang = EN ? "en" : "vi";
  }

  function showAuth(mode) {
    $("#shell").classList.add("hidden");
    const auth = $("#auth");
    auth.classList.remove("hidden");
    const token = new URLSearchParams(location.search).get("token");
    const activate = mode === "activate" || location.pathname.includes("kich-hoat") || location.pathname.includes("activate") || token;
    auth.innerHTML = activate
      ? `<form class="auth-card" id="activate-form">
          <img src="/assets/logo-vsc-academy-white.png" alt="VSC Academy" />
          <h1>${t.activate}</h1>
          <p>${t.activateLead}</p>
          <label>${t.newPassword}</label>
          <input name="password" type="password" minlength="8" required />
          <p class="auth-error" id="auth-error"></p>
          <button type="submit">${t.activate}</button>
        </form>`
      : `<form class="auth-card" id="login-form">
          <img src="/assets/logo-vsc-academy-white.png" alt="VSC Academy" />
          <h1>${t.login}</h1>
          <p>${t.loginLead}</p>
          <label>${t.email}</label>
          <input name="email" type="email" required />
          <label>${t.password}</label>
          <input name="password" type="password" required />
          <p class="auth-error" id="auth-error"></p>
          <button type="submit">${t.submit}</button>
        </form>`;
    $("#login-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const fd = new FormData(e.target);
        const data = await api("/login", { method: "POST", body: { email: fd.get("email"), password: fd.get("password") } });
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
  }

  function courseCard(enr) {
    const p = enr.progress || { percent: 0, completed: 0, total: 0 };
    const href = EN ? `/courses/${enr.id}` : `/khoa-hoc/${enr.id}`;
    return `<article class="card">
      <small>${esc(enr.session?.name || "")}</small>
      <h3>${esc(enr.program?.name || "")}</h3>
      <div class="progress"><i style="width:${p.percent}%"></i></div>
      <small>${p.completed} / ${p.total} ${t.sessions}</small>
      <p>${enr.nextMeeting ? `${fmtDate(enr.nextMeeting.date)} · ${enr.nextMeeting.startTime}` : statusLabel(enr.status)}</p>
      <button class="btn" data-href="${href}">${t.enter} →</button>
    </article>`;
  }

  async function viewHome() {
    const d = await api("/dashboard");
    state.unread = d.unread || 0;
    $("#unread-dot").classList.toggle("hidden", !state.unread);
    const next = d.nextClass;
    const joinUrl = next?.session?.meetingUrl || next?.nextMeeting?.meetingUrl;
    app.innerHTML = `
      <section class="welcome">
        <h1>${t.hello}, ${esc(state.student.fullName)}</h1>
        <p>${t.continue}</p>
      </section>
      ${
        next
          ? `<section class="next-card">
              <small>${t.next}</small>
              <h2>${esc(next.program?.name || "")}</h2>
              <div class="meta">${fmtDate(next.nextMeeting?.date)} · ${esc(next.nextMeeting?.startTime)}–${esc(next.nextMeeting?.endTime)}</div>
              <div class="meta">${esc(next.session?.format === "offline" ? next.venue?.name || "" : next.session?.onlinePlatform || "Google Meet")}</div>
              ${countdown(next.nextMeeting?.date, next.nextMeeting?.startTime) ? `<div class="meta">${countdown(next.nextMeeting.date, next.nextMeeting.startTime)}</div>` : ""}
              ${joinUrl ? `<a class="btn-light" href="${esc(joinUrl)}" target="_blank" rel="noopener">${t.join}</a>` : `<button class="btn-light" data-href="${EN ? `/courses/${next.id}` : `/khoa-hoc/${next.id}`}">${t.details}</button>`}
            </section>`
          : `<p class="empty">${t.empty}</p>`
      }
      <div class="section-title"><h3>${t.myCourses}</h3><a data-nav="courses">${t.viewAll}</a></div>
      <div class="cards">${d.enrollments.map(courseCard).join("") || `<p class="empty">${t.empty}</p>`}</div>
      <div class="section-title" style="margin-top:28px"><h3>${t.announcements}</h3><a data-nav="announcements">${t.viewAll}</a></div>
      <div class="list">${d.announcements.map((a) => `<article class="item"><small>${fmtDate(a.publishedAt)} · ${esc(a.priority)} · ${t.author}</small><b>${esc(a.title)}</b><p>${esc(a.content)}</p></article>`).join("") || `<p class="empty">${t.empty}</p>`}</div>
      <div class="section-title" style="margin-top:28px"><h3>${t.materials}</h3><a data-nav="materials">${t.viewAll}</a></div>
      <div class="list">${d.materials.map((m) => materialRow(m)).join("") || `<p class="empty">${t.empty}</p>`}</div>
    `;
    bindHrefs();
  }

  function materialRow(m) {
    const file = `/api/learner/materials/${m.id}/file`;
    return `<article class="item">
      <small>${esc(m.type).toUpperCase()} · ${fmtDate(m.publishedAt)}</small>
      <b>${esc(m.title)}</b>
      <p>${esc(m.description)}</p>
      <div>${m.externalUrl || m.hasFile ? `<a class="btn" href="${m.externalUrl || file}" target="_blank" rel="noopener">${t.open}</a>` : ""} ${m.downloadable && m.hasFile && !m.externalUrl ? `<a class="btn" href="${file}" target="_blank" rel="noopener">${t.download}</a>` : ""}</div>
    </article>`;
  }

  async function viewCourses() {
    const d = await api("/enrollments");
    const active = d.items.filter((x) => x.status !== "completed" && x.status !== "cancelled");
    const done = d.items.filter((x) => x.status === "completed");
    app.innerHTML = `<h1>${t.courses}</h1>
      <h3 style="margin:18px 0 10px">${t.active}</h3>
      <div class="cards">${active.map(courseCard).join("") || `<p class="empty">${t.empty}</p>`}</div>
      <h3 style="margin:24px 0 10px">${t.done}</h3>
      <div class="cards">${done.map(courseCard).join("") || `<p class="empty">${t.empty}</p>`}</div>`;
    bindHrefs();
  }

  async function viewCourse(id) {
    const d = await api(`/enrollments/${id}`);
    const e = d.enrollment;
    const tab = new URLSearchParams(location.search).get("tab") || "overview";
    const p = e.progress || {};
    const joinUrl = e.session?.meetingUrl || e.nextMeeting?.meetingUrl;
    const tabs = [
      ["overview", t.overview],
      ["schedule", t.classSchedule],
      ["materials", t.files],
      ["announcements", t.notes],
      ["info", t.classInfo],
    ];
    app.innerHTML = `
      <header class="welcome">
        <small>${esc(e.session?.name || "")}</small>
        <h1>${esc(e.program?.name || "")}</h1>
        <p>${esc(e.instructor?.name || "")} · ${p.completed || 0} / ${p.total || 0} ${t.sessions}</p>
        <div class="progress" style="max-width:280px"><i style="width:${p.percent || 0}%"></i></div>
      </header>
      <div class="tabs">${tabs.map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? "active" : ""}">${l}</button>`).join("")}</div>
      <div id="pane"></div>`;
    const pane = $("#pane");
    const show = (k) => {
      app.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("active", b.dataset.tab === k));
      if (k === "overview") {
        pane.innerHTML = `
          <p>${esc(e.program?.description || "")}</p>
          ${e.instructor ? `<div class="card instructor-card" style="margin:16px 0">${e.instructor.photo ? `<img class="instructor-photo" src="${esc(e.instructor.photo)}" alt="">` : ""}<div><small>${esc(e.instructor.title || "")} · ${esc(e.instructor.role || "")}</small><h3>${esc(e.instructor.name)}</h3><p>${esc(e.instructor.bio || "")}</p></div></div>` : ""}
          ${e.nextMeeting ? `<p><b>${t.next}:</b> ${fmtDate(e.nextMeeting.date)} · ${esc(e.nextMeeting.startTime)}</p>` : ""}
          ${e.session?.format === "offline" && e.venue
            ? `<div class="card"><h3>${esc(e.venue.name)}</h3><p>${esc(e.venue.address)}</p>${e.venue.mapUrl ? `<a class="btn" href="${esc(e.venue.mapUrl)}" target="_blank">${t.map}</a>` : ""}</div>`
            : joinUrl
              ? `<p><a class="btn btn-primary" href="${esc(joinUrl)}" target="_blank">${t.meet}</a></p>`
              : ""}
          ${e.certificate ? `<div class="card"><h3>CHỨNG NHẬN</h3><p>${t.cert}</p></div>` : ""}
          <p><a class="btn" data-nav="support">${t.contact}</a></p>`;
      } else if (k === "schedule") {
        pane.innerHTML = `<div class="list">${d.meetings
          .map(
            (m, i) => `<article class="item">
              <small>BUỔI ${String(i + 1).padStart(2, "0")} · ${statusLabel(m.status)}</small>
              <b>${esc(m.title)}</b>
              <p>${fmtDate(m.date)} · ${esc(m.startTime)}–${esc(m.endTime)} · ${statusLabel(m.attendance || "not_recorded")}</p>
              ${m.meetingUrl ? `<a class="btn" href="${esc(m.meetingUrl)}" target="_blank">${t.join}</a>` : ""}
              ${m.recordingUrl ? `<a class="btn-ghost" href="${esc(m.recordingUrl)}" target="_blank">${t.replay} →</a>` : ""}
            </article>`,
          )
          .join("")}</div>`;
      } else if (k === "materials") {
        const groups = { before: [], during: [], after: [] };
        d.materials.forEach((m) => (groups[m.phase] || groups.during).push(m));
        pane.innerHTML = ["before", "during", "after"]
          .map((phase) => `<h3 style="margin:16px 0 8px">${t[phase]}</h3>${groups[phase].map(materialRow).join("") || `<p class="empty">${t.empty}</p>`}`)
          .join("");
      } else if (k === "announcements") {
        pane.innerHTML = `<div class="list">${d.announcements.map((a) => `<article class="item"><small>${fmtDate(a.publishedAt)}</small><b>${esc(a.title)}</b><p>${esc(a.content)}</p></article>`).join("") || `<p class="empty">${t.empty}</p>`}</div>`;
      } else {
        pane.innerHTML = `
          <div class="card">
            <p><b>${esc(e.program?.name)}</b></p>
            <p>${esc(e.session?.name)} · ${fmtDate(e.session?.startDate)}</p>
            <p>${esc(e.program?.duration || "")}</p>
            ${d.support?.email ? `<p>${esc(d.support.email)}</p>` : ""}
            ${d.support?.phone ? `<p>${esc(d.support.phone)}</p>` : ""}
          </div>`;
      }
    };
    show(tab);
    app.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => show(b.dataset.tab)));
  }

  async function viewSchedule() {
    const d = await api("/schedule");
    app.innerHTML = `<h1>${t.schedule}</h1><div class="list">${d.items
      .map(
        (m) => `<article class="item">
          <small>${statusLabel(m.status)} · ${esc(m.sessionName || "")}</small>
          <b>${esc(m.title)}</b>
          <p>${fmtDate(m.date)} · ${esc(m.startTime)}–${esc(m.endTime)}</p>
          ${m.meetingUrl ? `<a class="btn btn-primary" href="${esc(m.meetingUrl)}" target="_blank">${t.join}</a>` : ""}
        </article>`,
      )
      .join("") || `<p class="empty">${t.empty}</p>`}</div>`;
  }

  async function viewMaterials() {
    const d = await api("/materials");
    const groups = { before: [], during: [], after: [] };
    d.items.forEach((m) => (groups[m.phase] || groups.during).push(m));
    app.innerHTML = `<h1>${t.files}</h1>${["before", "during", "after"]
      .map((phase) => `<h3 style="margin:18px 0 8px">${t[phase]}</h3><div class="list">${groups[phase].map(materialRow).join("") || `<p class="empty">${t.empty}</p>`}</div>`)
      .join("")}`;
  }

  async function viewAnnouncements() {
    const d = await api("/announcements");
    state.unread = d.unread || 0;
    $("#unread-dot").classList.toggle("hidden", !state.unread);
    app.innerHTML = `<h1>${t.announcements}</h1><div class="list">${d.items
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
      .join("") || `<p class="empty">${t.empty}</p>`}</div>`;
    app.querySelectorAll("[data-read]").forEach((b) =>
      b.addEventListener("click", async () => {
        const data = await api(`/announcements/${b.dataset.read}/read`, { method: "POST", body: {} });
        state.unread = data.unread;
        viewAnnouncements();
      }),
    );
  }

  async function viewAccount() {
    app.innerHTML = `<h1>${t.account}</h1>
      <form class="card" id="acc" style="max-width:480px">
        <div class="field"><label>${EN ? "Full name" : "Họ tên"}</label><input name="fullName" value="${esc(state.student.fullName)}" /></div>
        <div class="field"><label>Email</label><input value="${esc(state.student.email)}" disabled /></div>
        <div class="field"><label>${EN ? "Phone" : "Điện thoại"}</label><input name="phone" value="${esc(state.student.phone || "")}" /></div>
        <button class="btn btn-primary" type="submit">${t.save}</button>
        <button class="btn-ghost" type="button" id="logout">${t.logout}</button>
      </form>`;
    $("#acc").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = await api("/me", { method: "PUT", body: { fullName: fd.get("fullName"), phone: fd.get("phone"), languagePreference: EN ? "en" : "vi" } });
      state.student = data.student;
      toast(EN ? "Saved" : "Đã lưu");
      layout();
    };
    $("#logout").onclick = async () => {
      await api("/logout", { method: "POST", body: {} });
      state.student = null;
      showAuth();
    };
  }

  async function viewSupport() {
    const d = await api("/support");
    const c = d.contact || {};
    app.innerHTML = `<h1>${t.support}</h1>
      <div class="card" style="max-width:520px">
        <h3>VSC Academy Support</h3>
        <p>${esc(c.email || "vscacademy8@gmail.com")}</p>
        <p>${esc(c.phone || "+84888833887")}</p>
        ${c.zalo ? `<p><a href="${esc(c.zalo)}" target="_blank">Zalo</a></p>` : ""}
        <p><a class="btn btn-primary" href="mailto:${esc(c.email || "vscacademy8@gmail.com")}">${t.contact}</a></p>
        <p><a class="btn" href="mailto:${esc(c.email || "vscacademy8@gmail.com")}?subject=Bao%20van%20de">${t.issue}</a></p>
      </div>`;
  }

  function bindHrefs() {
    app.querySelectorAll("[data-href]").forEach((el) =>
      el.addEventListener("click", (e) => {
        e.preventDefault();
        go(el.dataset.href);
      }),
    );
  }

  async function render() {
    const { parts, q } = route();
    const loginPath = parts[0] === "dang-nhap" || parts[0] === "login";
    const activatePath = parts[0] === "kich-hoat" || parts[0] === "activate" || q.get("token");
    if (!state.student) return showAuth(activatePath ? "activate" : loginPath ? "login" : "login");
    $("#auth").classList.add("hidden");
    $("#shell").classList.remove("hidden");
    layout();
    app.innerHTML = `<p class="empty">…</p>`;
    try {
      if (!parts.length) return viewHome();
      if (parts[0] === "khoa-hoc" && parts[1]) return viewCourse(parts[1]);
      if (parts[0] === "courses" && parts[1]) return viewCourse(parts[1]);
      if (parts[0] === "khoa-hoc" || parts[0] === "courses") return viewCourses();
      if (parts[0] === "lich-hoc" || parts[0] === "schedule") return viewSchedule();
      if (parts[0] === "tai-lieu" || parts[0] === "materials") return viewMaterials();
      if (parts[0] === "thong-bao" || parts[0] === "announcements") return viewAnnouncements();
      if (parts[0] === "tai-khoan" || parts[0] === "account") return viewAccount();
      if (parts[0] === "ho-tro" || parts[0] === "support") return viewSupport();
      return viewHome();
    } catch (err) {
      if (err.message !== "Unauthorized") app.innerHTML = `<p class="empty">${esc(err.message)}</p>`;
    }
  }

  $("#menu-btn").onclick = () => document.querySelector(".sidebar").classList.toggle("open");

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
