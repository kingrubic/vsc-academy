(() => {
  const SESSION_LABEL = {
    draft: "Nháp",
    open: "Đang mở đăng ký",
    upcoming: "Sắp mở",
    limited: "Sắp hết chỗ",
    full: "Đã đầy",
    completed: "Đã hoàn thành",
    cancelled: "Đã hủy",
  };
  const REG_LABEL = {
    new: "Mới",
    contacted: "Đã liên hệ",
    pending_payment: "Chờ thanh toán",
    paid: "Đã thanh toán",
    confirmed: "Đã xác nhận",
    waitlist: "Danh sách chờ",
    cancelled: "Đã hủy",
    completed: "Đã hoàn thành",
  };
  const LANG_LABEL = {
    not_created: "Chưa tạo",
    ai_draft: "Nháp AI",
    review: "Chờ duyệt",
    published: "Đã xuất bản",
    draft: "Nháp",
    hidden: "Đã ẩn",
  };
  const LEVEL_LABEL = {
    beginner: "Bắt đầu",
    foundation: "Nền tảng",
    advanced: "Nâng cao",
    workshop: "Hội thảo",
  };
  const FORMAT_LABEL = { online: "Trực tuyến", offline: "Trực tiếp", hybrid: "Kết hợp" };
  const TYPE_LABEL = { course: "Khóa học", workshop: "Hội thảo" };
  const FACULTY_ROLE = { lead: "Phụ trách", instructor: "Giảng viên", guest: "Khách mời" };
  const STUDENT_LABEL = { invited: "Đã mời", active: "Đang học", inactive: "Ngưng", suspended: "Tạm khóa" };
  const ENROLL_LABEL = { active: "Đang học", completed: "Đã hoàn thành", paused: "Tạm dừng", cancelled: "Đã hủy" };
  const PAY_LABEL = { unpaid: "Chưa thanh toán", pending: "Chờ thanh toán", paid: "Đã thanh toán", refunded: "Đã hoàn tiền" };
  const ATT_LABEL = { not_recorded: "Chưa ghi", present: "Có mặt", absent: "Vắng", excused: "Có phép" };
  const CERT_LABEL = {
    none: "Chưa có",
    eligible: "Đủ điều kiện",
    issued: "Đã cấp",
    revoked: "Đã thu hồi",
    reissued: "Đã cấp lại",
    pending: "Chờ duyệt",
  };
  const PRIORITY_LABEL = { normal: "Thường", important: "Quan trọng", urgent: "Khẩn" };
  const TARGET_LABEL = { all: "Tất cả", program: "Khóa học", session: "Lớp học", student: "Học viên", meeting: "Buổi học" };
  const MATERIAL_TYPE = {
    slide: "Bài trình chiếu",
    pdf: "PDF",
    template: "Mẫu",
    prompt: "Prompt",
    worksheet: "Bài tập",
    video: "Video",
    recording: "Bản ghi",
    link: "Liên kết",
    other: "Khác",
  };
  const VISIBILITY_LABEL = { program: "Theo khóa", session: "Theo lớp", meeting: "Theo buổi", students: "Học viên cụ thể" };
  const PHASE_LABEL = { before: "Trước buổi", during: "Trong khóa", after: "Sau buổi" };
  const ACCESS_LABEL = { public: "Công khai", registration: "Cần đăng ký", private: "Nội bộ" };
  const ROLE_LABEL = { OWNER: "Chủ sở hữu", ADMIN: "Quản trị", EDITOR: "Biên tập", INSTRUCTOR: "Giảng viên" };
  const YES_NO = [["1", "Có"], ["0", "Không"]];
  const INSTRUCTOR_SEGS = new Set(["", "login", "change-password", "dat-lai-mat-khau", "sessions", "students", "materials", "announcements"]);

  const state = { user: null, cache: {} };
  const $ = (s, el = document) => el.querySelector(s);
  const app = $("#app");
  const toastEl = $("#toast");

  function toast(msg, error) {
    toastEl.textContent = msg;
    toastEl.classList.toggle("error", !!error);
    toastEl.classList.add("show");
    setTimeout(() => toastEl.classList.remove("show"), 2800);
  }

  async function api(path, opts = {}) {
    const res = await fetch(`/api/admin${path}`, {
      credentials: "include",
      headers: opts.body instanceof FormData ? {} : { "Content-Type": "application/json" },
      ...opts,
      body: opts.body instanceof FormData ? opts.body : opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (res.status === 401 && path !== "/login") {
      state.user = null;
      history.replaceState({}, "", href("/login"));
      render();
      throw new Error("Phiên đăng nhập đã hết hạn");
    }
    const text = await res.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(res.ok ? "Phản hồi máy chủ không hợp lệ" : "Không gọi được API. Tải lại trang rồi thử lại.");
    }
    if (res.status === 403 && data.code === "MUST_CHANGE_PASSWORD") {
      if (state.user) state.user.mustChangePassword = true;
      render();
      throw new Error(data.error || "Cần đổi mật khẩu trước khi tiếp tục");
    }
    if (!res.ok) throw new Error(data.error || res.statusText);
    return data;
  }

  function isInstructorPortal() {
    return location.pathname.startsWith("/giang-vien");
  }
  function portalBase() {
    return isInstructorPortal() ? "/giang-vien" : "/admin";
  }
  function href(p = "/") {
    const rest = !p || p === "/" ? "" : p.startsWith("/") ? p : `/${p}`;
    return portalBase() + rest;
  }
  function path() {
    return location.pathname.replace(/\/$/, "") || portalBase();
  }
  function parts() {
    return path().split("/").filter(Boolean);
  }
  function segs() {
    const p = parts();
    if (p[0] === "admin" || p[0] === "giang-vien") return p.slice(1);
    return p;
  }
  function isInstructor() {
    return state.user?.role === "INSTRUCTOR";
  }
  function canManageStaff() {
    return ["OWNER", "ADMIN"].includes(state.user?.role);
  }
  function homeFor(user) {
    return user?.role === "INSTRUCTOR" ? "/giang-vien" : "/admin";
  }
  function applyChrome() {
    const instructor = isInstructorPortal() || isInstructor();
    document.title = instructor ? "VSC Academy | Giảng viên" : "VSC Academy | Quản trị";
    const brand = document.querySelector(".brand");
    if (brand) brand.setAttribute("href", href("/"));
    const sub = document.querySelector(".brand small");
    if (sub) sub.textContent = instructor ? "CỔNG GIẢNG VIÊN" : "QUẢN TRỊ CMS";
    const loginTitle = $("#login-title");
    const loginLead = $("#login-lead");
    if (loginTitle) loginTitle.textContent = instructor ? "Giảng viên" : "Quản trị";
    if (loginLead) {
      loginLead.textContent = instructor
        ? "Đăng nhập để xem lớp, điểm danh, tài liệu và thông báo học viên."
        : "Đăng nhập để quản trị khóa học, lịch khai giảng và đăng ký.";
    }
  }
  function destForUser(user) {
    const want = homeFor(user);
    let storedNext = "";
    try {
      storedNext = sessionStorage.getItem("vsc_staff_next") || "";
    } catch {
      storedNext = "";
    }
    if (user.mustChangePassword) return `${want}/change-password`;
    const fromNext = applyStoredNext(user, storedNext);
    if (fromNext) {
      try {
        sessionStorage.removeItem("vsc_staff_next");
      } catch {
        /* ignore */
      }
      return fromNext;
    }
    const first = segs()[0] || "";
    const rest = path().replace(/^\/(admin|giang-vien)/, "") || "";
    if (user.role === "INSTRUCTOR" && !INSTRUCTOR_SEGS.has(first)) return want;
    if (first === "login") return want;
    if (portalBase() === want) return path() + location.search;
    return want + rest + location.search;
  }
  function applyStoredNext(user, raw) {
    if (!raw || !raw.startsWith("/") || raw.startsWith("//") || /[a-z]+:/i.test(raw)) return "";
    const pathOnly = raw.split("?")[0];
    if (!pathOnly.startsWith("/admin") && !pathOnly.startsWith("/giang-vien")) return "";
    const parts = pathOnly.replace(/\/+$/, "").split("/").filter(Boolean);
    if (parts[0] === "admin" || parts[0] === "giang-vien") parts.shift();
    const first = parts[0] || "";
    const rest = parts.length ? `/${parts.join("/")}` : "";
    const qs = raw.includes("?") ? raw.slice(raw.indexOf("?")) : "";
    if (!first || first === "login" || first === "change-password" || first === "dat-lai-mat-khau") return "";
    if (user.role === "INSTRUCTOR" && !INSTRUCTOR_SEGS.has(first)) return "";
    return homeFor(user) + rest + qs;
  }
  function captureNext() {
    const first = segs()[0] || "";
    if (!first || first === "login" || first === "change-password" || first === "dat-lai-mat-khau") return;
    try {
      sessionStorage.setItem("vsc_staff_next", path() + location.search);
    } catch {
      /* ignore */
    }
  }
  function fmtPrice(n) {
    return `${String(n || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}đ`;
  }
  function fmtDate(d) {
    if (!d) return "—";
    return String(d).slice(0, 10).split("-").reverse().join("/");
  }
  function labelOf(...maps) {
    return (key) => {
      for (const map of maps) {
        if (key != null && map[key] != null) return map[key];
      }
      return key || "—";
    };
  }
  const statusText = labelOf(
    SESSION_LABEL,
    REG_LABEL,
    LANG_LABEL,
    STUDENT_LABEL,
    ENROLL_LABEL,
    PAY_LABEL,
    ATT_LABEL,
    CERT_LABEL,
    PRIORITY_LABEL,
    TARGET_LABEL,
    MATERIAL_TYPE,
    VISIBILITY_LABEL,
    PHASE_LABEL,
    ACCESS_LABEL,
    FORMAT_LABEL,
    TYPE_LABEL,
    LEVEL_LABEL,
  );
  function badge(status) {
    return `<span class="badge ${status || ""}">${esc(statusText(status))}</span>`;
  }
  function langDot(status) {
    return `<span class="dot ${status === "published" ? "on" : "off"}"></span>${LANG_LABEL[status] || statusText(status)}`;
  }
  function opts(map, selected) {
    return Object.entries(map)
      .map(([k, l]) => `<option value="${esc(k)}" ${String(selected) === String(k) ? "selected" : ""}>${esc(l)}</option>`)
      .join("");
  }
  function optList(pairs, selected) {
    return pairs
      .map(([k, l]) => `<option value="${esc(k)}" ${String(selected) === String(k) ? "selected" : ""}>${esc(l)}</option>`)
      .join("");
  }
  function confirmAction(message) {
    return window.confirm(message);
  }
  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }
  function val(form, name) {
    const el = form.elements[name];
    if (!el) return undefined;
    if (el.type === "checkbox") return el.checked;
    return el.value;
  }
  function go(href) {
    history.pushState({}, "", href);
    render();
  }
  document.body.addEventListener("click", (e) => {
    const a = e.target.closest("a[href^='/admin'], a[href^='/giang-vien']");
    if (!a || e.metaKey || e.ctrlKey) return;
    if (a.getAttribute("target") === "_blank") return;
    e.preventDefault();
    go(a.getAttribute("href"));
  });
  window.addEventListener("popstate", render);

  function navItems() {
    if (isInstructor()) {
      return [
        ["Tổng quan", href("/")],
        ["Lớp học", href("/sessions")],
        ["Học viên", href("/students")],
        ["Tài liệu", href("/materials")],
        ["Thông báo", href("/announcements")],
      ];
    }
    return [
      ["Tổng quan", href("/")],
      ["Khóa học", href("/programs")],
      ["Lớp học", href("/sessions")],
      ["Đăng ký", href("/registrations")],
      ["Học viên", href("/students")],
      ["Ghi danh", href("/enrollments")],
      ["Tài liệu", href("/materials")],
      ["Thông báo", href("/announcements")],
      ["Chứng nhận", href("/certificates")],
      ["Mẫu chứng nhận", href("/certificate-templates")],
      ["Giảng viên", href("/instructors")],
      ["Góc chia sẻ", href("/insights")],
      ["Tài liệu chuyên môn", href("/resources")],
      ["Thư viện ảnh", href("/media")],
      ["Địa điểm", href("/venues")],
      ["Cài đặt", href("/settings")],
    ];
  }
  function layout() {
    const items = navItems();
    $("#nav").innerHTML = items
      .map(([label, itemHref]) => {
        const active = itemHref === href("/") ? path() === portalBase() : path().startsWith(itemHref);
        return `<a href="${itemHref}" class="${active ? "active" : ""}">${label}</a>`;
      })
      .join("");
    $("#who").textContent = `${state.user.name} · ${ROLE_LABEL[state.user.role] || state.user.role}`;
    applyChrome();
  }

  function table(headers, rows, empty = "Không có dữ liệu") {
    if (!rows.length) return `<div class="card"><p class="empty">${empty}</p></div>`;
    return `<div class="card"><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
  }

  async function viewDashboard() {
    $("#page-title").textContent = "Tổng quan";
    const d = await api("/dashboard");
    const s = d.stats;
    const instructor = isInstructor();
    const stats = instructor
      ? `<div class="stats">
        <div class="stat"><b>${s.upcoming}</b><span>Lớp sắp khai giảng</span></div>
        <div class="stat"><b>${s.openReg}</b><span>Lớp đang mở</span></div>
        <div class="stat"><b>${s.learners}</b><span>Học viên</span></div>
      </div>`
      : `<div class="stats">
        <div class="stat"><b>${s.programs}</b><span>Chương trình</span></div>
        <div class="stat"><b>${s.upcoming}</b><span>Lớp sắp khai giảng</span></div>
        <div class="stat"><b>${s.openReg}</b><span>Lớp đang mở đăng ký</span></div>
        <div class="stat"><b>${s.registrations}</b><span>Tổng đăng ký</span></div>
        <div class="stat"><b>${s.newRegs}</b><span>Đăng ký mới</span></div>
        <div class="stat"><b>${s.learners}</b><span>Học viên</span></div>
        <div class="stat"><b>${s.drafts}</b><span>Bài viết nháp</span></div>
        <div class="stat"><b>${s.enIncomplete}</b><span>Bản Anh chưa xong</span></div>
      </div>`;
    app.innerHTML = `
      ${stats}
      <div class="grid-2">
        <div class="card">
          <h2>Lớp sắp khai giảng</h2>
          ${table(
            ["Lớp", "Ngày", "Chỗ", "Đăng ký", "Trạng thái"],
            d.upcoming.map(
              (x) =>
                `<tr><td><a href="${href(`/sessions/${x.id}`)}">${esc(x.programName)}</a></td><td>${fmtDate(x.start_date)}</td><td>${x.capacity ?? "—"}</td><td>${x.registered_count}</td><td>${badge(x.status)}</td></tr>`,
            ),
          )}
        </div>
        ${
          instructor
            ? `<div class="card"><h2>Việc cần làm</h2><p>Vào từng lớp để điểm danh, đăng tài liệu và gửi thông báo cho học viên.</p></div>`
            : `<div class="card">
          <h2>Đăng ký mới nhất</h2>
          ${table(
            ["Tên", "Khóa", "Lớp", "Ngày", "Trạng thái"],
            d.latestRegs.map(
              (x) =>
                `<tr><td><a href="${href(`/registrations/${x.id}`)}">${esc(x.full_name)}</a></td><td>${esc(x.programName || "")}</td><td>${esc(x.session_name || "")}</td><td>${fmtDate(x.created_at)}</td><td>${badge(x.status)}</td></tr>`,
            ),
          )}
        </div>`
        }
      </div>`;
  }

  async function viewPrograms() {
    $("#page-title").textContent = "Khóa học";
    const q = new URLSearchParams(location.search).get("q") || "";
    const data = await api(`/programs?q=${encodeURIComponent(q)}`);
    app.innerHTML = `
      <div class="toolbar">
        <input id="search" placeholder="Tìm khóa học" value="${esc(q)}" />
        <a class="btn btn-primary" href="${href("/programs/new")}">+ Khóa mới</a>
      </div>
      ${table(
        ["Tên khóa", "Cấp độ", "Hình thức", "Giá", "Trạng thái", "Tiếng Việt", "Tiếng Anh", ""],
        data.items.map(
          (p) => `<tr>
            <td><a href="${href(`/programs/${p.id}`)}">${esc(p.name)}</a></td>
            <td>${esc(p.level || "")}</td>
            <td>${esc(FORMAT_LABEL[p.format] || p.format)}</td>
            <td>${fmtPrice(p.price)}</td>
            <td>${badge(p.status)}</td>
            <td>${langDot(p.statusVi)}</td>
            <td>${langDot(p.statusEn)}</td>
            <td><a href="${href(`/programs/${p.id}`)}">Sửa</a></td>
          </tr>`,
        ),
      )}`;
    $("#search").addEventListener("keydown", (e) => {
      if (e.key === "Enter") go(`${href("/programs")}?q=${encodeURIComponent(e.target.value)}`);
    });
  }

  function repeater(name, items, fields) {
    const rows = (items || []).map((item, i) => {
      const inputs = fields
        .map(
          (f) =>
            `<div class="field ${f.full ? "full" : ""}"><label>${f.label}</label>${
              f.area
                ? `<textarea name="${name}-${i}-${f.key}">${esc(item[f.key] || "")}</textarea>`
                : `<input name="${name}-${i}-${f.key}" value="${esc(item[f.key] || "")}" />`
            }</div>`,
        )
        .join("");
      return `<div class="repeater-item" draggable="true" data-index="${i}">
        <div class="repeater-head"><b>${String(i + 1).padStart(2, "0")}</b>
          <span><button type="button" class="btn-ghost" data-up="${i}">↑</button>
          <button type="button" class="btn-ghost" data-down="${i}">↓</button>
          <button type="button" class="btn-danger" data-del="${i}">Xóa</button></span>
        </div>
        <div class="form-grid">${inputs}</div>
      </div>`;
    }).join("");
    return `<div class="repeater" data-repeater="${name}" data-fields='${JSON.stringify(fields)}'>
      ${rows || `<p class="empty">Chưa có mục</p>`}
      <button type="button" class="btn" data-add="${name}">+ Thêm</button>
    </div>`;
  }

  function readRepeater(root, name, fields) {
    return [...root.querySelectorAll(`[data-repeater="${name}"] .repeater-item`)].map((item, i) => {
      const out = {};
      fields.forEach((f) => {
        out[f.key] = item.querySelector(`[name="${name}-${item.dataset.index}-${f.key}"]`)?.value || "";
      });
      return out;
    });
  }

  function bindRepeater(root) {
    root.querySelectorAll("[data-repeater]").forEach((box) => {
      const name = box.dataset.repeater;
      const fields = JSON.parse(box.dataset.fields);
      const redraw = (items) => {
        const wrap = document.createElement("div");
        wrap.innerHTML = repeater(name, items, fields);
        box.replaceWith(wrap.firstElementChild);
        bindRepeater(root);
      };
      const items = () =>
        [...box.querySelectorAll(".repeater-item")].map((item) => {
          const row = {};
          fields.forEach((f) => {
            row[f.key] = item.querySelector(`[name^="${name}-"][name$="-${f.key}"]`)?.value || "";
          });
          return row;
        });
      box.addEventListener("click", (e) => {
        if (e.target.dataset.add) redraw(items().concat([{}]));
        if (e.target.dataset.del) {
          const next = items();
          next.splice(Number(e.target.dataset.del), 1);
          redraw(next);
        }
        if (e.target.dataset.up) {
          const i = Number(e.target.dataset.up);
          if (!i) return;
          const next = items();
          [next[i - 1], next[i]] = [next[i], next[i - 1]];
          redraw(next);
        }
        if (e.target.dataset.down) {
          const i = Number(e.target.dataset.down);
          const next = items();
          if (i >= next.length - 1) return;
          [next[i + 1], next[i]] = [next[i], next[i + 1]];
          redraw(next);
        }
      });
    });
  }

  async function viewProgram(id) {
    const isNew = id === "new";
    $("#page-title").textContent = isNew ? "Khóa học mới" : "Chi tiết khóa học";
    const [p, venues, instructors] = await Promise.all([
      isNew ? {} : api(`/programs/${id}`),
      api("/venues"),
      api("/instructors"),
    ]);
    const vi = p.contentVi || {};
    const en = p.contentEn || {};
    const seoVi = p.seoVi || {};
    const seoEn = p.seoEn || {};
    const tab = new URLSearchParams(location.search).get("tab") || "overview";
    const tabs = [
      ["overview", "Tổng quan"],
      ["vi", "Nội dung tiếng Việt"],
      ["en", "Nội dung tiếng Anh"],
      ["curriculum", "Chương trình"],
      ["outcomes", "Kết quả"],
      ["faq", "Câu hỏi thường gặp"],
      ["faculty", "Giảng viên"],
      ["sessions", "Lịch học"],
      ["seo", "SEO"],
    ];
    const curVi = Array.isArray(vi.curriculum) ? vi.curriculum : [];
    const curEn = Array.isArray(en.curriculum) ? en.curriculum : [];
    const outVi = Array.isArray(vi.outcomes) ? vi.outcomes.map((x) => (typeof x === "string" ? { title: x, description: "" } : x)) : [];
    const outEn = Array.isArray(en.outcomes) ? en.outcomes.map((x) => (typeof x === "string" ? { title: x, description: "" } : x)) : [];
    const faqVi = Array.isArray(vi.faq) ? vi.faq : [];
    const faqEn = Array.isArray(en.faq) ? en.faq : [];

    app.innerHTML = `
      <div class="tabs">${tabs.map(([k, l]) => `<button type="button" data-tab="${k}" class="${tab === k ? "active" : ""}">${l}</button>`).join("")}</div>
      <form id="program-form">
        <section data-pane="overview" class="${tab === "overview" ? "" : "hidden"}">
          <div class="form-grid">
            <div class="field"><label>Mã khóa</label><input name="id" value="${esc(p.id || "")}" ${isNew ? "" : "readonly"} required /></div>
            <div class="field"><label>Đường dẫn tiếng Việt</label><input name="slugVi" value="${esc(p.slug_vi || "")}" required /></div>
            <div class="field"><label>Đường dẫn tiếng Anh</label><input name="slugEn" value="${esc(p.slug_en || "")}" /></div>
            <div class="field"><label>Cấp độ</label>
              <select name="levelKey">${opts(LEVEL_LABEL, p.level_key)}</select>
            </div>
            <div class="field"><label>Giá (VND)</label><input name="priceAmount" type="number" value="${p.price_amount || 0}" /></div>
            <div class="field"><label>Hình thức</label>
              <select name="format">${opts(FORMAT_LABEL, p.format)}</select>
            </div>
            <div class="field"><label>Thời lượng tiếng Việt</label><input name="durationLabelVi" value="${esc(p.duration_label_vi || "")}" /></div>
            <div class="field"><label>Thời lượng tiếng Anh</label><input name="durationLabelEn" value="${esc(p.duration_label_en || "")}" /></div>
            <div class="field"><label>Tổng thời lượng tiếng Việt</label><input name="totalDurationVi" value="${esc(p.total_duration_vi || "")}" /></div>
            <div class="field"><label>Tổng thời lượng tiếng Anh</label><input name="totalDurationEn" value="${esc(p.total_duration_en || "")}" /></div>
            <div class="field"><label>Sĩ số min</label><input name="capacityMin" type="number" value="${p.capacity_min ?? ""}" /></div>
            <div class="field"><label>Sĩ số max</label><input name="capacityMax" type="number" value="${p.capacity_max ?? ""}" /></div>
            <div class="field"><label>Nhãn sĩ số tiếng Việt</label><input name="classSizeLabelVi" value="${esc(p.class_size_label_vi || "")}" /></div>
            <div class="field"><label>Nhãn sĩ số tiếng Anh</label><input name="classSizeLabelEn" value="${esc(p.class_size_label_en || "")}" /></div>
            <div class="field"><label>Trạng thái khóa</label>
              <select name="status">${opts({ draft: "Nháp", published: "Đã xuất bản", hidden: "Đã ẩn" }, p.status)}</select>
            </div>
            <div class="field"><label>Trạng thái tiếng Việt</label>
              <select name="statusVi">${opts(LANG_LABEL, p.status_vi)}</select>
            </div>
            <div class="field"><label>Trạng thái tiếng Anh</label>
              <select name="statusEn">${opts(LANG_LABEL, p.status_en)}</select>
            </div>
            <div class="field"><label>Nền tảng</label><input name="primaryPlatform" value="${esc(p.primary_platform || "")}" /></div>
            <div class="field"><label>Địa điểm trực tuyến</label><input name="locationOnline" value="${esc(p.location_online || "")}" /></div>
            <div class="field"><label>Địa điểm mặc định</label>
              <select name="venueDefaultId"><option value="">—</option>${venues.items.map((v) => `<option value="${v.id}" ${p.venue_default_id === v.id ? "selected" : ""}>${esc(v.name)}</option>`).join("")}</select>
            </div>
            <div class="field"><label>Nổi bật</label><select name="featured">${optList(YES_NO, p.featured ? "1" : "0")}</select></div>
            <div class="field"><label>Bật chứng nhận</label><select name="certificateEnabled">${optList(YES_NO, p.certificate_enabled !== 0 ? "1" : "0")}</select></div>
            <div class="field"><label>Mã chứng nhận</label><input name="certificateCode" value="${esc(p.certificate_code || "")}" placeholder="AIS / AIA / AIW" /></div>
            <div class="field"><label>Điểm danh tối thiểu (%)</label><input name="minimumAttendancePercent" type="number" value="${p.minimum_attendance_percent ?? 75}" /></div>
            <div class="field"><label>Yêu cầu hoàn thành khóa</label><select name="requireCompletion">${optList(YES_NO, p.require_completion !== 0 ? "1" : "0")}</select></div>
            <div class="field"><label>Yêu cầu thanh toán</label><select name="requirePayment">${optList(YES_NO, p.require_payment !== 0 ? "1" : "0")}</select></div>
            <div class="field"><label>Quản trị duyệt chứng nhận</label><select name="requireAdminApproval">${optList(YES_NO, p.require_admin_approval !== 0 ? "1" : "0")}</select></div>
            <div class="field"><label>Mở link vào lớp (phút trước giờ học)</label><input name="joinLinkOpenMinutesBefore" type="number" value="${p.join_link_open_minutes_before ?? 30}" /></div>
            <div class="field"><label>Mã mẫu chứng nhận</label><input name="certificateTemplateId" value="${esc(p.certificate_template_id || "tpl-vsc-default")}" /></div>
          </div>
        </section>
        <section data-pane="vi" class="${tab === "vi" ? "" : "hidden"}">
          <div class="form-grid">
            <div class="field"><label>Tên khóa</label><input name="vi-name" value="${esc(vi.name || "")}" /></div>
            <div class="field"><label>Tên ngắn</label><input name="vi-shortName" value="${esc(vi.shortName || "")}" /></div>
            <div class="field"><label>Nhãn cấp độ</label><input name="vi-level" value="${esc(vi.level || "")}" /></div>
            <div class="field"><label>Dòng phụ</label><input name="vi-subtitle" value="${esc(vi.subtitle || "")}" /></div>
            <div class="field full"><label>Tiêu đề lớn</label><textarea name="vi-heroHeadline">${esc(vi.heroHeadline || "")}</textarea></div>
            <div class="field full"><label>Dòng mô tả ngắn</label><input name="vi-tagline" value="${esc(vi.tagline || "")}" /></div>
            <div class="field full"><label>Mô tả</label><textarea name="vi-description">${esc(vi.description || "")}</textarea></div>
            <div class="field full"><label>Đối tượng (JSON hoặc dùng tab Kết quả)</label><textarea name="vi-heroNote">${esc(vi.heroNote || "")}</textarea></div>
            <div class="field"><label>Nhãn nút</label><input name="vi-ctaLabel" value="${esc(vi.ctaLabel || "")}" /></div>
          </div>
        </section>
        <section data-pane="en" class="${tab === "en" ? "" : "hidden"}">
          <div class="toolbar">
            <button type="button" class="btn" id="en-draft">Tạo bản nháp tiếng Anh</button>
            <button type="button" class="btn" id="en-review">Đánh dấu đã duyệt</button>
            <button type="button" class="btn btn-primary" id="en-publish">Xuất bản bản Anh</button>
          </div>
          <div class="form-grid">
            <div class="field"><label>Tên khóa</label><input name="en-name" value="${esc(en.name || "")}" /></div>
            <div class="field"><label>Tên ngắn</label><input name="en-shortName" value="${esc(en.shortName || "")}" /></div>
            <div class="field"><label>Level label</label><input name="en-level" value="${esc(en.level || "")}" /></div>
            <div class="field"><label>Eyebrow / subtitle</label><input name="en-subtitle" value="${esc(en.subtitle || "")}" /></div>
            <div class="field full"><label>Headline</label><textarea name="en-heroHeadline">${esc(en.heroHeadline || "")}</textarea></div>
            <div class="field full"><label>Dòng mô tả ngắn</label><input name="en-tagline" value="${esc(en.tagline || "")}" /></div>
            <div class="field full"><label>Mô tả</label><textarea name="en-description">${esc(en.description || "")}</textarea></div>
            <div class="field"><label>Nhãn nút</label><input name="en-ctaLabel" value="${esc(en.ctaLabel || "")}" /></div>
          </div>
        </section>
        <section data-pane="curriculum" class="${tab === "curriculum" ? "" : "hidden"}">
          <h3>Chương trình tiếng Việt</h3>
          ${repeater("curVi", curVi, [
            { key: "title", label: "Tiêu đề" },
            { key: "goal", label: "Mục tiêu" },
            { key: "content", label: "Mô tả", area: true, full: true },
            { key: "output", label: "Kết quả đầu ra", full: true },
          ])}
          <h3>Chương trình tiếng Anh</h3>
          ${repeater("curEn", curEn, [
            { key: "title", label: "Title" },
            { key: "goal", label: "Goal" },
            { key: "content", label: "Description", area: true, full: true },
            { key: "output", label: "Output", full: true },
          ])}
        </section>
        <section data-pane="outcomes" class="${tab === "outcomes" ? "" : "hidden"}">
          <h3>Kết quả tiếng Việt</h3>
          ${repeater("outVi", outVi, [{ key: "title", label: "Title" }, { key: "description", label: "Mô tả", area: true, full: true }])}
          <h3>Kết quả tiếng Anh</h3>
          ${repeater("outEn", outEn, [{ key: "title", label: "Title" }, { key: "description", label: "Description", area: true, full: true }])}
        </section>
        <section data-pane="faq" class="${tab === "faq" ? "" : "hidden"}">
          <h3>Câu hỏi thường gặp tiếng Việt</h3>
          ${repeater("faqVi", faqVi, [{ key: "q", label: "Câu hỏi", full: true }, { key: "a", label: "Trả lời", area: true, full: true }])}
          <h3>Câu hỏi thường gặp tiếng Anh</h3>
          ${repeater("faqEn", faqEn, [{ key: "q", label: "Câu hỏi", full: true }, { key: "a", label: "Trả lời", area: true, full: true }])}
        </section>
        <section data-pane="faculty" class="${tab === "faculty" ? "" : "hidden"}">
          ${(instructors.items || []).map((ins) => {
            const linked = (p.instructors || []).find((x) => x.instructor_id === ins.id);
            return `<label class="field" style="display:flex;gap:10px;align-items:center">
              <input type="checkbox" name="ins-${ins.id}" ${linked ? "checked" : ""} />
              <span>${esc(ins.name)}</span>
              <select name="insrole-${ins.id}">
                ${opts(FACULTY_ROLE, linked?.role || "instructor")}
              </select>
            </label>`;
          }).join("")}
        </section>
        <section data-pane="sessions" class="${tab === "sessions" ? "" : "hidden"}">
          ${table(
            ["Lớp", "Ngày", "Trạng thái", ""],
            (p.sessions || []).map(
              (s) => `<tr><td>${esc(s.session_name)}</td><td>${fmtDate(s.start_date)}</td><td>${badge(s.status)}</td><td><a href="${href(`/sessions/${s.id}`)}">Mở</a></td></tr>`,
            ),
            "Chưa có lớp",
          )}
          <p><a class="btn" href="${href("/sessions/new")}?programId=${esc(p.id || "")}">+ Tạo lớp</a></p>
        </section>
        <section data-pane="seo" class="${tab === "seo" ? "" : "hidden"}">
          <div class="form-grid">
            <div class="field full"><label>Tiêu đề SEO tiếng Việt</label><input name="seoViTitle" value="${esc(seoVi.title || "")}" /></div>
            <div class="field full"><label>Mô tả SEO tiếng Việt</label><textarea name="seoViDesc">${esc(seoVi.description || "")}</textarea></div>
            <div class="field full"><label>Tiêu đề SEO tiếng Anh</label><input name="seoEnTitle" value="${esc(seoEn.title || "")}" /></div>
            <div class="field full"><label>Mô tả SEO tiếng Anh</label><textarea name="seoEnDesc">${esc(seoEn.description || "")}</textarea></div>
          </div>
        </section>
        <div class="toolbar" style="margin-top:20px">
          <button class="btn btn-primary" type="submit">Lưu</button>
          ${isNew ? "" : `<button class="btn-danger" type="button" id="delete-program">Xóa</button>`}
        </div>
      </form>`;

    bindRepeater(app);
    app.querySelectorAll("[data-tab]").forEach((btn) =>
      btn.addEventListener("click", () => {
        app.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("active", b === btn));
        app.querySelectorAll("[data-pane]").forEach((pne) => pne.classList.toggle("hidden", pne.dataset.pane !== btn.dataset.tab));
      }),
    );

    const collectContent = (prefix, base) => {
      const next = { ...base };
      ["name", "shortName", "level", "subtitle", "heroHeadline", "tagline", "description", "heroNote", "ctaLabel"].forEach((k) => {
        const el = app.querySelector(`[name="${prefix}-${k}"]`);
        if (el) next[k] = el.value;
      });
      return next;
    };

    $("#program-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const payload = {
        id: val(form, "id"),
        slugVi: val(form, "slugVi"),
        slugEn: val(form, "slugEn"),
        levelKey: val(form, "levelKey"),
        priceAmount: Number(val(form, "priceAmount") || 0),
        format: val(form, "format"),
        durationLabelVi: val(form, "durationLabelVi"),
        durationLabelEn: val(form, "durationLabelEn"),
        totalDurationVi: val(form, "totalDurationVi"),
        totalDurationEn: val(form, "totalDurationEn"),
        capacityMin: val(form, "capacityMin") === "" ? null : Number(val(form, "capacityMin")),
        capacityMax: val(form, "capacityMax") === "" ? null : Number(val(form, "capacityMax")),
        classSizeLabelVi: val(form, "classSizeLabelVi"),
        classSizeLabelEn: val(form, "classSizeLabelEn"),
        status: val(form, "status"),
        statusVi: val(form, "statusVi"),
        statusEn: val(form, "statusEn"),
        primaryPlatform: val(form, "primaryPlatform"),
        locationOnline: val(form, "locationOnline"),
        venueDefaultId: val(form, "venueDefaultId") || null,
        featured: val(form, "featured") === "1",
        certificateEnabled: val(form, "certificateEnabled") !== "0",
        certificateCode: val(form, "certificateCode"),
        minimumAttendancePercent: Number(val(form, "minimumAttendancePercent") || 75),
        requireCompletion: val(form, "requireCompletion") !== "0",
        requirePayment: val(form, "requirePayment") !== "0",
        requireAdminApproval: val(form, "requireAdminApproval") !== "0",
        joinLinkOpenMinutesBefore: Number(val(form, "joinLinkOpenMinutesBefore") || 30),
        certificateTemplateId: val(form, "certificateTemplateId") || "tpl-vsc-default",
        contentVi: {
          ...collectContent("vi", vi),
          curriculum: readRepeater(app, "curVi", [{ key: "title" }, { key: "goal" }, { key: "content" }, { key: "output" }]),
          outcomes: readRepeater(app, "outVi", [{ key: "title" }, { key: "description" }]),
          faq: readRepeater(app, "faqVi", [{ key: "q" }, { key: "a" }]),
        },
        contentEn: {
          ...collectContent("en", en),
          curriculum: readRepeater(app, "curEn", [{ key: "title" }, { key: "goal" }, { key: "content" }, { key: "output" }]),
          outcomes: readRepeater(app, "outEn", [{ key: "title" }, { key: "description" }]),
          faq: readRepeater(app, "faqEn", [{ key: "q" }, { key: "a" }]),
        },
        seoVi: { title: val(form, "seoViTitle"), description: val(form, "seoViDesc") },
        seoEn: { title: val(form, "seoEnTitle"), description: val(form, "seoEnDesc") },
        instructors: instructors.items
          .filter((ins) => form.elements[`ins-${ins.id}`]?.checked)
          .map((ins) => ({ instructorId: ins.id, role: form.elements[`insrole-${ins.id}`]?.value || "instructor" })),
      };
      try {
        if (isNew) await api("/programs", { method: "POST", body: payload });
        else await api(`/programs/${id}`, { method: "PUT", body: payload });
        toast("Đã lưu khóa học");
        go(href(`/programs/${payload.id}`));
      } catch (err) {
        toast(err.message, true);
      }
    });

    $("#en-draft")?.addEventListener("click", async () => {
      try {
        await api(`/programs/${id}/en-draft`, { method: "POST", body: {} });
        toast("Đã tạo bản nháp tiếng Anh — chưa xuất bản");
        render();
      } catch (err) {
        toast(err.message, true);
      }
    });
    $("#en-review")?.addEventListener("click", () => {
      app.querySelector('[name="statusEn"]').value = "review";
      toast("Đã đánh dấu chờ duyệt — nhớ bấm Lưu");
    });
    $("#en-publish")?.addEventListener("click", () => {
      app.querySelector('[name="statusEn"]').value = "published";
      toast("Sẽ xuất bản bản Anh khi bạn bấm Lưu");
    });
    $("#delete-program")?.addEventListener("click", async () => {
      if (!confirmAction("Xóa khóa học này? Không xóa được nếu còn lớp liên kết.")) return;
      try {
        await api(`/programs/${id}`, { method: "DELETE" });
        toast("Đã xóa");
        go(href("/programs"));
      } catch (err) {
        toast(err.message, true);
      }
    });
  }

  async function viewSessions() {
    $("#page-title").textContent = "Lớp học";
    const [data, programs] = await Promise.all([api("/sessions"), api("/programs")]);
    const programId = new URLSearchParams(location.search).get("programId") || "";
    const status = new URLSearchParams(location.search).get("status") || "";
    const filtered = data.items.filter(
      (s) => (!programId || s.program_id === programId) && (!status || s.status === status),
    );
    app.innerHTML = `
      <div class="toolbar">
        <select id="f-program"><option value="">Tất cả khóa</option>${programs.items.map((p) => `<option value="${p.id}" ${p.id === programId ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select>
        <select id="f-status"><option value="">Tất cả trạng thái</option>${Object.keys(SESSION_LABEL).map((k) => `<option value="${k}" ${k === status ? "selected" : ""}>${SESSION_LABEL[k]}</option>`).join("")}</select>
        ${canManageStaff() ? `<a class="btn btn-primary" href="${href("/sessions/new")}">+ Lớp mới</a>` : ""}
      </div>
      ${table(
        ["Lớp", "Khóa", "Ngày", "Giờ", "Chỗ", "Đăng ký", "Trạng thái", ""],
        filtered.map(
          (s) => `<tr>
            <td><a href="${href(`/sessions/${s.id}`)}">${esc(s.session_name || s.slug)}</a></td>
            <td>${esc(s.programName || "")}</td>
            <td>${fmtDate(s.start_date)}</td>
            <td>${esc(s.start_time)}–${esc(s.end_time)}</td>
            <td>${s.capacity ?? "—"}</td>
            <td>${s.registered_count}</td>
            <td>${badge(s.status)}</td>
            <td><a href="${href(`/sessions/${s.id}`)}">Sửa</a></td>
          </tr>`,
        ),
      )}`;
    const apply = () => go(`${href("/sessions")}?programId=${$("#f-program").value}&status=${$("#f-status").value}`);
    $("#f-program").onchange = apply;
    $("#f-status").onchange = apply;
  }

  async function viewSession(id) {
    const isNew = id === "new";
    if (isNew && !canManageStaff()) {
      go(href("/sessions"));
      return;
    }
    $("#page-title").textContent = isNew ? "Tạo lớp" : "Chi tiết lớp";
    const [s, programs, venues] = await Promise.all([
      isNew ? { program_id: new URLSearchParams(location.search).get("programId") || "" } : api(`/sessions/${id}`),
      api("/programs"),
      api("/venues"),
    ]);
    app.innerHTML = `
      <form id="session-form" class="card" style="padding:18px">
        <div class="form-grid">
          <div class="field"><label>Khóa học</label>
            <select name="programId" required>${programs.items.map((p) => `<option value="${p.id}" ${s.program_id === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select>
          </div>
          <div class="field"><label>Mã lớp (đường dẫn)</label><input name="slug" value="${esc(s.slug || "")}" required /></div>
          <div class="field"><label>Tên lớp</label><input name="sessionName" value="${esc(s.session_name || "")}" /></div>
          <div class="field"><label>Loại</label><select name="type">${opts(TYPE_LABEL, s.type || "course")}</select></div>
          <div class="field"><label>Ngày bắt đầu</label><input type="date" name="startDate" value="${esc((s.start_date || "").slice(0, 10))}" required /></div>
          <div class="field"><label>Ngày kết thúc</label><input type="date" name="endDate" value="${esc((s.end_date || "").slice(0, 10))}" /></div>
          <div class="field"><label>Giờ bắt đầu</label><input type="time" name="startTime" value="${esc(s.start_time || "")}" required /></div>
          <div class="field"><label>Giờ kết thúc</label><input type="time" name="endTime" value="${esc(s.end_time || "")}" required /></div>
          <div class="field"><label>Thứ trong tuần</label><input name="daysOfWeek" value="${esc(s.days_of_week || "")}" placeholder="T3, T5" /></div>
          <div class="field"><label>Hình thức</label><select name="format"><option value="">Theo khóa</option>${opts(FORMAT_LABEL, s.format)}</select></div>
          <div class="field"><label>Địa điểm</label>
            <select name="venueId"><option value="">—</option>${venues.items.map((v) => `<option value="${v.id}" ${s.venue_id === v.id ? "selected" : ""}>${esc(v.name)}</option>`).join("")}</select>
          </div>
          <div class="field"><label>Nền tảng trực tuyến</label><input name="onlinePlatform" value="${esc(s.online_platform || "")}" /></div>
          <div class="field"><label>Link họp trực tuyến</label><input name="meetingUrl" value="${esc(s.meeting_url || "")}" /></div>
          <div class="field"><label>Mở link vào lớp (phút trước giờ học)</label><input type="number" name="joinLinkOpenMinutesBefore" value="${s.join_link_open_minutes_before ?? ""}" placeholder="Theo khóa" /></div>
          <div class="field"><label>Giá riêng (VND)</label><input type="number" name="priceOverride" value="${s.price_override ?? ""}" /></div>
          <div class="field"><label>Sĩ số</label><input type="number" name="capacity" value="${s.capacity ?? ""}" /></div>
          <div class="field"><label>Đã đăng ký</label><input value="${s.registered_count || 0}" disabled /></div>
          <div class="field"><label>Trạng thái</label>
            <select name="status">${Object.keys(SESSION_LABEL).map((k) => `<option value="${k}" ${s.status === k ? "selected" : ""}>${SESSION_LABEL[k]}</option>`).join("")}</select>
          </div>
          <div class="field"><label>Mở đăng ký</label><input type="date" name="registrationOpenDate" value="${esc((s.registration_open_date || "").slice(0, 10))}" /></div>
          <div class="field"><label>Đóng đăng ký</label><input type="date" name="registrationCloseDate" value="${esc((s.registration_close_date || "").slice(0, 10))}" /></div>
          <div class="field full"><label>Mô tả tiếng Việt</label><textarea name="descriptionVi">${esc(s.description_vi || "")}</textarea></div>
          <div class="field full"><label>Mô tả tiếng Anh</label><textarea name="descriptionEn">${esc(s.description_en || "")}</textarea></div>
          <div class="field full"><label>Ghi chú nội bộ</label><textarea name="notes">${esc(s.notes || "")}</textarea></div>
        </div>
        <div class="toolbar" style="margin-top:16px">
          ${canManageStaff() ? `<button class="btn btn-primary" type="submit">Lưu lớp</button>
          ${isNew ? "" : `<button type="button" class="btn-danger" id="delete-session">Xóa</button>`}` : ""}
        </div>
      </form>`;
    if (isInstructor()) {
      $("#session-form")?.querySelectorAll("input, select, textarea, button").forEach((el) => {
        el.disabled = true;
      });
    }
    $("#session-form").onsubmit = async (e) => {
      e.preventDefault();
      const form = e.target;
      const payload = {
        programId: val(form, "programId"),
        slug: val(form, "slug"),
        sessionName: val(form, "sessionName"),
        type: val(form, "type"),
        startDate: val(form, "startDate"),
        endDate: val(form, "endDate") || val(form, "startDate"),
        startTime: val(form, "startTime"),
        endTime: val(form, "endTime"),
        daysOfWeek: val(form, "daysOfWeek"),
        format: val(form, "format") || null,
        venueId: val(form, "venueId") || null,
        onlinePlatform: val(form, "onlinePlatform"),
        meetingUrl: val(form, "meetingUrl"),
        joinLinkOpenMinutesBefore: val(form, "joinLinkOpenMinutesBefore") === "" ? null : Number(val(form, "joinLinkOpenMinutesBefore")),
        priceOverride: val(form, "priceOverride") === "" ? null : Number(val(form, "priceOverride")),
        capacity: val(form, "capacity") === "" ? null : Number(val(form, "capacity")),
        status: val(form, "status"),
        registrationOpenDate: val(form, "registrationOpenDate") || null,
        registrationCloseDate: val(form, "registrationCloseDate") || null,
        descriptionVi: val(form, "descriptionVi"),
        descriptionEn: val(form, "descriptionEn"),
        notes: val(form, "notes"),
      };
      try {
        const result = isNew
          ? await api("/sessions", { method: "POST", body: payload })
          : await api(`/sessions/${id}`, { method: "PUT", body: payload });
        toast("Đã lưu lớp — website sẽ cập nhật lịch / khóa / form đăng ký");
        go(href(`/sessions/${result.id}`));
      } catch (err) {
        toast(err.message, true);
      }
    };
    $("#delete-session")?.addEventListener("click", async () => {
      if (!confirmAction("Xóa lớp này?")) return;
      try {
        await api(`/sessions/${id}`, { method: "DELETE" });
        toast("Đã xóa lớp");
        go(href("/sessions"));
      } catch (err) {
        toast(err.message, true);
      }
    });
    if (!isNew) {
      let lms = null;
      try {
        lms = await api(`/sessions/${id}/lms`);
      } catch (err) {
        app.insertAdjacentHTML(
          "beforeend",
          `<div class="card" style="margin-top:18px;padding:18px"><p class="empty">Không tải được LMS của lớp: ${esc(err.message)}. Form lớp phía trên vẫn lưu bình thường.</p></div>`,
        );
      }
      if (!lms) return;
      const tab = new URLSearchParams(location.search).get("tab") || "meetings";
      const tabs = [
        ["overview", "Tổng quan"],
        ["students", "Học viên"],
        ["meetings", "Buổi học"],
        ["attendance", "Điểm danh"],
        ["materials", "Tài liệu"],
        ["announcements", "Thông báo"],
        ["certificates", "Chứng nhận"],
      ];
      app.insertAdjacentHTML(
        "beforeend",
        `<div class="card" style="margin-top:18px;padding:18px">
          <div class="tabs">${tabs.map(([k, l]) => `<button data-stab="${k}" class="${tab === k ? "active" : ""}">${l}</button>`).join("")}</div>
          <div id="lms-pane"></div>
        </div>`,
      );
      const pane = $("#lms-pane");
      const show = (k) => {
        app.querySelectorAll("[data-stab]").forEach((b) => b.classList.toggle("active", b.dataset.stab === k));
        if (k === "overview") {
          pane.innerHTML = `<p>${lms.summary.total} học viên · ${lms.summary.eligible} đủ điều kiện · ${lms.summary.missingAttendance} thiếu điểm danh · ${lms.summary.incomplete} chưa hoàn thành</p>`;
        } else if (k === "students") {
          pane.innerHTML = table(
            ["Học viên", "Trạng thái", "Thanh toán", "Tiến độ", "Chứng nhận", ""],
            lms.enrollments.map(
              (e) => `<tr><td><a href="${href(`/students/${e.student_id}`)}">${esc(e.student_name)}</a></td><td>${badge(e.status)}</td><td>${badge(e.payment_status)}</td><td>${e.progress.percent}%</td><td>${badge(e.certificate.status)}</td><td><button class="btn" data-recommend="${e.id}">Đề xuất hoàn thành</button></td></tr>`,
            ),
          );
          pane.querySelectorAll("[data-recommend]").forEach((b) =>
            b.addEventListener("click", async () => {
              await api(`/enrollments/${b.dataset.recommend}/recommend-completion`, { method: "POST", body: {} });
              toast("Đã đề xuất hoàn thành");
            }),
          );
        } else if (k === "meetings") {
          pane.innerHTML = `${table(
            ["Buổi", "Ngày", "Giờ", "Trạng thái", ""],
            lms.meetings.map(
              (m) => `<tr><td>${esc(m.title_vi)}</td><td>${fmtDate(m.date)}</td><td>${esc(m.start_time)}–${esc(m.end_time)}</td><td>${badge(m.status)}</td><td></td></tr>`,
            ),
            "Chưa có buổi",
          )}
          <form id="mtg-form" class="form-grid" style="margin-top:12px">
            <div class="field"><label>Tiêu đề tiếng Việt</label><input name="titleVi" required /></div>
            <div class="field"><label>Tiêu đề tiếng Anh</label><input name="titleEn" /></div>
            <div class="field"><label>Ngày</label><input type="date" name="date" required /></div>
            <div class="field"><label>Bắt đầu</label><input type="time" name="startTime" required /></div>
            <div class="field"><label>Kết thúc</label><input type="time" name="endTime" required /></div>
            <div class="field"><label>Hình thức</label><select name="format">${optList([["online","Trực tuyến"],["offline","Trực tiếp"]], "online")}</select></div>
            <div class="field"><label>Link họp</label><input name="meetingUrl" /></div>
            <div class="field"><label>Bản ghi</label><input name="recordingUrl" /></div>
            <button class="btn btn-primary">Thêm buổi</button>
          </form>`;
          $("#mtg-form").onsubmit = async (e) => {
            e.preventDefault();
            const body = Object.fromEntries(new FormData(e.target).entries());
            body.sessionId = id;
            try {
              await api("/meetings", { method: "POST", body });
              toast("Đã thêm buổi học");
              render();
            } catch (err) {
              toast(err.message, true);
            }
          };
        } else if (k === "attendance") {
          const rows = [];
          lms.meetings.forEach((m) => {
            lms.enrollments.forEach((enr) => {
              rows.push(`<tr>
                <td>${esc(enr.student_name)}</td>
                <td>${esc(m.title_vi)}</td>
                <td>
                  <select data-att="${enr.id}" data-meeting="${m.id}">
                    ${opts(ATT_LABEL, "not_recorded")}
                  </select>
                </td>
              </tr>`);
            });
          });
          pane.innerHTML = table(["Học viên", "Buổi", "Trạng thái"], rows, "Chưa có dữ liệu");
          pane.querySelectorAll("[data-att]").forEach((sel) =>
            sel.addEventListener("change", async () => {
              await api("/attendance", { method: "PUT", body: { enrollmentId: sel.dataset.att, meetingId: sel.dataset.meeting, status: sel.value } });
              toast("Đã ghi nhận điểm danh");
            }),
          );
        } else if (k === "materials") {
          pane.innerHTML = `${table(["Tiêu đề", "Loại"], lms.materials.map((x) => `<tr><td><a href="${href(`/materials/${x.id}`)}">${esc(x.title_vi)}</a></td><td>${esc(MATERIAL_TYPE[x.type] || x.type)}</td></tr>`))}
            <p><a class="btn" href="${href("/materials/new")}">+ Tài liệu</a></p>`;
        } else if (k === "announcements") {
          pane.innerHTML = `${table(["Tiêu đề", "Mức ưu tiên"], lms.announcements.map((x) => `<tr><td><a href="${href(`/announcements/${x.id}`)}">${esc(x.title_vi)}</a></td><td>${esc(PRIORITY_LABEL[x.priority] || x.priority)}</td></tr>`))}
            <p><a class="btn" href="${href("/announcements/new")}">+ Thông báo</a></p>`;
        } else {
          if (!canManageStaff()) {
            pane.innerHTML = `<p>${lms.summary.eligible} đủ điều kiện · ${lms.summary.missingAttendance} thiếu điểm danh · ${lms.summary.incomplete} chưa hoàn thành</p>
            ${table(
              ["Học viên", "Điểm danh", "Hoàn thành", "Thanh toán", "Chứng nhận"],
              lms.enrollments.map(
                (e) => `<tr>
                  <td>${esc(e.student_name)}</td>
                  <td>${e.attendance.percent}%</td>
                  <td>${esc(statusText(e.completion_status || e.status))}</td>
                  <td>${badge(e.payment_status)}</td>
                  <td>${badge(e.certificate.status)}</td>
                </tr>`,
              ),
            )}`;
            return;
          }
          pane.innerHTML = `<p>${lms.summary.eligible} đủ điều kiện · ${lms.summary.missingAttendance} thiếu điểm danh · ${lms.summary.incomplete} chưa hoàn thành</p>
            ${table(
              ["Học viên", "Điểm danh", "Hoàn thành", "Thanh toán", "Chứng nhận", ""],
              lms.enrollments.map(
                (e) => `<tr>
                  <td>${esc(e.student_name)}</td>
                  <td>${e.attendance.percent}%</td>
                  <td>${esc(e.completion_status || e.status)}</td>
                  <td>${esc(e.payment_status)}</td>
                  <td>${badge(e.certificate.status)}</td>
                  <td><label><input type="checkbox" data-bulk="${e.id}" ${e.eligibility.eligible && e.certificate.status !== "issued" ? "" : "disabled"} /> Cấp</label></td>
                </tr>`,
              ),
            )}
            <button class="btn btn-primary" id="issue-selected">Cấp chứng nhận đã chọn</button>`;
          $("#issue-selected").onclick = async () => {
            const ids = [...pane.querySelectorAll("[data-bulk]:checked")].map((x) => x.dataset.bulk);
            if (!ids.length) return toast("Chưa chọn học viên", true);
            const r = await api("/certificates/issue-bulk", { method: "POST", body: { enrollmentIds: ids } });
            toast(`Đã cấp ${r.issued.length}, lỗi ${r.failed.length}`);
            render();
          };
        }
      };
      show(tab);
      app.querySelectorAll("[data-stab]").forEach((b) => b.addEventListener("click", () => show(b.dataset.stab)));
    }
  }

  async function viewRegistrations() {
    $("#page-title").textContent = "Đăng ký";
    const qs = new URLSearchParams(location.search);
    const [data, programs, sessions] = await Promise.all([
      api(`/registrations?${qs.toString()}`),
      api("/programs"),
      api("/sessions"),
    ]);
    app.innerHTML = `
      <div class="toolbar">
        <input id="q" placeholder="Tên, email, SĐT, mã" value="${esc(qs.get("q") || "")}" />
        <select id="programId"><option value="">Khóa</option>${programs.items.map((p) => `<option value="${p.id}" ${qs.get("programId") === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select>
        <select id="sessionId"><option value="">Lớp</option>${sessions.items.map((s) => `<option value="${s.id}" ${qs.get("sessionId") === s.id ? "selected" : ""}>${esc(s.session_name)}</option>`).join("")}</select>
        <select id="status"><option value="">Trạng thái</option>${Object.keys(REG_LABEL).map((k) => `<option value="${k}" ${qs.get("status") === k ? "selected" : ""}>${REG_LABEL[k]}</option>`).join("")}</select>
        <a class="btn" href="/api/admin/registrations/export.csv">Tải CSV</a>
        ${canManageStaff() ? `<a class="btn btn-primary" href="${href("/registrations/new")}">+ Thêm đăng ký</a>` : ""}
      </div>
      ${table(
        ["ID", "Họ tên", "Khóa", "Lớp", "Số tiền", "Ngày", "Trạng thái", "Thao tác"],
        data.items.map(
          (r) => `<tr>
            <td><a href="${href(`/registrations/${r.id}`)}">${esc(r.id)}</a></td>
            <td>${esc(r.full_name)}<br><small>${esc(r.email)}</small></td>
            <td>${esc(r.programName || "")}</td>
            <td>${esc(r.session_name || "")}</td>
            <td>${fmtPrice(r.amount)}</td>
            <td>${fmtDate(r.created_at)}</td>
            <td>${badge(r.status)}</td>
            <td>${canManageStaff() ? `<a class="btn" href="${href(`/registrations/${r.id}`)}">Sửa</a> <button class="btn-danger" type="button" data-reg-delete="${esc(r.id)}">Xóa</button>` : `<a class="btn" href="${href(`/registrations/${r.id}`)}">Xem</a>`}</td>
          </tr>`,
        ),
      )}`;
    const apply = () => {
      const next = new URLSearchParams();
      ["q", "programId", "sessionId", "status"].forEach((k) => {
        const v = document.getElementById(k).value;
        if (v) next.set(k, v);
      });
      go(`${href("/registrations")}?${next}`);
    };
    $("#q").addEventListener("keydown", (e) => e.key === "Enter" && apply());
    $("#programId").onchange = apply;
    $("#sessionId").onchange = apply;
    $("#status").onchange = apply;
    app.querySelectorAll("[data-reg-delete]").forEach((button) => button.addEventListener("click", async () => {
      if (!confirmAction("Xóa đăng ký này?")) return;
      button.disabled = true;
      try {
        await api(`/registrations/${button.dataset.regDelete}`, { method: "DELETE" });
        toast("Đã xóa đăng ký");
        render();
      } catch (err) {
        button.disabled = false;
        toast(err.message, true);
      }
    }));
  }

  async function viewRegistration(id) {
    const isNew = id === "new";
    if (isNew && !canManageStaff()) {
      go(href("/registrations"));
      return;
    }
    $("#page-title").textContent = isNew ? "Thêm đăng ký" : "Sửa đăng ký";
    const [r, sessions] = await Promise.all([isNew ? Promise.resolve({ status: "new", amount: 0 }) : api(`/registrations/${id}`), api("/sessions")]);
    app.innerHTML = `
      <form class="card" style="padding:18px" id="reg-form">
        ${isNew ? "" : `<p><strong>ID:</strong> ${esc(r.id)} · <strong>Ngày tạo:</strong> ${fmtDate(r.created_at)}</p>`}
        <div class="form-grid">
          <div class="field"><label>Họ và tên</label><input name="fullName" required ${canManageStaff() ? "" : "disabled"} value="${esc(r.full_name || "")}" /></div>
          <div class="field"><label>Số điện thoại</label><input name="phone" required ${canManageStaff() ? "" : "disabled"} value="${esc(r.phone || "")}" /></div>
          <div class="field"><label>Email</label><input name="email" type="email" required ${canManageStaff() ? "" : "disabled"} value="${esc(r.email || "")}" /></div>
          <div class="field"><label>Lớp học</label><select name="sessionId" required ${canManageStaff() ? "" : "disabled"}><option value="">Chọn lớp</option>${sessions.items.map((s) => `<option value="${s.id}" ${r.session_id === s.id ? "selected" : ""}>${esc(s.session_name)} · ${fmtDate(s.start_date)}</option>`).join("")}</select></div>
          <div class="field"><label>Số tiền (VND)</label><input name="amount" type="number" min="0" step="1" required ${canManageStaff() ? "" : "disabled"} value="${esc(r.amount ?? 0)}" /></div>
          <div class="field"><label>Trạng thái</label><select name="status" ${canManageStaff() ? "" : "disabled"}>${Object.keys(REG_LABEL).map((k) => `<option value="${k}" ${r.status === k ? "selected" : ""}>${REG_LABEL[k]}</option>`).join("")}</select></div>
          <div class="field"><label>Vai trò công việc</label><input name="jobRole" ${canManageStaff() ? "" : "disabled"} value="${esc(r.job_role || "")}" /></div>
          <div class="field"><label>Tổ chức</label><input name="organization" ${canManageStaff() ? "" : "disabled"} value="${esc(r.organization || "")}" /></div>
          <div class="field full"><label>Mục tiêu</label><textarea name="goal" ${canManageStaff() ? "" : "disabled"}>${esc(r.goal || "")}</textarea></div>
          <div class="field"><label>Nguồn</label><input name="source" ${canManageStaff() ? "" : "disabled"} value="${esc(r.source || "")}" /></div>
          <div class="field"><label><input name="consentPrivacy" type="checkbox" ${r.consent_privacy ? "checked" : ""} ${canManageStaff() ? "" : "disabled"} /> Đồng ý chính sách bảo mật</label><label><input name="consentMarketing" type="checkbox" ${r.consent_marketing ? "checked" : ""} ${canManageStaff() ? "" : "disabled"} /> Đồng ý nhận marketing</label></div>
          ${isNew ? "" : `<div class="field full"><label>Ghi chú nội bộ</label><textarea name="note"></textarea></div>`}
        </div>
        ${canManageStaff() ? `<div class="toolbar"><button class="btn btn-primary" type="submit">${isNew ? "Thêm đăng ký" : "Lưu thay đổi"}</button>${isNew ? "" : `<button class="btn-danger" type="button" id="reg-delete">Xóa</button>`}</div>` : ""}
      </form>
      ${isNew ? "" : `<div class="card" style="margin-top:16px;padding:18px"><h2>Lịch sử</h2>${(r.notes || []).map((n) => `<p><small>${esc(n.at)} · ${esc(n.by)}</small><br>${esc(n.text)}</p>`).join("") || "<p class='empty'>Chưa có ghi chú</p>"}</div>`}`;
    if (canManageStaff()) $("#reg-form").onsubmit = async (e) => {
      e.preventDefault();
      try {
        const button = e.target.querySelector('[type="submit"]');
        button.disabled = true;
        const data = await api(isNew ? "/registrations" : `/registrations/${id}`, {
          method: isNew ? "POST" : "PUT",
          body: {
            fullName: val(e.target, "fullName"), phone: val(e.target, "phone"), email: val(e.target, "email"),
            sessionId: val(e.target, "sessionId"), amount: val(e.target, "amount"), status: val(e.target, "status"),
            jobRole: val(e.target, "jobRole"), organization: val(e.target, "organization"), goal: val(e.target, "goal"),
            source: val(e.target, "source"), consentPrivacy: e.target.elements.consentPrivacy.checked,
            consentMarketing: e.target.elements.consentMarketing.checked, note: isNew ? "" : val(e.target, "note"),
          },
        });
        toast(data.emailed ? `Đã xác nhận và gửi email kích hoạt tới ${data.to}` : isNew ? "Đã thêm đăng ký" : "Đã cập nhật đăng ký");
        go(href(isNew ? `/registrations/${data.id}` : "/registrations"));
      } catch (err) {
        e.target.querySelector('[type="submit"]').disabled = false;
        toast(err.message, true);
      }
    };
    if (!isNew) $("#reg-delete").onclick = async () => {
      if (!confirmAction("Xóa đăng ký này?")) return;
      try { await api(`/registrations/${id}`, { method: "DELETE" }); toast("Đã xóa đăng ký"); go(href("/registrations")); }
      catch (err) { toast(err.message, true); }
    };
  }

  function simpleCrudPage({ title, endpoint, fields, nameKey, extraToolbar }) {
    return async () => {
      $("#page-title").textContent = title;
      const data = await api(endpoint);
      const editing = new URLSearchParams(location.search).get("id");
      const current = data.items.find((x) => x.id === editing) || {};
      const visible = fields.filter((f) => !f.when || f.when());
      app.innerHTML = `
        <div class="grid-2">
          ${table(
            ["Tên", ""],
            data.items.map((x) => `<tr><td><a href="${path()}?id=${x.id}">${esc(x[nameKey] || x.name || x.title_vi)}</a></td><td><a href="${path()}?id=${x.id}">Sửa</a></td></tr>`),
          )}
          <form class="card" style="padding:18px" id="crud-form">
            <div class="form-grid">
              ${visible
                .map((f) => {
                  if (f.createOnly && editing) return "";
                  const value = f.type === "password" ? "" : esc(current[f.col] || "");
                  const input =
                    f.area
                      ? `<textarea name="${f.key}">${value}</textarea>`
                      : f.type === "select"
                        ? `<select name="${f.key}">${f.options.map((o) => `<option value="${o[0]}" ${String(current[f.col]) === String(o[0]) ? "selected" : ""}>${o[1]}</option>`).join("")}</select>`
                        : `<input name="${f.key}" type="${f.type || "text"}" value="${value}" ${f.required && !editing ? "required" : ""} autocomplete="${f.type === "password" ? "new-password" : "off"}" />`;
                  return `<div class="field ${f.full ? "full" : ""}"><label>${f.label}</label>${input}</div>`;
                })
                .join("")}
            </div>
            <div class="toolbar" style="margin-top:12px">
              <button class="btn btn-primary" type="submit">Lưu</button>
              ${editing ? `<button type="button" class="btn-danger" id="crud-del">Xóa</button>` : ""}
              ${editing && extraToolbar ? extraToolbar(current) : ""}
              <a class="btn-ghost" href="${path()}">Tạo mới</a>
            </div>
          </form>
        </div>`;
      $("#crud-form").onsubmit = async (e) => {
        e.preventDefault();
        const body = {};
        visible.forEach((f) => {
          if (f.createOnly && editing) return;
          const value = val(e.target, f.key);
          if (f.type === "password" && !value) return;
          body[f.key] = value;
        });
        try {
          if (editing) await api(`${endpoint}/${editing}`, { method: "PUT", body });
          else await api(endpoint, { method: "POST", body });
          toast("Đã lưu");
          go(path());
        } catch (err) {
          toast(err.message, true);
        }
      };
      $("#crud-del")?.addEventListener("click", async () => {
        if (!confirmAction("Xóa mục này?")) return;
        try {
          await api(`${endpoint}/${editing}`, { method: "DELETE" });
          toast("Đã xóa");
          go(path());
        } catch (err) {
          toast(err.message, true);
        }
      });
      extraToolbar && $("#instructor-reset-password")?.addEventListener("click", async () => {
        try {
          const r = await api(`${endpoint}/${editing}/reset-password`, { method: "POST", body: {} });
          if (!r.emailed) throw new Error(r.error || "Chưa gửi được email đặt lại mật khẩu");
          toast(`Đã gửi link đặt lại mật khẩu tới ${r.to}`);
        } catch (err) {
          toast(err.message, true);
        }
      });
    };
  }

  const viewVenues = simpleCrudPage({
    title: "Địa điểm",
    endpoint: "/venues",
    nameKey: "name",
    fields: [
      { key: "name", col: "name", label: "Tên" },
      { key: "city", col: "city", label: "Thành phố" },
      { key: "addressVi", col: "address_vi", label: "Địa chỉ VI", full: true },
      { key: "addressEn", col: "address_en", label: "Địa chỉ EN", full: true },
      { key: "mapUrl", col: "map_url", label: "Link bản đồ", full: true },
      { key: "notes", col: "notes", label: "Ghi chú", area: true, full: true },
    ],
  });

  const viewInstructors = simpleCrudPage({
    title: "Giảng viên",
    endpoint: "/instructors",
    nameKey: "name",
    extraToolbar: () =>
      canManageStaff()
        ? `<button type="button" class="btn" id="instructor-reset-password">Reset mật khẩu</button>`
        : "",
    fields: [
      { key: "name", col: "name", label: "Tên", required: true },
      { key: "email", col: "email", label: "Email đăng nhập", type: "email", required: true },
      {
        key: "temporaryPassword",
        col: "",
        label: "Mật khẩu tạm",
        type: "password",
        required: true,
        when: () => canManageStaff(),
      },
      { key: "academicTitle", col: "academic_title", label: "Học hàm" },
      { key: "role", col: "role", label: "Vai trò" },
      { key: "companyRole", col: "company_role", label: "Vai trò công ty" },
      { key: "photo", col: "photo", label: "Ảnh", full: true },
      { key: "bioVi", col: "bio_vi", label: "Tiểu sử tiếng Việt", area: true, full: true },
      { key: "bioEn", col: "bio_en", label: "Tiểu sử tiếng Anh", area: true, full: true },
      { key: "expertiseVi", col: "expertise_vi", label: "Chuyên môn VI", full: true },
      { key: "expertiseEn", col: "expertise_en", label: "Chuyên môn EN", full: true },
      { key: "website", col: "website", label: "Website" },
    ],
  });

  async function viewInsights() {
    $("#page-title").textContent = "Góc chia sẻ";
    const editing = parts()[2];
    const data = await api("/insights");
    if (!editing) {
      app.innerHTML = `<div class="toolbar"><a class="btn btn-primary" href="${href("/insights/new")}">+ Bài viết</a></div>
        ${table(
          ["Tiêu đề", "Chuyên mục", "Tiếng Việt", "Tiếng Anh", ""],
          data.items.map(
            (x) => `<tr><td><a href="${href(`/insights/${x.id}`)}">${esc(x.title_vi)}</a></td><td>${esc(x.category)}</td><td>${langDot(x.status_vi)}</td><td>${langDot(x.status_en)}</td><td><a href="${href(`/insights/${x.id}`)}">Sửa</a></td></tr>`,
          ),
        )}`;
      return;
    }
    const item = editing === "new" ? {} : data.items.find((x) => x.id === editing) || (await api(`/insights`).then((d) => d.items.find((x) => x.id === editing)));
    app.innerHTML = `<form id="ins-form" class="card" style="padding:18px">
      <div class="form-grid">
        <div class="field full"><label>Tiêu đề tiếng Việt</label><input name="titleVi" value="${esc(item?.title_vi || "")}" required /></div>
        <div class="field full"><label>Tiêu đề tiếng Anh</label><input name="titleEn" value="${esc(item?.title_en || "")}" /></div>
        <div class="field"><label>Đường dẫn tiếng Việt</label><input name="slugVi" value="${esc(item?.slug_vi || "")}" required /></div>
        <div class="field"><label>Đường dẫn tiếng Anh</label><input name="slugEn" value="${esc(item?.slug_en || "")}" /></div>
        <div class="field"><label>Chuyên mục</label><input name="category" value="${esc(item?.category || "")}" /></div>
        <div class="field"><label>Tác giả</label><input name="authorId" value="${esc(item?.author_id || "tran-anh-vu")}" /></div>
        <div class="field"><label>Trạng thái tiếng Việt</label><select name="statusVi">${opts(LANG_LABEL, item?.status_vi)}</select></div>
        <div class="field"><label>Trạng thái tiếng Anh</label><select name="statusEn">${opts(LANG_LABEL, item?.status_en)}</select></div>
        <div class="field full"><label>Tóm tắt tiếng Việt</label><textarea name="excerptVi">${esc(item?.excerpt_vi || "")}</textarea></div>
        <div class="field full"><label>Tóm tắt tiếng Anh</label><textarea name="excerptEn">${esc(item?.excerpt_en || "")}</textarea></div>
        <div class="field full"><label>Nội dung tiếng Việt</label><textarea name="contentVi" style="min-height:180px">${esc(item?.content_vi || "")}</textarea></div>
        <div class="field full"><label>Nội dung tiếng Anh</label><textarea name="contentEn" style="min-height:180px">${esc(item?.content_en || "")}</textarea></div>
      </div>
      <div class="toolbar" style="margin-top:12px">
        <button class="btn btn-primary" type="submit">Lưu</button>
        ${editing !== "new" ? `<button type="button" class="btn" id="ins-en">Tạo bản nháp tiếng Anh</button><button type="button" class="btn-danger" id="ins-del">Xóa</button>` : ""}
      </div>
    </form>`;
    $("#ins-form").onsubmit = async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.target).entries());
      try {
        if (editing === "new") {
          const r = await api("/insights", { method: "POST", body });
          toast("Đã tạo bài viết");
          go(href(`/insights/${r.id}`));
        } else {
          await api(`/insights/${editing}`, { method: "PUT", body });
          toast("Đã lưu bài viết");
        }
      } catch (err) {
        toast(err.message, true);
      }
    };
    $("#ins-en")?.addEventListener("click", async () => {
      await api(`/insights/${editing}/en-draft`, { method: "POST", body: {} });
      toast("Đã tạo bản nháp tiếng Anh");
      render();
    });
    $("#ins-del")?.addEventListener("click", async () => {
      if (!confirmAction("Xóa bài viết?")) return;
      await api(`/insights/${editing}`, { method: "DELETE" });
      go(href("/insights"));
    });
  }

  async function viewResources() {
    $("#page-title").textContent = "Tài liệu chuyên môn";
    const editing = parts()[2];
    const data = await api("/resources");
    if (!editing) {
      app.innerHTML = `<div class="toolbar"><a class="btn btn-primary" href="${href("/resources/new")}">+ Tài liệu</a></div>
        ${table(["Tiêu đề", "Chuyên mục", "Quyền xem", "Trạng thái"], data.items.map((x) => `<tr><td><a href="${href(`/resources/${x.id}`)}">${esc(x.title_vi)}</a></td><td>${esc(x.category)}</td><td>${esc(ACCESS_LABEL[x.access_type] || x.access_type)}</td><td>${badge(x.status)}</td></tr>`))}`;
      return;
    }
    const item = editing === "new" ? {} : data.items.find((x) => x.id === editing) || {};
    app.innerHTML = `<form id="res-form" class="card" style="padding:18px">
      <div class="form-grid">
        <div class="field full"><label>Tiêu đề tiếng Việt</label><input name="titleVi" value="${esc(item.title_vi || "")}" required /></div>
        <div class="field full"><label>Tiêu đề tiếng Anh</label><input name="titleEn" value="${esc(item.title_en || "")}" /></div>
        <div class="field"><label>Đường dẫn</label><input name="slug" value="${esc(item.slug || "")}" required /></div>
        <div class="field"><label>Chuyên mục</label><input name="category" value="${esc(item.category || "")}" /></div>
        <div class="field"><label>Quyền xem</label><select name="accessType">${opts(ACCESS_LABEL, item.access_type)}</select></div>
        <div class="field"><label>Trạng thái</label><select name="status">${opts({ draft: "Nháp", published: "Đã xuất bản", hidden: "Đã ẩn" }, item.status)}</select></div>
        <div class="field full"><label>Mô tả tiếng Việt</label><textarea name="descriptionVi">${esc(item.description_vi || "")}</textarea></div>
        <div class="field full"><label>Mô tả tiếng Anh</label><textarea name="descriptionEn">${esc(item.description_en || "")}</textarea></div>
        <div class="field"><label>Đường dẫn file</label><input name="fileUrl" value="${esc(item.file_url || "")}" /></div>
        <div class="field"><label>Link ngoài</label><input name="externalUrl" value="${esc(item.external_url || "")}" /></div>
      </div>
      <div class="toolbar" style="margin-top:12px"><button class="btn btn-primary">Lưu</button>
      ${editing !== "new" ? `<button type="button" class="btn-danger" id="res-del">Xóa</button>` : ""}</div>
    </form>`;
    $("#res-form").onsubmit = async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.target).entries());
      try {
        if (editing === "new") {
          const r = await api("/resources", { method: "POST", body });
          go(href(`/resources/${r.id}`));
        } else {
          await api(`/resources/${editing}`, { method: "PUT", body });
          toast("Đã lưu tài liệu");
        }
      } catch (err) {
        toast(err.message, true);
      }
    };
    $("#res-del")?.addEventListener("click", async () => {
      if (!confirmAction("Xóa tài liệu?")) return;
      await api(`/resources/${editing}`, { method: "DELETE" });
      go(href("/resources"));
    });
  }

  async function viewMedia() {
    $("#page-title").textContent = "Thư viện ảnh";
    const data = await api("/media");
    app.innerHTML = `
      <form class="toolbar" id="up">
        <input type="file" name="file" required />
        <input name="altVi" placeholder="Mô tả ảnh tiếng Việt" />
        <input name="altEn" placeholder="Mô tả ảnh tiếng Anh" />
        <button class="btn btn-primary">Tải lên</button>
      </form>
      <div class="media-grid">${data.items.map((m) => `
        <article class="media-card">
          ${m.mime.startsWith("image/") ? `<img src="${esc(m.url)}" alt="${esc(m.alt_vi)}" />` : `<p>${esc(m.original_name)}</p>`}
          <small>${esc(m.original_name)}</small>
          <button class="btn" data-copy="${esc(m.url)}">Sao chép đường dẫn</button>
          <button class="btn-danger" data-del="${m.id}">Xóa</button>
        </article>`).join("") || `<p class="empty">Chưa có file</p>`}</div>`;
    $("#up").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        await api("/media", { method: "POST", body: fd });
        toast("Đã upload");
        render();
      } catch (err) {
        toast(err.message, true);
      }
    };
    app.addEventListener("click", async (e) => {
      if (e.target.dataset.copy) {
        await navigator.clipboard.writeText(e.target.dataset.copy);
        toast("Đã sao chép");
      }
      if (e.target.dataset.del) {
        if (!confirmAction("Xóa file?")) return;
        await api(`/media/${e.target.dataset.del}`, { method: "DELETE" });
        render();
      }
    });
  }

  async function viewStudents() {
    $("#page-title").textContent = "Học viên";
    const q = new URLSearchParams(location.search).get("q") || "";
    const data = await api(`/students?q=${encodeURIComponent(q)}`);
    app.innerHTML = `
      <div class="toolbar">
        <input id="search" placeholder="Tên, email, SĐT" value="${esc(q)}" />
        ${canManageStaff() ? `<a class="btn btn-primary" href="${href("/students/new")}">+ Học viên</a>` : ""}
      </div>
      ${table(
        ["Tên", "Email", "SĐT", "Đang học", "Hoàn thành", "Trạng thái", "Ngày tạo", "Thao tác"],
        data.items.map(
          (s) => `<tr>
            <td><a href="${href(`/students/${s.id}`)}">${esc(s.full_name)}</a></td>
            <td>${esc(s.email)}</td>
            <td>${esc(s.phone || "")}</td>
            <td>${s.active_courses}</td>
            <td>${s.completed_courses}</td>
            <td>${badge(s.status)}</td>
            <td>${fmtDate(s.created_at)}</td>
            <td>${canManageStaff()
              ? `<a class="btn" href="${href(`/students/${s.id}`)}">Sửa</a> <button class="btn-danger" type="button" data-student-delete="${esc(s.id)}">Xóa</button>`
              : `<a class="btn" href="${href(`/students/${s.id}`)}">Xem</a>`}</td>
          </tr>`,
        ),
      )}`;
    $("#search").addEventListener("keydown", (e) => {
      if (e.key === "Enter") go(`${href("/students")}?q=${encodeURIComponent(e.target.value)}`);
    });
    app.querySelectorAll("[data-student-delete]").forEach((button) => button.addEventListener("click", async () => {
      if (!confirmAction("Xóa học viên này? Tài khoản sẽ bị vô hiệu và các lớp đang học sẽ bị hủy ghi danh.")) return;
      button.disabled = true;
      try {
        await api(`/students/${button.dataset.studentDelete}`, { method: "DELETE" });
        toast("Đã xóa học viên");
        render();
      } catch (err) {
        button.disabled = false;
        toast(err.message, true);
      }
    }));
  }

  async function viewStudent(id) {
    if (id === "new") {
      if (!canManageStaff()) {
        go(href("/students"));
        return;
      }
      $("#page-title").textContent = "Học viên mới";
      app.innerHTML = `<form id="stu-new" class="card" style="padding:18px;max-width:520px">
        <div class="field"><label>Họ tên</label><input name="fullName" required /></div>
        <div class="field"><label>Email đăng nhập</label><input name="email" type="email" required /></div>
        <div class="field"><label>Mật khẩu tạm</label><input name="temporaryPassword" type="password" minlength="8" required autocomplete="new-password" /></div>
        <p class="muted">Học viên đăng nhập bằng email và mật khẩu tạm, rồi bắt buộc đổi mật khẩu.</p>
        <div class="field"><label>Điện thoại</label><input name="phone" /></div>
        <button class="btn btn-primary">Tạo</button>
      </form>`;
      $("#stu-new").onsubmit = async (e) => {
        e.preventDefault();
        const button = e.target.querySelector('[type="submit"]');
        button.disabled = true;
        try {
          const body = Object.fromEntries(new FormData(e.target).entries());
          const r = await api("/students", { method: "POST", body });
          toast("Đã thêm học viên");
          go(href(`/students/${r.id}`));
        } catch (err) {
          button.disabled = false;
          toast(err.message, true);
        }
      };
      return;
    }
    $("#page-title").textContent = "Chi tiết học viên";
    const [d, sessions] = await Promise.all([api(`/students/${id}`), api("/sessions")]);
    const s = d.student;
    app.innerHTML = `
      <div class="tabs">
        <button data-tab="profile" class="active">Hồ sơ</button>
        <button data-tab="enroll">Ghi danh</button>
        <button data-tab="att">Điểm danh</button>
        <button data-tab="notes">Ghi chú</button>
        <button data-tab="certs">Chứng nhận</button>
        <button data-tab="activity">Hoạt động</button>
      </div>
      <section data-pane="profile">
        <form id="stu-form" class="card" style="padding:18px">
          <div class="form-grid">
            <div class="field"><label>Họ tên</label><input name="fullName" value="${esc(s.fullName)}" ${canManageStaff() ? "" : "disabled"} /></div>
            <div class="field"><label>Email</label><input value="${esc(s.email)}" disabled /></div>
            <div class="field"><label>Điện thoại</label><input name="phone" value="${esc(s.phone || "")}" ${canManageStaff() ? "" : "disabled"} /></div>
            <div class="field"><label>Trạng thái</label>
              ${canManageStaff() ? `<select name="status">${opts(STUDENT_LABEL, s.status)}</select>` : `<input value="${esc(STUDENT_LABEL[s.status] || s.status)}" disabled />`}
            </div>
          </div>
          <div class="toolbar">${canManageStaff() ? `<button class="btn btn-primary">Lưu</button>
            <button type="button" class="btn" id="student-reset-password">Reset mật khẩu</button>
            <button type="button" class="btn-danger" id="student-delete">Xóa</button>` : ""}</div>
        </form>
      </section>
      <section data-pane="enroll" class="hidden">
        ${table(
          canManageStaff() ? ["Khóa", "Lớp", "Trạng thái", "Thanh toán", "Chuyển lớp"] : ["Khóa", "Lớp", "Trạng thái", "Thanh toán"],
          d.enrollments.map(
            (e) => `<tr>
              <td>${esc(e.program_name)}</td>
              <td>${esc(e.session_name)}</td>
              <td>
                ${canManageStaff() ? `<select data-enr="${e.id}">${opts(ENROLL_LABEL, e.status)}</select>` : esc(ENROLL_LABEL[e.status] || e.status)}
              </td>
              <td>
                ${canManageStaff() ? `<select data-pay="${e.id}">${opts(PAY_LABEL, e.payment_status)}</select>` : esc(PAY_LABEL[e.payment_status] || e.payment_status)}
              </td>
              ${canManageStaff() ? `<td>
                <select data-move="${e.id}">
                  ${sessions.items.map((x) => `<option value="${x.id}" ${e.session_id === x.id ? "selected" : ""}>${esc(x.session_name)}</option>`).join("")}
                </select>
              </td>` : ""}
            </tr>`,
          ),
        )}
        ${canManageStaff() ? `<form id="enroll-form" class="toolbar">
          <select name="sessionId">${sessions.items.map((x) => `<option value="${x.id}">${esc(x.session_name)}</option>`).join("")}</select>
          <button class="btn btn-primary">Ghi danh</button>
        </form>` : ""}
      </section>
      <section data-pane="att" class="hidden">
        ${table(
          ["Buổi", "Ngày", "Trạng thái"],
          (d.meetings || []).map(
            (a) => `<tr>
              <td>${esc(a.title_vi)}</td>
              <td>${fmtDate(a.date)}</td>
              <td>
                <select data-att="${a.enrollment_id}" data-meeting="${a.id}">
                  ${opts(ATT_LABEL, a.attendance)}
                </select>
              </td>
            </tr>`,
          ),
          "Chưa có buổi học",
        )}
      </section>
      <section data-pane="notes" class="hidden">
        <form id="note-form" class="card" style="padding:18px">
          <textarea name="notes" ${canManageStaff() ? "" : "disabled"}>${esc(s.notes || "")}</textarea>
          ${canManageStaff() ? `<button class="btn btn-primary" style="margin-top:10px">Lưu ghi chú</button>` : ""}
        </form>
      </section>
      <section data-pane="activity" class="hidden">
        <div class="card" style="padding:18px">
          <p>Tạo tài khoản: ${fmtDate(s.createdAt)}</p>
          <p>Đăng nhập gần nhất: ${s.lastLoginAt ? fmtDate(s.lastLoginAt) : "Chưa đăng nhập"}</p>
          <p>Ghi danh: ${d.enrollments.length}</p>
        </div>
      </section>
      <section data-pane="certs" class="hidden">
        ${table(
          ["Mã", "Trạng thái", "Ngày cấp", ""],
          (d.certificates || []).map(
            (c) => `<tr>
              <td>${esc(c.certificate_code)}</td>
              <td>${badge(c.status)}</td>
              <td>${fmtDate(c.issue_date || c.issued_at)}</td>
              <td>
                ${c.status === "issued" && canManageStaff() ? `<a class="btn" href="/api/admin/certificates/${c.id}/pdf">PDF</a>
                <button class="btn" data-reissue="${c.id}">Cấp lại</button>
                <button class="btn-danger" data-revoke="${c.id}">Thu hồi</button>` : ""}
              </td>
            </tr>`,
          ),
          "Chưa có chứng nhận",
        )}
      </section>`;
    app.querySelectorAll("[data-tab]").forEach((b) =>
      b.addEventListener("click", () => {
        app.querySelectorAll("[data-tab]").forEach((x) => x.classList.toggle("active", x === b));
        app.querySelectorAll("[data-pane]").forEach((p) =>
          p.classList.toggle(
            "hidden",
            p.dataset.pane !== { profile: "profile", enroll: "enroll", att: "att", notes: "notes", certs: "certs", activity: "activity" }[b.dataset.tab],
          ),
        );
      }),
    );
    $("#stu-form").onsubmit = async (e) => {
      e.preventDefault();
      if (!canManageStaff()) return;
      const button = e.target.querySelector('[type="submit"]');
      if (button) button.disabled = true;
      try {
        await api(`/students/${id}`, { method: "PUT", body: Object.fromEntries(new FormData(e.target).entries()) });
        toast("Đã lưu");
      } catch (err) {
        toast(err.message, true);
      } finally {
        if (button) button.disabled = false;
      }
    };
    const deleteBtn = $("#student-delete");
    if (deleteBtn) {
      deleteBtn.onclick = async () => {
        if (!confirmAction("Xóa học viên này? Tài khoản sẽ bị vô hiệu và các lớp đang học sẽ bị hủy ghi danh.")) return;
        deleteBtn.disabled = true;
        try {
          await api(`/students/${id}`, { method: "DELETE" });
          toast("Đã xóa học viên");
          go(href("/students"));
        } catch (err) {
          deleteBtn.disabled = false;
          toast(err.message, true);
        }
      };
    }
    const resetBtn = $("#student-reset-password");
    if (resetBtn) {
      resetBtn.onclick = async () => {
        try {
          const r = await api(`/students/${id}/reset-password`, { method: "POST", body: {} });
          if (!r.emailed) throw new Error(r.error || "Chưa gửi được email đặt lại mật khẩu");
          toast(`Đã gửi link đặt lại mật khẩu tới ${r.to}`);
        } catch (err) {
          toast(err.message, true);
        }
      };
    }
    const enrollForm = $("#enroll-form");
    if (enrollForm) {
      enrollForm.onsubmit = async (e) => {
        e.preventDefault();
        await api(`/students/${id}/enroll`, { method: "POST", body: { sessionId: e.target.sessionId.value } });
        toast("Đã ghi danh");
        render();
      };
    }
    if (canManageStaff()) {
      app.querySelectorAll("[data-enr]").forEach((sel) =>
        sel.addEventListener("change", async () => {
          await api(`/enrollments/${sel.dataset.enr}`, { method: "PUT", body: { status: sel.value } });
          toast("Đã cập nhật ghi danh");
        }),
      );
      app.querySelectorAll("[data-pay]").forEach((sel) =>
        sel.addEventListener("change", async () => {
          await api(`/enrollments/${sel.dataset.pay}`, { method: "PUT", body: { paymentStatus: sel.value } });
          toast("Đã cập nhật thanh toán");
        }),
      );
      app.querySelectorAll("[data-move]").forEach((sel) =>
        sel.addEventListener("change", async () => {
          await api(`/enrollments/${sel.dataset.move}`, { method: "PUT", body: { sessionId: sel.value } });
          toast("Đã chuyển lớp");
          render();
        }),
      );
      $("#note-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        await api(`/students/${id}`, { method: "PUT", body: { notes: e.target.notes.value } });
        toast("Đã lưu ghi chú");
      });
    }
    app.querySelectorAll("[data-att]").forEach((sel) =>
      sel.addEventListener("change", async () => {
        await api("/attendance", {
          method: "PUT",
          body: { enrollmentId: sel.dataset.att, meetingId: sel.dataset.meeting, status: sel.value },
        });
        toast("Đã ghi nhận điểm danh");
      }),
    );
    app.querySelectorAll("[data-revoke]").forEach((b) =>
      b.addEventListener("click", async () => {
        const reason = prompt("Lý do thu hồi chứng nhận?");
        if (!reason) return;
        await api(`/certificates/${b.dataset.revoke}/revoke`, { method: "POST", body: { reason } });
        toast("Đã thu hồi");
        render();
      }),
    );
    app.querySelectorAll("[data-reissue]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirmAction("Cấp lại chứng nhận? Bản cũ sẽ chuyển sang trạng thái đã cấp lại.")) return;
        await api(`/certificates/${b.dataset.reissue}/reissue`, { method: "POST", body: {} });
        toast("Đã cấp lại");
        render();
      }),
    );
  }

  async function viewLearnerMaterials() {
    $("#page-title").textContent = "Tài liệu học tập";
    const editing = parts()[2];
    const [data, programs, sessions] = await Promise.all([api("/materials"), api("/programs"), api("/sessions")]);
    if (!editing) {
      app.innerHTML = `<div class="toolbar"><a class="btn btn-primary" href="${href("/materials/new")}">+ Tài liệu lớp</a></div>
        ${table(
          ["Tiêu đề", "Loại", "Phạm vi", "Giai đoạn"],
          data.items.map((x) => `<tr><td><a href="${href(`/materials/${x.id}`)}">${esc(x.title_vi)}</a></td><td>${esc(MATERIAL_TYPE[x.type] || x.type)}</td><td>${esc(VISIBILITY_LABEL[x.visibility] || x.visibility)}</td><td>${esc(PHASE_LABEL[x.phase] || x.phase)}</td></tr>`),
        )}`;
      return;
    }
    const item = editing === "new" ? {} : data.items.find((x) => x.id === editing) || {};
    app.innerHTML = `<form id="mat-form" class="card" style="padding:18px">
      <div class="form-grid">
        <div class="field full"><label>Tiêu đề tiếng Việt</label><input name="titleVi" value="${esc(item.title_vi || "")}" required /></div>
        <div class="field full"><label>Tiêu đề tiếng Anh</label><input name="titleEn" value="${esc(item.title_en || "")}" /></div>
        <div class="field full"><label>Mô tả tiếng Việt</label><textarea name="descriptionVi">${esc(item.description_vi || "")}</textarea></div>
        <div class="field full"><label>Mô tả tiếng Anh</label><textarea name="descriptionEn">${esc(item.description_en || "")}</textarea></div>
        <div class="field"><label>Loại</label><select name="type">${opts(MATERIAL_TYPE, item.type)}</select></div>
        <div class="field"><label>Giai đoạn</label><select name="phase">${[["before","Trước buổi"],["during","Trong khóa"],["after","Sau buổi"]].map(([v,l]) => `<option value="${v}" ${item.phase === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>
        <div class="field"><label>Phạm vi hiển thị</label><select name="visibility">${opts(VISIBILITY_LABEL, item.visibility)}</select></div>
        <div class="field"><label>Khóa học</label><select name="programId"><option value="">—</option>${programs.items.map((p) => `<option value="${p.id}" ${item.program_id === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></div>
        <div class="field"><label>Lớp học</label><select name="sessionId"><option value="">—</option>${sessions.items.map((s) => `<option value="${s.id}" ${item.session_id === s.id ? "selected" : ""}>${esc(s.session_name)}</option>`).join("")}</select></div>
        <div class="field full"><label>Link ngoài</label><input name="externalUrl" value="${esc(item.external_url || "")}" /></div>
        <div class="field full"><label>Tải file lên</label><input type="file" name="file" /></div>
      </div>
      <div class="toolbar"><button class="btn btn-primary">Lưu</button>
      ${editing !== "new" && canManageStaff() ? `<button type="button" class="btn-danger" id="mat-del">Xóa</button>` : ""}</div>
    </form>`;
    $("#mat-form").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        if (editing === "new") {
          const r = await api("/materials", { method: "POST", body: fd });
          go(href(`/materials/${r.id}`));
        } else {
          const body = Object.fromEntries(fd.entries());
          delete body.file;
          await api(`/materials/${editing}`, { method: "PUT", body });
          toast("Đã lưu tài liệu");
        }
      } catch (err) {
        toast(err.message, true);
      }
    };
    $("#mat-del")?.addEventListener("click", async () => {
      if (!confirmAction("Xóa tài liệu?")) return;
      await api(`/materials/${editing}`, { method: "DELETE" });
      go(href("/materials"));
    });
  }

  async function viewAdminAnnouncements() {
    $("#page-title").textContent = "Thông báo";
    const editing = parts()[2];
    const [data, programs, sessions] = await Promise.all([api("/announcements"), api("/programs"), api("/sessions")]);
    if (!editing) {
      app.innerHTML = `<div class="toolbar"><a class="btn btn-primary" href="${href("/announcements/new")}">+ Thông báo</a></div>
        ${table(
          ["Tiêu đề", "Đối tượng", "Mức ưu tiên", "Thao tác"],
          data.items.map((x) => `<tr>
            <td><a href="${href(`/announcements/${x.id}`)}">${esc(x.title_vi)}</a></td>
            <td>${esc(TARGET_LABEL[x.target_type] || x.target_type)}</td>
            <td>${esc(PRIORITY_LABEL[x.priority] || x.priority)}</td>
            <td>${canManageStaff()
              ? `<a class="btn" href="${href(`/announcements/${x.id}`)}">Sửa</a> <button class="btn-danger" type="button" data-ann-delete="${esc(x.id)}">Xóa</button>`
              : `<a class="btn" href="${href(`/announcements/${x.id}`)}">Sửa</a>`}</td>
          </tr>`),
        )}`;
      app.querySelectorAll("[data-ann-delete]").forEach((button) => button.addEventListener("click", async () => {
        if (!confirmAction("Xóa thông báo này?")) return;
        button.disabled = true;
        try {
          await api(`/announcements/${button.dataset.annDelete}`, { method: "DELETE" });
          toast("Đã xóa thông báo");
          render();
        } catch (err) {
          button.disabled = false;
          toast(err.message, true);
        }
      }));
      return;
    }
    const item = editing === "new" ? {} : data.items.find((x) => x.id === editing) || {};
    app.innerHTML = `<form id="ann-form" class="card" style="padding:18px">
      <div class="form-grid">
        <div class="field full"><label>Tiêu đề tiếng Việt</label><input name="titleVi" value="${esc(item.title_vi || "")}" required /></div>
        <div class="field full"><label>Tiêu đề tiếng Anh</label><input name="titleEn" value="${esc(item.title_en || "")}" /></div>
        <div class="field full"><label>Nội dung VI</label><textarea name="contentVi">${esc(item.content_vi || "")}</textarea></div>
        <div class="field full"><label>Nội dung EN</label><textarea name="contentEn">${esc(item.content_en || "")}</textarea></div>
        <div class="field"><label>Đối tượng</label><select name="targetType">${opts(isInstructor() ? { program: "Khóa học", session: "Lớp học", student: "Học viên" } : TARGET_LABEL, item.target_type || "session")}</select></div>
        <div class="field"><label>Mức ưu tiên</label><select name="priority">${opts(PRIORITY_LABEL, item.priority || "normal")}</select></div>
        <div class="field"><label>Khóa học</label><select name="programId"><option value="">—</option>${programs.items.map((p) => `<option value="${p.id}" ${item.program_id === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></div>
        <div class="field"><label>Lớp học</label><select name="sessionId"><option value="">—</option>${sessions.items.map((s) => `<option value="${s.id}" ${item.session_id === s.id ? "selected" : ""}>${esc(s.session_name)}</option>`).join("")}</select></div>
        <div class="field"><label>Mã học viên (nếu gửi cho một người)</label><input name="studentId" value="${esc(item.student_id || "")}" /></div>
      </div>
      <div class="toolbar"><button class="btn btn-primary">Đăng</button>
      ${editing !== "new" && canManageStaff() ? `<button type="button" class="btn-danger" id="ann-del">Xóa</button>` : ""}</div>
    </form>`;
    $("#ann-form").onsubmit = async (e) => {
      e.preventDefault();
      const button = e.target.querySelector('[type="submit"]');
      if (button) button.disabled = true;
      const body = Object.fromEntries(new FormData(e.target).entries());
      try {
        if (editing === "new") {
          const r = await api("/announcements", { method: "POST", body });
          toast("Đã thêm thông báo");
          go(href(`/announcements/${r.id}`));
        } else {
          await api(`/announcements/${editing}`, { method: "PUT", body });
          toast("Đã lưu thông báo");
        }
      } catch (err) {
        toast(err.message, true);
      } finally {
        if (button) button.disabled = false;
      }
    };
    $("#ann-del")?.addEventListener("click", async () => {
      if (!confirmAction("Xóa thông báo này?")) return;
      const button = $("#ann-del");
      button.disabled = true;
      try {
        await api(`/announcements/${editing}`, { method: "DELETE" });
        toast("Đã xóa thông báo");
        go(href("/announcements"));
      } catch (err) {
        button.disabled = false;
        toast(err.message, true);
      }
    });
  }

  async function viewEnrollments() {
    $("#page-title").textContent = "Ghi danh";
    const q = new URLSearchParams(location.search).get("q") || "";
    const data = await api(`/enrollments?q=${encodeURIComponent(q)}`);
    app.innerHTML = `
      <div class="toolbar">
        <input id="search" placeholder="Học viên, email, khóa" value="${esc(q)}" />
        ${canManageStaff() ? `<a class="btn btn-primary" href="${href("/enrollments/new")}">+ Ghi danh</a>` : ""}
      </div>
      ${table(
        ["Học viên", "Khóa", "Lớp", "Trạng thái", "Thanh toán", "Tiến độ", "Chứng nhận", "Thao tác"],
        data.items.map(
          (e) => `<tr>
            <td><a href="${href(`/students/${e.student_id}`)}">${esc(e.student_name)}</a><br><small>${esc(e.student_email || "")}</small></td>
            <td>${esc(e.program_name)}</td>
            <td>${esc(e.session_name)}</td>
            <td>${badge(e.status)}</td>
            <td>${badge(e.payment_status)}</td>
            <td>${e.progress?.percent ?? e.progress}%</td>
            <td>${badge(e.eligibility?.certificateStatus || e.certificate_status || "none")}</td>
            <td>${canManageStaff()
              ? `<a class="btn" href="${href(`/enrollments/${e.id}`)}">Sửa</a> <button class="btn-danger" type="button" data-enroll-delete="${esc(e.id)}">Xóa</button>`
              : `<a class="btn" href="${href(`/enrollments/${e.id}`)}">Xem</a>`}</td>
          </tr>`,
        ),
      )}`;
    $("#search").addEventListener("keydown", (e) => {
      if (e.key === "Enter") go(`${href("/enrollments")}?q=${encodeURIComponent(e.target.value)}`);
    });
    app.querySelectorAll("[data-enroll-delete]").forEach((button) => button.addEventListener("click", async () => {
      if (!confirmAction("Xóa ghi danh này? Bản ghi sẽ bị ẩn khỏi danh sách.")) return;
      button.disabled = true;
      try {
        await api(`/enrollments/${button.dataset.enrollDelete}`, { method: "DELETE" });
        toast("Đã xóa ghi danh");
        render();
      } catch (err) {
        button.disabled = false;
        toast(err.message, true);
      }
    }));
  }

  async function viewEnrollment(id) {
    const isNew = id === "new";
    if (isNew && !canManageStaff()) {
      go(href("/enrollments"));
      return;
    }
    $("#page-title").textContent = isNew ? "Thêm ghi danh" : "Sửa ghi danh";
    const [row, students, sessions] = await Promise.all([
      isNew ? Promise.resolve({ status: "active", payment_status: "paid", notes: "" }) : api(`/enrollments/${id}`),
      api("/students"),
      api("/sessions"),
    ]);
    app.innerHTML = `
      <form class="card" style="padding:18px" id="enr-form">
        <div class="form-grid">
          <div class="field"><label>Học viên</label>
            ${isNew
              ? `<select name="studentId" required ${canManageStaff() ? "" : "disabled"}><option value="">Chọn học viên</option>${(students.items || []).map((s) => `<option value="${esc(s.id)}">${esc(s.full_name)} · ${esc(s.email)}</option>`).join("")}</select>`
              : `<input value="${esc(row.student_name || "")} · ${esc(row.student_email || "")}" disabled />`}
          </div>
          <div class="field"><label>Lớp học</label>
            <select name="sessionId" required ${canManageStaff() ? "" : "disabled"}>
              <option value="">Chọn lớp</option>
              ${(sessions.items || []).map((s) => `<option value="${esc(s.id)}" ${row.session_id === s.id ? "selected" : ""}>${esc(s.session_name)}</option>`).join("")}
            </select>
          </div>
          <div class="field"><label>Trạng thái</label>
            <select name="status" ${canManageStaff() ? "" : "disabled"}>${opts(ENROLL_LABEL, row.status)}</select>
          </div>
          <div class="field"><label>Thanh toán</label>
            <select name="paymentStatus" ${canManageStaff() ? "" : "disabled"}>${opts(PAY_LABEL, row.payment_status)}</select>
          </div>
          <div class="field full"><label>Ghi chú</label>
            <textarea name="notes" ${canManageStaff() ? "" : "disabled"}>${esc(row.notes || "")}</textarea>
          </div>
        </div>
        ${canManageStaff() ? `<div class="toolbar"><button class="btn btn-primary" type="submit">${isNew ? "Thêm ghi danh" : "Lưu thay đổi"}</button>${isNew ? "" : `<button class="btn-danger" type="button" id="enr-delete">Xóa</button>`}</div>` : ""}
      </form>`;
    if (canManageStaff()) {
      $("#enr-form").onsubmit = async (e) => {
        e.preventDefault();
        const button = e.target.querySelector('[type="submit"]');
        button.disabled = true;
        try {
          const body = {
            studentId: val(e.target, "studentId"),
            sessionId: val(e.target, "sessionId"),
            status: val(e.target, "status"),
            paymentStatus: val(e.target, "paymentStatus"),
            notes: val(e.target, "notes") || "",
          };
          const data = await api(isNew ? "/enrollments" : `/enrollments/${id}`, {
            method: isNew ? "POST" : "PUT",
            body,
          });
          toast(isNew ? "Đã thêm ghi danh" : "Đã cập nhật ghi danh");
          go(href(isNew ? `/enrollments/${data.id}` : "/enrollments"));
        } catch (err) {
          button.disabled = false;
          toast(err.message, true);
        }
      };
    }
    if (!isNew && canManageStaff()) {
      $("#enr-delete").onclick = async () => {
        if (!confirmAction("Xóa ghi danh này? Bản ghi sẽ bị ẩn khỏi danh sách.")) return;
        try {
          await api(`/enrollments/${id}`, { method: "DELETE" });
          toast("Đã xóa ghi danh");
          go(href("/enrollments"));
        } catch (err) {
          toast(err.message, true);
        }
      };
    }
  }

  async function viewCertificates() {
    $("#page-title").textContent = "Chứng nhận";
    const data = await api("/certificates");
    app.innerHTML = table(
      ["Mã", "Học viên", "Chương trình", "Trạng thái", "Ngày cấp", ""],
      data.items.map(
        (c) => `<tr>
          <td>${esc(c.certificate_code)}</td>
          <td><a href="${href(`/students/${c.student_id}`)}">${esc(c.student_name_snapshot)}</a></td>
          <td>${esc(c.program_name_vi_snapshot)}</td>
          <td>${badge(c.status)}</td>
          <td>${fmtDate(c.issue_date)}</td>
          <td>
            ${c.status === "issued" ? `<a class="btn" href="/verify/${esc(c.certificate_code)}" target="_blank">Xác minh</a>
            <a class="btn" href="/api/admin/certificates/${c.id}/pdf">PDF</a>
            <button class="btn" data-reissue="${c.id}">Cấp lại</button>
            <button class="btn-danger" data-revoke="${c.id}">Thu hồi</button>` : ""}
          </td>
        </tr>`,
      ),
      "Chưa cấp chứng nhận",
    );
    app.querySelectorAll("[data-revoke]").forEach((b) =>
      b.addEventListener("click", async () => {
        const reason = prompt("Lý do thu hồi?");
        if (!reason) return;
        await api(`/certificates/${b.dataset.revoke}/revoke`, { method: "POST", body: { reason } });
        render();
      }),
    );
    app.querySelectorAll("[data-reissue]").forEach((b) =>
      b.addEventListener("click", async () => {
        await api(`/certificates/${b.dataset.reissue}/reissue`, { method: "POST", body: {} });
        render();
      }),
    );
  }

  async function viewCertificateTemplates() {
    $("#page-title").textContent = "Mẫu chứng nhận";
    const editing = parts()[2];
    const data = await api("/certificate-templates");
    if (!editing) {
      app.innerHTML = `<div class="toolbar"><a class="btn btn-primary" href="${href("/certificate-templates/new")}">+ Mẫu mới</a></div>
        ${table(
          ["Tên", "Ngôn ngữ", "Trạng thái", "Phiên bản"],
          data.items.map((x) => `<tr><td><a href="${href(`/certificate-templates/${x.id}`)}">${esc(x.name)}</a></td><td>${esc(x.language)}</td><td>${badge(x.status)}</td><td>${esc(x.version)}</td></tr>`),
        )}`;
      return;
    }
    const item = editing === "new" ? {} : data.items.find((x) => x.id === editing) || data.items[0] || {};
    app.innerHTML = `<form id="tpl-form" class="card" style="padding:18px">
      <div class="form-grid">
        <div class="field"><label>Tên mẫu</label><input name="name" value="${esc(item.name || "")}" required /></div>
        <div class="field"><label>Ngôn ngữ</label><select name="language">${optList([["vi","Tiếng Việt"],["en","Tiếng Anh"]], item.language || "vi")}</select></div>
        <div class="field full"><label>Tiêu đề tiếng Việt</label><input name="titleVi" value="${esc(item.title_vi || "")}" /></div>
        <div class="field full"><label>Tiêu đề tiếng Anh</label><input name="titleEn" value="${esc(item.title_en || "")}" /></div>
        <div class="field full"><label>Nội dung tiếng Việt</label><textarea name="bodyVi">${esc(item.body_vi || "")}</textarea></div>
        <div class="field full"><label>Nội dung tiếng Anh</label><textarea name="bodyEn">${esc(item.body_en || "")}</textarea></div>
        <div class="field"><label>Người ký 1</label><input name="signer1Name" value="${esc(item.signer1_name || "")}" /></div>
        <div class="field"><label>Chức danh người ký 1</label><input name="signer1Title" value="${esc(item.signer1_title || "")}" /></div>
        <div class="field"><label>Người ký 2</label><input name="signer2Name" value="${esc(item.signer2_name || "")}" /></div>
        <div class="field"><label>Chức danh người ký 2</label><input name="signer2Title" value="${esc(item.signer2_title || "")}" /></div>
        <div class="field full"><label>Chân trang tiếng Việt</label><textarea name="footerVi">${esc(item.footer_vi || "")}</textarea></div>
        <div class="field full"><label>Chân trang tiếng Anh</label><textarea name="footerEn">${esc(item.footer_en || "")}</textarea></div>
        <div class="field"><label>Trạng thái</label><select name="status">${opts({ published: "Đã xuất bản", draft: "Nháp" }, item.status || "draft")}</select></div>
      </div>
      <button class="btn btn-primary" style="margin-top:12px">Lưu mẫu</button>
    </form>`;
    $("#tpl-form").onsubmit = async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.target).entries());
      if (editing === "new") {
        const r = await api("/certificate-templates", { method: "POST", body });
        go(href(`/certificate-templates/${r.id}`));
      } else {
        await api(`/certificate-templates/${editing}`, { method: "PUT", body });
        toast("Đã lưu mẫu");
      }
    };
  }

  async function viewSettings() {
    $("#page-title").textContent = "Cài đặt";
    if (state.user.role !== "OWNER") {
      app.innerHTML = `<p class="empty">Chỉ chủ sở hữu mới sửa cấu hình hệ thống.</p>`;
      return;
    }
    const s = await api("/settings");
    const c = s.contact || {};
    const seo = s.seo || {};
    const reg = s.registration || {};
    const footer = s.footer || {};
    app.innerHTML = `<form id="set-form" class="card" style="padding:18px">
      <h2>Liên hệ</h2>
      <div class="form-grid">
        <div class="field"><label>Email</label><input name="email" value="${esc(c.email || "")}" /></div>
        <div class="field"><label>Điện thoại</label><input name="phone" value="${esc(c.phone || "")}" /></div>
        <div class="field"><label>Zalo</label><input name="zalo" value="${esc(c.zalo || "")}" /></div>
        <div class="field"><label>Website</label><input name="website" value="${esc(c.website || "")}" /></div>
        <div class="field full"><label>Địa chỉ</label><input name="address" value="${esc(c.address || "")}" /></div>
      </div>
      <h2>SEO</h2>
      <div class="form-grid">
        <div class="field full"><label>Tiêu đề trang tiếng Việt</label><input name="titleVi" value="${esc(seo.titleVi || "")}" /></div>
        <div class="field full"><label>Tiêu đề trang tiếng Anh</label><input name="titleEn" value="${esc(seo.titleEn || "")}" /></div>
        <div class="field full"><label>Mô tả tiếng Việt</label><textarea name="descriptionVi">${esc(seo.descriptionVi || "")}</textarea></div>
        <div class="field full"><label>Mô tả tiếng Anh</label><textarea name="descriptionEn">${esc(seo.descriptionEn || "")}</textarea></div>
      </div>
      <h2>Chân trang</h2>
      <div class="form-grid">
        <div class="field"><label>Chân trang tiếng Việt</label><input name="footerVi" value="${esc(footer.vi || "")}" /></div>
        <div class="field"><label>Chân trang tiếng Anh</label><input name="footerEn" value="${esc(footer.en || "")}" /></div>
      </div>
      <h2>Đăng ký</h2>
      <div class="form-grid">
        <div class="field full"><label>Lời xác nhận tiếng Việt</label><textarea name="confirmationVi">${esc(reg.confirmationVi || "")}</textarea></div>
        <div class="field full"><label>Lời xác nhận tiếng Anh</label><textarea name="confirmationEn">${esc(reg.confirmationEn || "")}</textarea></div>
        <div class="field full"><label>Liên hệ hỗ trợ</label><input name="supportContact" value="${esc(reg.supportContact || "")}" /></div>
      </div>
      <button class="btn btn-primary" style="margin-top:16px">Lưu cài đặt</button>
    </form>`;
    $("#set-form").onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target;
      try {
        await api("/settings", {
          method: "PUT",
          body: {
            contact: { ...c, email: val(f, "email"), phone: val(f, "phone"), zalo: val(f, "zalo"), website: val(f, "website"), address: val(f, "address") },
            seo: { titleVi: val(f, "titleVi"), titleEn: val(f, "titleEn"), descriptionVi: val(f, "descriptionVi"), descriptionEn: val(f, "descriptionEn") },
            footer: { vi: val(f, "footerVi"), en: val(f, "footerEn") },
            registration: { ...reg, confirmationVi: val(f, "confirmationVi"), confirmationEn: val(f, "confirmationEn"), supportContact: val(f, "supportContact") },
          },
        });
        toast("Đã lưu cài đặt");
      } catch (err) {
        toast(err.message, true);
      }
    };
  }

  async function render() {
    applyChrome();
    const p = path();
    const route = segs();
    if (!state.user) {
      const resetting = route[0] === "dat-lai-mat-khau";
      $("#login-view").classList.toggle("hidden", resetting);
      $("#password-view").classList.add("hidden");
      $("#reset-view").classList.toggle("hidden", !resetting);
      $("#shell").classList.add("hidden");
      if (resetting) return;
      captureNext();
      if (route[0] !== "login") history.replaceState({}, "", href("/login"));
      return;
    }
    $("#reset-view")?.classList.add("hidden");
    const dest = destForUser(state.user);
    if (dest !== p + location.search && dest !== p) {
      history.replaceState({}, "", dest);
    }
    if (state.user.mustChangePassword) {
      $("#login-view").classList.add("hidden");
      $("#password-view").classList.remove("hidden");
      $("#shell").classList.add("hidden");
      if (route[0] !== "change-password") history.replaceState({}, "", href("/change-password"));
      return;
    }
    $("#login-view").classList.add("hidden");
    $("#password-view").classList.add("hidden");
    $("#shell").classList.remove("hidden");
    layout();
    const key = segs()[0] || "";
    const id = segs()[1];
    app.innerHTML = `<p class="empty">Đang tải…</p>`;
    try {
      if (!key || key === "login") return viewDashboard();
      if (key === "programs" && id) return viewProgram(id);
      if (key === "programs") return viewPrograms();
      if (key === "sessions" && id) return viewSession(id);
      if (key === "sessions") return viewSessions();
      if (key === "registrations" && id) return viewRegistration(id);
      if (key === "registrations") return viewRegistrations();
      if (key === "students" && id) return viewStudent(id);
      if (key === "students") return viewStudents();
      if (key === "enrollments" && id) return viewEnrollment(id);
      if (key === "enrollments") return viewEnrollments();
      if (key === "materials") return viewLearnerMaterials();
      if (key === "announcements") return viewAdminAnnouncements();
      if (key === "certificates") return viewCertificates();
      if (key === "certificate-templates") return viewCertificateTemplates();
      if (key === "instructors") return viewInstructors();
      if (key === "venues") return viewVenues();
      if (key === "insights") return viewInsights();
      if (key === "resources") return viewResources();
      if (key === "media") return viewMedia();
      if (key === "settings") return viewSettings();
      app.innerHTML = `<p class="empty">Không tìm thấy trang.</p>`;
    } catch (err) {
      app.innerHTML = `<p class="empty">${esc(err.message)}</p>`;
    }
  }

  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("#login-error").textContent = "";
    try {
      const data = await api("/login", {
        method: "POST",
        body: { email: $("#email").value, password: $("#password").value },
      });
      state.user = data.user;
      const dest = destForUser(data.user);
      history.replaceState({}, "", dest);
      render();
    } catch (err) {
      $("#login-error").textContent = err.message;
    }
  });
  $("#password-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("#password-error").textContent = "";
    try {
      const data = await api("/change-password", {
        method: "POST",
        body: {
          currentPassword: $("#current-password").value,
          newPassword: $("#new-password").value,
          confirmPassword: $("#confirm-password").value,
        },
      });
      state.user = data.user;
      toast("Đã đổi mật khẩu");
      history.replaceState({}, "", destForUser(data.user));
      render();
    } catch (err) {
      $("#password-error").textContent = err.message;
    }
  });
  $("#reset-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    $("#reset-error").textContent = "";
    try {
      const token = new URLSearchParams(location.search).get("token") || "";
      await api("/reset-password", {
        method: "POST",
        body: {
          token,
          newPassword: $("#reset-new-password").value,
          confirmPassword: $("#reset-confirm").value,
        },
      });
      toast("Đã đặt mật khẩu mới. Đăng nhập lại.");
      history.replaceState({}, "", href("/login"));
      render();
    } catch (err) {
      $("#reset-error").textContent = err.message;
    }
  });
  $("#logout").addEventListener("click", async () => {
    await api("/logout", { method: "POST", body: {} });
    state.user = null;
    go(href("/login"));
  });

  (async () => {
    try {
      const me = await fetch("/api/admin/me", { credentials: "include" }).then((r) => (r.ok ? r.json() : null));
      state.user = me?.user || null;
    } catch {
      state.user = null;
    }
    render();
  })();
})();
