(() => {
  const NAV = [
    ["Dashboard", "/admin"],
    ["Programs", "/admin/programs"],
    ["Sessions", "/admin/sessions"],
    ["Registrations", "/admin/registrations"],
    ["Students", "/admin/students"],
    ["Enrollments", "/admin/enrollments"],
    ["Materials", "/admin/materials"],
    ["Announcements", "/admin/announcements"],
    ["Certificates", "/admin/certificates"],
    ["Cert. templates", "/admin/certificate-templates"],
    ["Instructors", "/admin/instructors"],
    ["Insights", "/admin/insights"],
    ["Resources", "/admin/resources"],
    ["Media", "/admin/media"],
    ["Venues", "/admin/venues"],
    ["Settings", "/admin/settings"],
  ];
  const INSTRUCTOR_NAV = [
    ["Sessions", "/admin/sessions"],
    ["Students", "/admin/students"],
    ["Materials", "/admin/materials"],
    ["Announcements", "/admin/announcements"],
  ];
  const SESSION_LABEL = {
    draft: "Draft",
    open: "Registration Open",
    upcoming: "Opening Soon",
    limited: "Limited Seats",
    full: "Full",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  const REG_LABEL = {
    new: "New",
    contacted: "Contacted",
    pending_payment: "Pending Payment",
    paid: "Paid",
    confirmed: "Confirmed",
    waitlist: "Waitlist",
    cancelled: "Cancelled",
    completed: "Completed",
  };
  const LANG_LABEL = {
    not_created: "Not created",
    ai_draft: "AI Draft",
    review: "Ready for review",
    published: "Published",
    draft: "Draft",
  };

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
      history.replaceState({}, "", "/admin/login");
      render();
      throw new Error("Unauthorized");
    }
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (res.status === 403 && data.code === "MUST_CHANGE_PASSWORD") {
      if (state.user) state.user.mustChangePassword = true;
      render();
      throw new Error(data.error || "Cần đổi mật khẩu trước khi tiếp tục");
    }
    if (!res.ok) throw new Error(data.error || res.statusText);
    return data;
  }

  function path() {
    return location.pathname.replace(/\/$/, "") || "/admin";
  }
  function parts() {
    return path().split("/").filter(Boolean);
  }
  function fmtPrice(n) {
    return `${String(n || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}đ`;
  }
  function fmtDate(d) {
    if (!d) return "—";
    return String(d).slice(0, 10).split("-").reverse().join("/");
  }
  function badge(status) {
    return `<span class="badge ${status || ""}">${SESSION_LABEL[status] || LANG_LABEL[status] || REG_LABEL[status] || status || "—"}</span>`;
  }
  function langDot(status) {
    return `<span class="dot ${status === "published" ? "on" : "off"}"></span>${LANG_LABEL[status] || status}`;
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
    const a = e.target.closest("a[href^='/admin']");
    if (!a || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    go(a.getAttribute("href"));
  });
  window.addEventListener("popstate", render);

  function layout() {
    const items = state.user.role === "INSTRUCTOR" ? INSTRUCTOR_NAV : NAV;
    $("#nav").innerHTML = items.map(([label, href]) => {
      const active = href === "/admin" ? path() === "/admin" : path().startsWith(href);
      return `<a href="${href}" class="${active ? "active" : ""}">${label}</a>`;
    }).join("");
    $("#who").textContent = `${state.user.name} · ${state.user.role}`;
  }

  function table(headers, rows, empty = "Không có dữ liệu") {
    if (!rows.length) return `<div class="card"><p class="empty">${empty}</p></div>`;
    return `<div class="card"><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
  }

  async function viewDashboard() {
    $("#page-title").textContent = "Tổng quan";
    const d = await api("/dashboard");
    const s = d.stats;
    app.innerHTML = `
      <div class="stats">
        <div class="stat"><b>${s.programs}</b><span>Chương trình</span></div>
        <div class="stat"><b>${s.upcoming}</b><span>Lớp sắp khai giảng</span></div>
        <div class="stat"><b>${s.openReg}</b><span>Lớp đang mở đăng ký</span></div>
        <div class="stat"><b>${s.registrations}</b><span>Tổng đăng ký</span></div>
        <div class="stat"><b>${s.newRegs}</b><span>Đăng ký mới</span></div>
        <div class="stat"><b>${s.learners}</b><span>Học viên</span></div>
        <div class="stat"><b>${s.drafts}</b><span>Bài viết draft</span></div>
        <div class="stat"><b>${s.enIncomplete}</b><span>English chưa hoàn thiện</span></div>
      </div>
      <div class="grid-2">
        <div class="card">
          <h2>Lớp sắp khai giảng</h2>
          ${table(
            ["Lớp", "Ngày", "Chỗ", "Đăng ký", "Trạng thái"],
            d.upcoming.map(
              (x) =>
                `<tr><td><a href="/admin/sessions/${x.id}">${esc(x.programName)}</a></td><td>${fmtDate(x.start_date)}</td><td>${x.capacity ?? "—"}</td><td>${x.registered_count}</td><td>${badge(x.status)}</td></tr>`,
            ),
          )}
        </div>
        <div class="card">
          <h2>Đăng ký mới nhất</h2>
          ${table(
            ["Tên", "Khóa", "Lớp", "Ngày", "Trạng thái"],
            d.latestRegs.map(
              (x) =>
                `<tr><td><a href="/admin/registrations/${x.id}">${esc(x.full_name)}</a></td><td>${esc(x.programName || "")}</td><td>${esc(x.session_name || "")}</td><td>${fmtDate(x.created_at)}</td><td>${badge(x.status)}</td></tr>`,
            ),
          )}
        </div>
      </div>`;
  }

  async function viewPrograms() {
    $("#page-title").textContent = "Programs";
    const q = new URLSearchParams(location.search).get("q") || "";
    const data = await api(`/programs?q=${encodeURIComponent(q)}`);
    app.innerHTML = `
      <div class="toolbar">
        <input id="search" placeholder="Tìm khóa học" value="${esc(q)}" />
        <a class="btn btn-primary" href="/admin/programs/new">+ Khóa mới</a>
      </div>
      ${table(
        ["Tên khóa", "Level", "Hình thức", "Giá", "Trạng thái", "VI", "EN", ""],
        data.items.map(
          (p) => `<tr>
            <td><a href="/admin/programs/${p.id}">${esc(p.name)}</a></td>
            <td>${esc(p.level || "")}</td>
            <td>${esc(p.format)}</td>
            <td>${fmtPrice(p.price)}</td>
            <td>${badge(p.status)}</td>
            <td>${langDot(p.statusVi)}</td>
            <td>${langDot(p.statusEn)}</td>
            <td><a href="/admin/programs/${p.id}">Sửa</a></td>
          </tr>`,
        ),
      )}`;
    $("#search").addEventListener("keydown", (e) => {
      if (e.key === "Enter") go(`/admin/programs?q=${encodeURIComponent(e.target.value)}`);
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
      ["vi", "Nội dung VI"],
      ["en", "Content EN"],
      ["curriculum", "Chương trình"],
      ["outcomes", "Kết quả"],
      ["faq", "FAQ"],
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
            <div class="field"><label>Program ID</label><input name="id" value="${esc(p.id || "")}" ${isNew ? "" : "readonly"} required /></div>
            <div class="field"><label>Slug VI</label><input name="slugVi" value="${esc(p.slug_vi || "")}" required /></div>
            <div class="field"><label>Slug EN</label><input name="slugEn" value="${esc(p.slug_en || "")}" /></div>
            <div class="field"><label>Level</label>
              <select name="levelKey">
                ${["beginner", "foundation", "advanced", "workshop"].map((x) => `<option ${p.level_key === x ? "selected" : ""}>${x}</option>`).join("")}
              </select>
            </div>
            <div class="field"><label>Giá (VND)</label><input name="priceAmount" type="number" value="${p.price_amount || 0}" /></div>
            <div class="field"><label>Hình thức</label>
              <select name="format">${["online", "offline", "hybrid"].map((x) => `<option ${p.format === x ? "selected" : ""}>${x}</option>`).join("")}</select>
            </div>
            <div class="field"><label>Thời lượng VI</label><input name="durationLabelVi" value="${esc(p.duration_label_vi || "")}" /></div>
            <div class="field"><label>Thời lượng EN</label><input name="durationLabelEn" value="${esc(p.duration_label_en || "")}" /></div>
            <div class="field"><label>Tổng thời lượng VI</label><input name="totalDurationVi" value="${esc(p.total_duration_vi || "")}" /></div>
            <div class="field"><label>Tổng thời lượng EN</label><input name="totalDurationEn" value="${esc(p.total_duration_en || "")}" /></div>
            <div class="field"><label>Sĩ số min</label><input name="capacityMin" type="number" value="${p.capacity_min ?? ""}" /></div>
            <div class="field"><label>Sĩ số max</label><input name="capacityMax" type="number" value="${p.capacity_max ?? ""}" /></div>
            <div class="field"><label>Nhãn sĩ số VI</label><input name="classSizeLabelVi" value="${esc(p.class_size_label_vi || "")}" /></div>
            <div class="field"><label>Nhãn sĩ số EN</label><input name="classSizeLabelEn" value="${esc(p.class_size_label_en || "")}" /></div>
            <div class="field"><label>Trạng thái khóa</label>
              <select name="status">${["draft", "published", "hidden"].map((x) => `<option ${p.status === x ? "selected" : ""}>${x}</option>`).join("")}</select>
            </div>
            <div class="field"><label>Status VI</label>
              <select name="statusVi">${["draft", "review", "published"].map((x) => `<option ${p.status_vi === x ? "selected" : ""}>${x}</option>`).join("")}</select>
            </div>
            <div class="field"><label>Status EN</label>
              <select name="statusEn">${["not_created", "ai_draft", "review", "published"].map((x) => `<option ${p.status_en === x ? "selected" : ""}>${x}</option>`).join("")}</select>
            </div>
            <div class="field"><label>Nền tảng</label><input name="primaryPlatform" value="${esc(p.primary_platform || "")}" /></div>
            <div class="field"><label>Online location</label><input name="locationOnline" value="${esc(p.location_online || "")}" /></div>
            <div class="field"><label>Venue mặc định</label>
              <select name="venueDefaultId"><option value="">—</option>${venues.items.map((v) => `<option value="${v.id}" ${p.venue_default_id === v.id ? "selected" : ""}>${esc(v.name)}</option>`).join("")}</select>
            </div>
            <div class="field"><label>Featured</label><select name="featured"><option value="0">No</option><option value="1" ${p.featured ? "selected" : ""}>Yes</option></select></div>
            <div class="field"><label>Certificate enabled</label><select name="certificateEnabled"><option value="1" ${p.certificate_enabled !== 0 ? "selected" : ""}>Yes</option><option value="0" ${p.certificate_enabled === 0 ? "selected" : ""}>No</option></select></div>
            <div class="field"><label>Certificate code</label><input name="certificateCode" value="${esc(p.certificate_code || "")}" placeholder="AIS / AIA / AIW" /></div>
            <div class="field"><label>Min attendance %</label><input name="minimumAttendancePercent" type="number" value="${p.minimum_attendance_percent ?? 75}" /></div>
            <div class="field"><label>Require completion</label><select name="requireCompletion"><option value="1" ${p.require_completion !== 0 ? "selected" : ""}>Yes</option><option value="0" ${p.require_completion === 0 ? "selected" : ""}>No</option></select></div>
            <div class="field"><label>Require payment</label><select name="requirePayment"><option value="1" ${p.require_payment !== 0 ? "selected" : ""}>Yes</option><option value="0" ${p.require_payment === 0 ? "selected" : ""}>No</option></select></div>
            <div class="field"><label>Admin approve certificate</label><select name="requireAdminApproval"><option value="1" ${p.require_admin_approval !== 0 ? "selected" : ""}>Yes</option><option value="0" ${p.require_admin_approval === 0 ? "selected" : ""}>No</option></select></div>
            <div class="field"><label>Join link opens (minutes before)</label><input name="joinLinkOpenMinutesBefore" type="number" value="${p.join_link_open_minutes_before ?? 30}" /></div>
            <div class="field"><label>Certificate template ID</label><input name="certificateTemplateId" value="${esc(p.certificate_template_id || "tpl-vsc-default")}" /></div>
          </div>
        </section>
        <section data-pane="vi" class="${tab === "vi" ? "" : "hidden"}">
          <div class="form-grid">
            <div class="field"><label>Tên khóa</label><input name="vi-name" value="${esc(vi.name || "")}" /></div>
            <div class="field"><label>Tên ngắn</label><input name="vi-shortName" value="${esc(vi.shortName || "")}" /></div>
            <div class="field"><label>Level label</label><input name="vi-level" value="${esc(vi.level || "")}" /></div>
            <div class="field"><label>Eyebrow / subtitle</label><input name="vi-subtitle" value="${esc(vi.subtitle || "")}" /></div>
            <div class="field full"><label>Headline</label><textarea name="vi-heroHeadline">${esc(vi.heroHeadline || "")}</textarea></div>
            <div class="field full"><label>Subheadline / tagline</label><input name="vi-tagline" value="${esc(vi.tagline || "")}" /></div>
            <div class="field full"><label>Mô tả</label><textarea name="vi-description">${esc(vi.description || "")}</textarea></div>
            <div class="field full"><label>Who is this for (JSON hoặc để tab Kết quả)</label><textarea name="vi-heroNote">${esc(vi.heroNote || "")}</textarea></div>
            <div class="field"><label>CTA</label><input name="vi-ctaLabel" value="${esc(vi.ctaLabel || "")}" /></div>
          </div>
        </section>
        <section data-pane="en" class="${tab === "en" ? "" : "hidden"}">
          <div class="toolbar">
            <button type="button" class="btn" id="en-draft">Tạo English Draft</button>
            <button type="button" class="btn" id="en-review">Mark as Reviewed</button>
            <button type="button" class="btn btn-primary" id="en-publish">Publish EN</button>
          </div>
          <div class="form-grid">
            <div class="field"><label>Course name</label><input name="en-name" value="${esc(en.name || "")}" /></div>
            <div class="field"><label>Short name</label><input name="en-shortName" value="${esc(en.shortName || "")}" /></div>
            <div class="field"><label>Level label</label><input name="en-level" value="${esc(en.level || "")}" /></div>
            <div class="field"><label>Eyebrow / subtitle</label><input name="en-subtitle" value="${esc(en.subtitle || "")}" /></div>
            <div class="field full"><label>Headline</label><textarea name="en-heroHeadline">${esc(en.heroHeadline || "")}</textarea></div>
            <div class="field full"><label>Tagline</label><input name="en-tagline" value="${esc(en.tagline || "")}" /></div>
            <div class="field full"><label>Description</label><textarea name="en-description">${esc(en.description || "")}</textarea></div>
            <div class="field"><label>CTA</label><input name="en-ctaLabel" value="${esc(en.ctaLabel || "")}" /></div>
          </div>
        </section>
        <section data-pane="curriculum" class="${tab === "curriculum" ? "" : "hidden"}">
          <h3>Curriculum VI</h3>
          ${repeater("curVi", curVi, [
            { key: "title", label: "Title" },
            { key: "goal", label: "Goal" },
            { key: "content", label: "Description", area: true, full: true },
            { key: "output", label: "Output", full: true },
          ])}
          <h3>Curriculum EN</h3>
          ${repeater("curEn", curEn, [
            { key: "title", label: "Title" },
            { key: "goal", label: "Goal" },
            { key: "content", label: "Description", area: true, full: true },
            { key: "output", label: "Output", full: true },
          ])}
        </section>
        <section data-pane="outcomes" class="${tab === "outcomes" ? "" : "hidden"}">
          <h3>Outcomes VI</h3>
          ${repeater("outVi", outVi, [{ key: "title", label: "Title" }, { key: "description", label: "Description", area: true, full: true }])}
          <h3>Outcomes EN</h3>
          ${repeater("outEn", outEn, [{ key: "title", label: "Title" }, { key: "description", label: "Description", area: true, full: true }])}
        </section>
        <section data-pane="faq" class="${tab === "faq" ? "" : "hidden"}">
          <h3>FAQ VI</h3>
          ${repeater("faqVi", faqVi, [{ key: "q", label: "Câu hỏi", full: true }, { key: "a", label: "Trả lời", area: true, full: true }])}
          <h3>FAQ EN</h3>
          ${repeater("faqEn", faqEn, [{ key: "q", label: "Question", full: true }, { key: "a", label: "Answer", area: true, full: true }])}
        </section>
        <section data-pane="faculty" class="${tab === "faculty" ? "" : "hidden"}">
          ${(instructors.items || []).map((ins) => {
            const linked = (p.instructors || []).find((x) => x.instructor_id === ins.id);
            return `<label class="field" style="display:flex;gap:10px;align-items:center">
              <input type="checkbox" name="ins-${ins.id}" ${linked ? "checked" : ""} />
              <span>${esc(ins.name)}</span>
              <select name="insrole-${ins.id}">
                ${["lead", "instructor", "guest"].map((r) => `<option ${linked?.role === r ? "selected" : ""}>${r}</option>`).join("")}
              </select>
            </label>`;
          }).join("")}
        </section>
        <section data-pane="sessions" class="${tab === "sessions" ? "" : "hidden"}">
          ${table(
            ["Lớp", "Ngày", "Trạng thái", ""],
            (p.sessions || []).map(
              (s) => `<tr><td>${esc(s.session_name)}</td><td>${fmtDate(s.start_date)}</td><td>${badge(s.status)}</td><td><a href="/admin/sessions/${s.id}">Mở</a></td></tr>`,
            ),
            "Chưa có lớp",
          )}
          <p><a class="btn" href="/admin/sessions/new?programId=${esc(p.id || "")}">+ Tạo lớp</a></p>
        </section>
        <section data-pane="seo" class="${tab === "seo" ? "" : "hidden"}">
          <div class="form-grid">
            <div class="field full"><label>SEO title VI</label><input name="seoViTitle" value="${esc(seoVi.title || "")}" /></div>
            <div class="field full"><label>SEO description VI</label><textarea name="seoViDesc">${esc(seoVi.description || "")}</textarea></div>
            <div class="field full"><label>SEO title EN</label><input name="seoEnTitle" value="${esc(seoEn.title || "")}" /></div>
            <div class="field full"><label>SEO description EN</label><textarea name="seoEnDesc">${esc(seoEn.description || "")}</textarea></div>
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
        go(`/admin/programs/${payload.id}`);
      } catch (err) {
        toast(err.message, true);
      }
    });

    $("#en-draft")?.addEventListener("click", async () => {
      try {
        await api(`/programs/${id}/en-draft`, { method: "POST", body: {} });
        toast("Đã tạo English draft — chưa publish");
        render();
      } catch (err) {
        toast(err.message, true);
      }
    });
    $("#en-review")?.addEventListener("click", () => {
      app.querySelector('[name="statusEn"]').value = "review";
      toast("Đánh dấu Ready for review — nhớ Lưu");
    });
    $("#en-publish")?.addEventListener("click", () => {
      app.querySelector('[name="statusEn"]').value = "published";
      toast("Sẽ publish EN khi bạn bấm Lưu");
    });
    $("#delete-program")?.addEventListener("click", async () => {
      if (!confirmAction("Xóa khóa học này? Không xóa được nếu còn lớp liên kết.")) return;
      try {
        await api(`/programs/${id}`, { method: "DELETE" });
        toast("Đã xóa");
        go("/admin/programs");
      } catch (err) {
        toast(err.message, true);
      }
    });
  }

  async function viewSessions() {
    $("#page-title").textContent = "Sessions";
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
        <a class="btn btn-primary" href="/admin/sessions/new">+ Lớp mới</a>
      </div>
      ${table(
        ["Lớp", "Khóa", "Ngày", "Giờ", "Chỗ", "Đăng ký", "Trạng thái", ""],
        filtered.map(
          (s) => `<tr>
            <td><a href="/admin/sessions/${s.id}">${esc(s.session_name || s.slug)}</a></td>
            <td>${esc(s.programName || "")}</td>
            <td>${fmtDate(s.start_date)}</td>
            <td>${esc(s.start_time)}–${esc(s.end_time)}</td>
            <td>${s.capacity ?? "—"}</td>
            <td>${s.registered_count}</td>
            <td>${badge(s.status)}</td>
            <td><a href="/admin/sessions/${s.id}">Sửa</a></td>
          </tr>`,
        ),
      )}`;
    const apply = () => go(`/admin/sessions?programId=${$("#f-program").value}&status=${$("#f-status").value}`);
    $("#f-program").onchange = apply;
    $("#f-status").onchange = apply;
  }

  async function viewSession(id) {
    const isNew = id === "new";
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
          <div class="field"><label>Slug</label><input name="slug" value="${esc(s.slug || "")}" required /></div>
          <div class="field"><label>Tên lớp</label><input name="sessionName" value="${esc(s.session_name || "")}" /></div>
          <div class="field"><label>Loại</label><select name="type"><option ${s.type === "course" ? "selected" : ""}>course</option><option ${s.type === "workshop" ? "selected" : ""}>workshop</option></select></div>
          <div class="field"><label>Ngày bắt đầu</label><input type="date" name="startDate" value="${esc((s.start_date || "").slice(0, 10))}" required /></div>
          <div class="field"><label>Ngày kết thúc</label><input type="date" name="endDate" value="${esc((s.end_date || "").slice(0, 10))}" /></div>
          <div class="field"><label>Giờ bắt đầu</label><input type="time" name="startTime" value="${esc(s.start_time || "")}" required /></div>
          <div class="field"><label>Giờ kết thúc</label><input type="time" name="endTime" value="${esc(s.end_time || "")}" required /></div>
          <div class="field"><label>Thứ trong tuần</label><input name="daysOfWeek" value="${esc(s.days_of_week || "")}" placeholder="Tue, Thu" /></div>
          <div class="field"><label>Hình thức</label><select name="format"><option value="">Theo khóa</option>${["online", "offline", "hybrid"].map((x) => `<option ${s.format === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
          <div class="field"><label>Venue</label>
            <select name="venueId"><option value="">—</option>${venues.items.map((v) => `<option value="${v.id}" ${s.venue_id === v.id ? "selected" : ""}>${esc(v.name)}</option>`).join("")}</select>
          </div>
          <div class="field"><label>Nền tảng online</label><input name="onlinePlatform" value="${esc(s.online_platform || "")}" /></div>
          <div class="field"><label>Meeting URL</label><input name="meetingUrl" value="${esc(s.meeting_url || "")}" /></div>
          <div class="field"><label>Join link opens (minutes before)</label><input type="number" name="joinLinkOpenMinutesBefore" value="${s.join_link_open_minutes_before ?? ""}" placeholder="Theo khóa" /></div>
          <div class="field"><label>Giá override (VND)</label><input type="number" name="priceOverride" value="${s.price_override ?? ""}" /></div>
          <div class="field"><label>Sĩ số</label><input type="number" name="capacity" value="${s.capacity ?? ""}" /></div>
          <div class="field"><label>Đã đăng ký</label><input value="${s.registered_count || 0}" disabled /></div>
          <div class="field"><label>Trạng thái</label>
            <select name="status">${Object.keys(SESSION_LABEL).map((k) => `<option value="${k}" ${s.status === k ? "selected" : ""}>${SESSION_LABEL[k]}</option>`).join("")}</select>
          </div>
          <div class="field"><label>Mở ĐK</label><input type="date" name="registrationOpenDate" value="${esc((s.registration_open_date || "").slice(0, 10))}" /></div>
          <div class="field"><label>Đóng ĐK</label><input type="date" name="registrationCloseDate" value="${esc((s.registration_close_date || "").slice(0, 10))}" /></div>
          <div class="field full"><label>Mô tả VI</label><textarea name="descriptionVi">${esc(s.description_vi || "")}</textarea></div>
          <div class="field full"><label>Mô tả EN</label><textarea name="descriptionEn">${esc(s.description_en || "")}</textarea></div>
          <div class="field full"><label>Ghi chú nội bộ</label><textarea name="notes">${esc(s.notes || "")}</textarea></div>
        </div>
        <div class="toolbar" style="margin-top:16px">
          <button class="btn btn-primary" type="submit">Lưu lớp</button>
          ${isNew ? "" : `<button type="button" class="btn-danger" id="delete-session">Xóa</button>`}
        </div>
      </form>`;
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
        go(`/admin/sessions/${result.id}`);
      } catch (err) {
        toast(err.message, true);
      }
    };
    $("#delete-session")?.addEventListener("click", async () => {
      if (!confirmAction("Xóa lớp này?")) return;
      try {
        await api(`/sessions/${id}`, { method: "DELETE" });
        toast("Đã xóa lớp");
        go("/admin/sessions");
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
        ["overview", "OVERVIEW"],
        ["students", "STUDENTS"],
        ["meetings", "MEETINGS"],
        ["attendance", "ATTENDANCE"],
        ["materials", "MATERIALS"],
        ["announcements", "ANNOUNCEMENTS"],
        ["certificates", "CERTIFICATES"],
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
          pane.innerHTML = `<p>${lms.summary.total} học viên · ${lms.summary.eligible} eligible · ${lms.summary.missingAttendance} thiếu điểm danh · ${lms.summary.incomplete} incomplete</p>`;
        } else if (k === "students") {
          pane.innerHTML = table(
            ["Học viên", "Status", "Payment", "Progress", "Cert", ""],
            lms.enrollments.map(
              (e) => `<tr><td><a href="/admin/students/${e.student_id}">${esc(e.student_name)}</a></td><td>${badge(e.status)}</td><td>${badge(e.payment_status)}</td><td>${e.progress.percent}%</td><td>${badge(e.certificate.status)}</td><td><button class="btn" data-recommend="${e.id}">Recommend completion</button></td></tr>`,
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
            ["Buổi", "Ngày", "Giờ", "Status", ""],
            lms.meetings.map(
              (m) => `<tr><td>${esc(m.title_vi)}</td><td>${fmtDate(m.date)}</td><td>${esc(m.start_time)}–${esc(m.end_time)}</td><td>${badge(m.status)}</td><td></td></tr>`,
            ),
            "Chưa có buổi",
          )}
          <form id="mtg-form" class="form-grid" style="margin-top:12px">
            <div class="field"><label>Title VI</label><input name="titleVi" required /></div>
            <div class="field"><label>Title EN</label><input name="titleEn" /></div>
            <div class="field"><label>Ngày</label><input type="date" name="date" required /></div>
            <div class="field"><label>Bắt đầu</label><input type="time" name="startTime" required /></div>
            <div class="field"><label>Kết thúc</label><input type="time" name="endTime" required /></div>
            <div class="field"><label>Format</label><select name="format"><option value="online">online</option><option value="offline">offline</option></select></div>
            <div class="field"><label>Meet URL</label><input name="meetingUrl" /></div>
            <div class="field"><label>Recording</label><input name="recordingUrl" /></div>
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
                    ${["not_recorded","present","absent","excused"].map((st) => `<option>${st}</option>`).join("")}
                  </select>
                </td>
              </tr>`);
            });
          });
          pane.innerHTML = table(["Học viên", "Buổi", "Status"], rows, "Chưa có dữ liệu");
          pane.querySelectorAll("[data-att]").forEach((sel) =>
            sel.addEventListener("change", async () => {
              await api("/attendance", { method: "PUT", body: { enrollmentId: sel.dataset.att, meetingId: sel.dataset.meeting, status: sel.value } });
              toast("Đã ghi nhận điểm danh");
            }),
          );
        } else if (k === "materials") {
          pane.innerHTML = `${table(["Title", "Type"], lms.materials.map((x) => `<tr><td><a href="/admin/materials/${x.id}">${esc(x.title_vi)}</a></td><td>${esc(x.type)}</td></tr>`))}
            <p><a class="btn" href="/admin/materials/new">+ Tài liệu</a></p>`;
        } else if (k === "announcements") {
          pane.innerHTML = `${table(["Title", "Priority"], lms.announcements.map((x) => `<tr><td><a href="/admin/announcements/${x.id}">${esc(x.title_vi)}</a></td><td>${esc(x.priority)}</td></tr>`))}
            <p><a class="btn" href="/admin/announcements/new">+ Thông báo</a></p>`;
        } else {
          pane.innerHTML = `<p>${lms.summary.eligible} Eligible · ${lms.summary.missingAttendance} Missing attendance · ${lms.summary.incomplete} Incomplete</p>
            ${table(
              ["Học viên", "Attendance", "Completion", "Payment", "Cert", ""],
              lms.enrollments.map(
                (e) => `<tr>
                  <td>${esc(e.student_name)}</td>
                  <td>${e.attendance.percent}%</td>
                  <td>${esc(e.completion_status || e.status)}</td>
                  <td>${esc(e.payment_status)}</td>
                  <td>${badge(e.certificate.status)}</td>
                  <td><label><input type="checkbox" data-bulk="${e.id}" ${e.eligibility.eligible && e.certificate.status !== "issued" ? "" : "disabled"} /> Issue</label></td>
                </tr>`,
              ),
            )}
            <button class="btn btn-primary" id="issue-selected">ISSUE SELECTED</button>`;
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
    $("#page-title").textContent = "Registrations";
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
        <a class="btn" href="/api/admin/registrations/export.csv">Export CSV</a>
      </div>
      ${table(
        ["ID", "Họ tên", "Khóa", "Lớp", "Số tiền", "Ngày", "Trạng thái"],
        data.items.map(
          (r) => `<tr>
            <td><a href="/admin/registrations/${r.id}">${esc(r.id)}</a></td>
            <td>${esc(r.full_name)}<br><small>${esc(r.email)}</small></td>
            <td>${esc(r.programName || "")}</td>
            <td>${esc(r.session_name || "")}</td>
            <td>${fmtPrice(r.amount)}</td>
            <td>${fmtDate(r.created_at)}</td>
            <td>${badge(r.status)}</td>
          </tr>`,
        ),
      )}`;
    const apply = () => {
      const next = new URLSearchParams();
      ["q", "programId", "sessionId", "status"].forEach((k) => {
        const v = document.getElementById(k).value;
        if (v) next.set(k, v);
      });
      go(`/admin/registrations?${next}`);
    };
    $("#q").addEventListener("keydown", (e) => e.key === "Enter" && apply());
    $("#programId").onchange = apply;
    $("#sessionId").onchange = apply;
    $("#status").onchange = apply;
  }

  async function viewRegistration(id) {
    $("#page-title").textContent = "Chi tiết đăng ký";
    const [r, sessions] = await Promise.all([api(`/registrations/${id}`), api("/sessions")]);
    app.innerHTML = `
      <div class="grid-2">
        <div class="card" style="padding:18px">
          <h2>${esc(r.full_name)}</h2>
          <p>${esc(r.email)} · ${esc(r.phone)}</p>
          <p>${esc(r.job_role)} ${r.organization ? "· " + esc(r.organization) : ""}</p>
          <p>Nhu cầu: ${esc(r.goal || "—")}</p>
          <p>Nguồn: ${esc(r.source || "—")}</p>
          <p>Consent: privacy ${r.consent_privacy ? "yes" : "no"} · marketing ${r.consent_marketing ? "yes" : "no"}</p>
        </div>
        <form class="card" style="padding:18px" id="reg-form">
          <div class="field"><label>Trạng thái</label>
            <select name="status">${Object.keys(REG_LABEL).map((k) => `<option value="${k}" ${r.status === k ? "selected" : ""}>${REG_LABEL[k]}</option>`).join("")}</select>
          </div>
          <div class="field"><label>Chuyển lớp</label>
            <select name="sessionId">${sessions.items.map((s) => `<option value="${s.id}" ${r.session_id === s.id ? "selected" : ""}>${esc(s.session_name)} · ${fmtDate(s.start_date)}</option>`).join("")}</select>
          </div>
          <div class="field"><label>Ghi chú nội bộ</label><textarea name="note"></textarea></div>
          <button class="btn btn-primary" type="submit">Cập nhật</button>
        </form>
      </div>
      <div class="card" style="margin-top:16px;padding:18px">
        <h2>History</h2>
        ${(r.notes || []).map((n) => `<p><small>${esc(n.at)} · ${esc(n.by)}</small><br>${esc(n.text)}</p>`).join("") || "<p class='empty'>Chưa có ghi chú</p>"}
      </div>`;
    $("#reg-form").onsubmit = async (e) => {
      e.preventDefault();
      try {
        const data = await api(`/registrations/${id}`, {
          method: "PUT",
          body: { status: val(e.target, "status"), sessionId: val(e.target, "sessionId"), note: val(e.target, "note") },
        });
        toast(data.activation?.activationPath ? `Đã xác nhận. Link kích hoạt: ${data.activation.activationPath}` : "Đã cập nhật đăng ký");
        render();
      } catch (err) {
        toast(err.message, true);
      }
    };
  }

  function simpleCrudPage({ title, endpoint, fields, nameKey }) {
    return async () => {
      $("#page-title").textContent = title;
      const data = await api(endpoint);
      const editing = new URLSearchParams(location.search).get("id");
      const current = data.items.find((x) => x.id === editing) || {};
      app.innerHTML = `
        <div class="grid-2">
          ${table(
            ["Tên", ""],
            data.items.map((x) => `<tr><td><a href="${path()}?id=${x.id}">${esc(x[nameKey] || x.name || x.title_vi)}</a></td><td><a href="${path()}?id=${x.id}">Sửa</a></td></tr>`),
          )}
          <form class="card" style="padding:18px" id="crud-form">
            <div class="form-grid">
              ${fields
                .map(
                  (f) =>
                    `<div class="field ${f.full ? "full" : ""}"><label>${f.label}</label>${
                      f.area
                        ? `<textarea name="${f.key}">${esc(current[f.col] || "")}</textarea>`
                        : f.type === "select"
                          ? `<select name="${f.key}">${f.options.map((o) => `<option value="${o[0]}" ${String(current[f.col]) === String(o[0]) ? "selected" : ""}>${o[1]}</option>`).join("")}</select>`
                          : `<input name="${f.key}" value="${esc(current[f.col] || "")}" />`
                    }</div>`,
                )
                .join("")}
            </div>
            <div class="toolbar" style="margin-top:12px">
              <button class="btn btn-primary" type="submit">Lưu</button>
              ${editing ? `<button type="button" class="btn-danger" id="crud-del">Xóa</button>` : ""}
              <a class="btn-ghost" href="${path()}">Tạo mới</a>
            </div>
          </form>
        </div>`;
      $("#crud-form").onsubmit = async (e) => {
        e.preventDefault();
        const body = {};
        fields.forEach((f) => (body[f.key] = val(e.target, f.key)));
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
    };
  }

  const viewVenues = simpleCrudPage({
    title: "Venues",
    endpoint: "/venues",
    nameKey: "name",
    fields: [
      { key: "name", col: "name", label: "Tên" },
      { key: "city", col: "city", label: "Thành phố" },
      { key: "addressVi", col: "address_vi", label: "Địa chỉ VI", full: true },
      { key: "addressEn", col: "address_en", label: "Địa chỉ EN", full: true },
      { key: "mapUrl", col: "map_url", label: "Map URL", full: true },
      { key: "notes", col: "notes", label: "Ghi chú", area: true, full: true },
    ],
  });

  const viewInstructors = simpleCrudPage({
    title: "Instructors",
    endpoint: "/instructors",
    nameKey: "name",
    fields: [
      { key: "name", col: "name", label: "Tên" },
      { key: "academicTitle", col: "academic_title", label: "Học hàm" },
      { key: "role", col: "role", label: "Vai trò" },
      { key: "companyRole", col: "company_role", label: "Vai trò công ty" },
      { key: "photo", col: "photo", label: "Ảnh", full: true },
      { key: "bioVi", col: "bio_vi", label: "Bio VI", area: true, full: true },
      { key: "bioEn", col: "bio_en", label: "Bio EN", area: true, full: true },
      { key: "expertiseVi", col: "expertise_vi", label: "Chuyên môn VI", full: true },
      { key: "expertiseEn", col: "expertise_en", label: "Chuyên môn EN", full: true },
      { key: "website", col: "website", label: "Website" },
    ],
  });

  async function viewInsights() {
    $("#page-title").textContent = "Insights";
    const editing = parts()[2];
    const data = await api("/insights");
    if (!editing) {
      app.innerHTML = `<div class="toolbar"><a class="btn btn-primary" href="/admin/insights/new">+ Bài viết</a></div>
        ${table(
          ["Tiêu đề", "Category", "VI", "EN", ""],
          data.items.map(
            (x) => `<tr><td><a href="/admin/insights/${x.id}">${esc(x.title_vi)}</a></td><td>${esc(x.category)}</td><td>${langDot(x.status_vi)}</td><td>${langDot(x.status_en)}</td><td><a href="/admin/insights/${x.id}">Sửa</a></td></tr>`,
          ),
        )}`;
      return;
    }
    const item = editing === "new" ? {} : data.items.find((x) => x.id === editing) || (await api(`/insights`).then((d) => d.items.find((x) => x.id === editing)));
    app.innerHTML = `<form id="ins-form" class="card" style="padding:18px">
      <div class="form-grid">
        <div class="field full"><label>Title VI</label><input name="titleVi" value="${esc(item?.title_vi || "")}" required /></div>
        <div class="field full"><label>Title EN</label><input name="titleEn" value="${esc(item?.title_en || "")}" /></div>
        <div class="field"><label>Slug VI</label><input name="slugVi" value="${esc(item?.slug_vi || "")}" required /></div>
        <div class="field"><label>Slug EN</label><input name="slugEn" value="${esc(item?.slug_en || "")}" /></div>
        <div class="field"><label>Category</label><input name="category" value="${esc(item?.category || "")}" /></div>
        <div class="field"><label>Author</label><input name="authorId" value="${esc(item?.author_id || "tran-anh-vu")}" /></div>
        <div class="field"><label>Status VI</label><select name="statusVi">${["draft", "review", "published"].map((x) => `<option ${item?.status_vi === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
        <div class="field"><label>Status EN</label><select name="statusEn">${["not_created", "ai_draft", "review", "published"].map((x) => `<option ${item?.status_en === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
        <div class="field full"><label>Excerpt VI</label><textarea name="excerptVi">${esc(item?.excerpt_vi || "")}</textarea></div>
        <div class="field full"><label>Excerpt EN</label><textarea name="excerptEn">${esc(item?.excerpt_en || "")}</textarea></div>
        <div class="field full"><label>Content VI</label><textarea name="contentVi" style="min-height:180px">${esc(item?.content_vi || "")}</textarea></div>
        <div class="field full"><label>Content EN</label><textarea name="contentEn" style="min-height:180px">${esc(item?.content_en || "")}</textarea></div>
      </div>
      <div class="toolbar" style="margin-top:12px">
        <button class="btn btn-primary" type="submit">Lưu</button>
        ${editing !== "new" ? `<button type="button" class="btn" id="ins-en">Tạo English Draft</button><button type="button" class="btn-danger" id="ins-del">Xóa</button>` : ""}
      </div>
    </form>`;
    $("#ins-form").onsubmit = async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.target).entries());
      try {
        if (editing === "new") {
          const r = await api("/insights", { method: "POST", body });
          toast("Đã tạo bài viết");
          go(`/admin/insights/${r.id}`);
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
      toast("Đã tạo English draft");
      render();
    });
    $("#ins-del")?.addEventListener("click", async () => {
      if (!confirmAction("Xóa bài viết?")) return;
      await api(`/insights/${editing}`, { method: "DELETE" });
      go("/admin/insights");
    });
  }

  async function viewResources() {
    $("#page-title").textContent = "Resources";
    const editing = parts()[2];
    const data = await api("/resources");
    if (!editing) {
      app.innerHTML = `<div class="toolbar"><a class="btn btn-primary" href="/admin/resources/new">+ Tài liệu</a></div>
        ${table(["Tiêu đề", "Category", "Access", "Status"], data.items.map((x) => `<tr><td><a href="/admin/resources/${x.id}">${esc(x.title_vi)}</a></td><td>${esc(x.category)}</td><td>${esc(x.access_type)}</td><td>${badge(x.status)}</td></tr>`))}`;
      return;
    }
    const item = editing === "new" ? {} : data.items.find((x) => x.id === editing) || {};
    app.innerHTML = `<form id="res-form" class="card" style="padding:18px">
      <div class="form-grid">
        <div class="field full"><label>Title VI</label><input name="titleVi" value="${esc(item.title_vi || "")}" required /></div>
        <div class="field full"><label>Title EN</label><input name="titleEn" value="${esc(item.title_en || "")}" /></div>
        <div class="field"><label>Slug</label><input name="slug" value="${esc(item.slug || "")}" required /></div>
        <div class="field"><label>Category</label><input name="category" value="${esc(item.category || "")}" /></div>
        <div class="field"><label>Access</label><select name="accessType">${[["public","Public"],["registration","Registration Required"],["private","Private"]].map(([v,l]) => `<option value="${v}" ${item.access_type === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>
        <div class="field"><label>Status</label><select name="status">${["draft","published","hidden"].map((x) => `<option ${item.status === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
        <div class="field full"><label>Description VI</label><textarea name="descriptionVi">${esc(item.description_vi || "")}</textarea></div>
        <div class="field full"><label>Description EN</label><textarea name="descriptionEn">${esc(item.description_en || "")}</textarea></div>
        <div class="field"><label>File URL</label><input name="fileUrl" value="${esc(item.file_url || "")}" /></div>
        <div class="field"><label>External URL</label><input name="externalUrl" value="${esc(item.external_url || "")}" /></div>
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
          go(`/admin/resources/${r.id}`);
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
      go("/admin/resources");
    });
  }

  async function viewMedia() {
    $("#page-title").textContent = "Media";
    const data = await api("/media");
    app.innerHTML = `
      <form class="toolbar" id="up">
        <input type="file" name="file" required />
        <input name="altVi" placeholder="Alt VI" />
        <input name="altEn" placeholder="Alt EN" />
        <button class="btn btn-primary">Upload</button>
      </form>
      <div class="media-grid">${data.items.map((m) => `
        <article class="media-card">
          ${m.mime.startsWith("image/") ? `<img src="${esc(m.url)}" alt="${esc(m.alt_vi)}" />` : `<p>${esc(m.original_name)}</p>`}
          <small>${esc(m.original_name)}</small>
          <button class="btn" data-copy="${esc(m.url)}">Copy URL</button>
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
        toast("Copied");
      }
      if (e.target.dataset.del) {
        if (!confirmAction("Xóa file?")) return;
        await api(`/media/${e.target.dataset.del}`, { method: "DELETE" });
        render();
      }
    });
  }

  async function viewStudents() {
    $("#page-title").textContent = "Students";
    const q = new URLSearchParams(location.search).get("q") || "";
    const data = await api(`/students?q=${encodeURIComponent(q)}`);
    app.innerHTML = `
      <div class="toolbar">
        <input id="search" placeholder="Tên, email, SĐT" value="${esc(q)}" />
        <a class="btn btn-primary" href="/admin/students/new">+ Học viên</a>
      </div>
      ${table(
        ["Tên", "Email", "SĐT", "Đang học", "Hoàn thành", "Trạng thái", "Ngày tạo"],
        data.items.map(
          (s) => `<tr>
            <td><a href="/admin/students/${s.id}">${esc(s.full_name)}</a></td>
            <td>${esc(s.email)}</td>
            <td>${esc(s.phone || "")}</td>
            <td>${s.active_courses}</td>
            <td>${s.completed_courses}</td>
            <td>${badge(s.status)}</td>
            <td>${fmtDate(s.created_at)}</td>
          </tr>`,
        ),
      )}`;
    $("#search").addEventListener("keydown", (e) => {
      if (e.key === "Enter") go(`/admin/students?q=${encodeURIComponent(e.target.value)}`);
    });
  }

  async function viewStudent(id) {
    if (id === "new") {
      $("#page-title").textContent = "Học viên mới";
      app.innerHTML = `<form id="stu-new" class="card" style="padding:18px;max-width:520px">
        <div class="field"><label>Họ tên</label><input name="fullName" required /></div>
        <div class="field"><label>Email</label><input name="email" type="email" required /></div>
        <div class="field"><label>Điện thoại</label><input name="phone" /></div>
        <button class="btn btn-primary">Tạo</button>
      </form>`;
      $("#stu-new").onsubmit = async (e) => {
        e.preventDefault();
        const body = Object.fromEntries(new FormData(e.target).entries());
        const r = await api("/students", { method: "POST", body });
        go(`/admin/students/${r.id}`);
      };
      return;
    }
    $("#page-title").textContent = "Chi tiết học viên";
    const [d, sessions] = await Promise.all([api(`/students/${id}`), api("/sessions")]);
    const s = d.student;
    app.innerHTML = `
      <div class="tabs">
        <button data-tab="profile" class="active">PROFILE</button>
        <button data-tab="enroll">ENROLLMENTS</button>
        <button data-tab="att">ATTENDANCE</button>
        <button data-tab="notes">NOTES</button>
        <button data-tab="certs">CERTIFICATES</button>
        <button data-tab="activity">ACTIVITY</button>
      </div>
      <section data-pane="profile">
        <form id="stu-form" class="card" style="padding:18px">
          <div class="form-grid">
            <div class="field"><label>Họ tên</label><input name="fullName" value="${esc(s.fullName)}" /></div>
            <div class="field"><label>Email</label><input value="${esc(s.email)}" disabled /></div>
            <div class="field"><label>Điện thoại</label><input name="phone" value="${esc(s.phone || "")}" /></div>
            <div class="field"><label>Status</label>
              <select name="status">${["invited","active","inactive","suspended"].map((x) => `<option ${s.status === x ? "selected" : ""}>${x}</option>`).join("")}</select>
            </div>
          </div>
          <div class="toolbar"><button class="btn btn-primary">Lưu</button>
            <button type="button" class="btn" id="reset-access">Reset access</button></div>
        </form>
      </section>
      <section data-pane="enroll" class="hidden">
        ${table(
          ["Khóa", "Lớp", "Status", "Payment", "Chuyển lớp"],
          d.enrollments.map(
            (e) => `<tr>
              <td>${esc(e.program_name)}</td>
              <td>${esc(e.session_name)}</td>
              <td>
                <select data-enr="${e.id}">
                  ${["active","completed","paused","cancelled"].map((st) => `<option ${e.status === st ? "selected" : ""}>${st}</option>`).join("")}
                </select>
              </td>
              <td>
                <select data-pay="${e.id}">
                  ${["unpaid","pending","paid","refunded"].map((st) => `<option ${e.payment_status === st ? "selected" : ""}>${st}</option>`).join("")}
                </select>
              </td>
              <td>
                <select data-move="${e.id}">
                  ${sessions.items.map((x) => `<option value="${x.id}" ${e.session_id === x.id ? "selected" : ""}>${esc(x.session_name)}</option>`).join("")}
                </select>
              </td>
            </tr>`,
          ),
        )}
        <form id="enroll-form" class="toolbar">
          <select name="sessionId">${sessions.items.map((x) => `<option value="${x.id}">${esc(x.session_name)}</option>`).join("")}</select>
          <button class="btn btn-primary">Enroll</button>
        </form>
      </section>
      <section data-pane="att" class="hidden">
        ${table(
          ["Buổi", "Ngày", "Status"],
          (d.meetings || []).map(
            (a) => `<tr>
              <td>${esc(a.title_vi)}</td>
              <td>${fmtDate(a.date)}</td>
              <td>
                <select data-att="${a.enrollment_id}" data-meeting="${a.id}">
                  ${["not_recorded","present","absent","excused"].map((st) => `<option ${a.attendance === st ? "selected" : ""}>${st}</option>`).join("")}
                </select>
              </td>
            </tr>`,
          ),
          "Chưa có buổi học",
        )}
      </section>
      <section data-pane="notes" class="hidden">
        <form id="note-form" class="card" style="padding:18px">
          <textarea name="notes">${esc(s.notes || "")}</textarea>
          <button class="btn btn-primary" style="margin-top:10px">Lưu ghi chú</button>
        </form>
      </section>
      <section data-pane="activity" class="hidden">
        <div class="card" style="padding:18px">
          <p>Tạo tài khoản: ${fmtDate(s.createdAt)}</p>
          <p>Đăng nhập gần nhất: ${s.lastLoginAt ? fmtDate(s.lastLoginAt) : "Chưa đăng nhập"}</p>
          <p>Enrollment: ${d.enrollments.length}</p>
        </div>
      </section>
      <section data-pane="certs" class="hidden">
        ${table(
          ["Code", "Status", "Issue", ""],
          (d.certificates || []).map(
            (c) => `<tr>
              <td>${esc(c.certificate_code)}</td>
              <td>${badge(c.status)}</td>
              <td>${fmtDate(c.issue_date || c.issued_at)}</td>
              <td>
                ${c.status === "issued" ? `<a class="btn" href="/api/admin/certificates/${c.id}/pdf">PDF</a>
                <button class="btn" data-reissue="${c.id}">Reissue</button>
                <button class="btn-danger" data-revoke="${c.id}">Revoke</button>` : ""}
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
      await api(`/students/${id}`, { method: "PUT", body: Object.fromEntries(new FormData(e.target).entries()) });
      toast("Đã lưu");
    };
    $("#reset-access").onclick = async () => {
      const r = await api(`/students/${id}/reset-access`, { method: "POST", body: {} });
      toast(`Link kích hoạt: ${r.activationPath}`);
    };
    $("#enroll-form").onsubmit = async (e) => {
      e.preventDefault();
      await api(`/students/${id}/enroll`, { method: "POST", body: { sessionId: e.target.sessionId.value } });
      toast("Đã enroll");
      render();
    };
    app.querySelectorAll("[data-enr]").forEach((sel) =>
      sel.addEventListener("change", async () => {
        await api(`/enrollments/${sel.dataset.enr}`, { method: "PUT", body: { status: sel.value } });
        toast("Đã cập nhật enrollment");
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
    app.querySelectorAll("[data-att]").forEach((sel) =>
      sel.addEventListener("change", async () => {
        await api("/attendance", {
          method: "PUT",
          body: { enrollmentId: sel.dataset.att, meetingId: sel.dataset.meeting, status: sel.value },
        });
        toast("Đã ghi nhận điểm danh");
      }),
    );
    $("#note-form").onsubmit = async (e) => {
      e.preventDefault();
      await api(`/students/${id}`, { method: "PUT", body: { notes: e.target.notes.value } });
      toast("Đã lưu ghi chú");
    };
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
        if (!confirmAction("Cấp lại chứng nhận? Bản cũ sẽ chuyển sang REISSUED.")) return;
        await api(`/certificates/${b.dataset.reissue}/reissue`, { method: "POST", body: {} });
        toast("Đã cấp lại");
        render();
      }),
    );
  }

  async function viewLearnerMaterials() {
    $("#page-title").textContent = "Learning materials";
    const editing = parts()[2];
    const [data, programs, sessions] = await Promise.all([api("/materials"), api("/programs"), api("/sessions")]);
    if (!editing) {
      app.innerHTML = `<div class="toolbar"><a class="btn btn-primary" href="/admin/materials/new">+ Tài liệu lớp</a></div>
        ${table(
          ["Title", "Type", "Visibility", "Phase"],
          data.items.map((x) => `<tr><td><a href="/admin/materials/${x.id}">${esc(x.title_vi)}</a></td><td>${esc(x.type)}</td><td>${esc(x.visibility)}</td><td>${esc(x.phase)}</td></tr>`),
        )}`;
      return;
    }
    const item = editing === "new" ? {} : data.items.find((x) => x.id === editing) || {};
    app.innerHTML = `<form id="mat-form" class="card" style="padding:18px">
      <div class="form-grid">
        <div class="field full"><label>Title VI</label><input name="titleVi" value="${esc(item.title_vi || "")}" required /></div>
        <div class="field full"><label>Title EN</label><input name="titleEn" value="${esc(item.title_en || "")}" /></div>
        <div class="field full"><label>Mô tả VI</label><textarea name="descriptionVi">${esc(item.description_vi || "")}</textarea></div>
        <div class="field full"><label>Mô tả EN</label><textarea name="descriptionEn">${esc(item.description_en || "")}</textarea></div>
        <div class="field"><label>Type</label><select name="type">${["slide","pdf","template","prompt","worksheet","video","recording","link","other"].map((x) => `<option ${item.type === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
        <div class="field"><label>Phase</label><select name="phase">${[["before","Trước buổi"],["during","Trong khóa"],["after","Sau buổi"]].map(([v,l]) => `<option value="${v}" ${item.phase === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>
        <div class="field"><label>Visibility</label><select name="visibility">${["program","session","meeting","students"].map((x) => `<option ${item.visibility === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
        <div class="field"><label>Program</label><select name="programId"><option value="">—</option>${programs.items.map((p) => `<option value="${p.id}" ${item.program_id === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></div>
        <div class="field"><label>Session</label><select name="sessionId"><option value="">—</option>${sessions.items.map((s) => `<option value="${s.id}" ${item.session_id === s.id ? "selected" : ""}>${esc(s.session_name)}</option>`).join("")}</select></div>
        <div class="field full"><label>External URL</label><input name="externalUrl" value="${esc(item.external_url || "")}" /></div>
        <div class="field full"><label>Upload file</label><input type="file" name="file" /></div>
      </div>
      <div class="toolbar"><button class="btn btn-primary">Lưu</button>
      ${editing !== "new" ? `<button type="button" class="btn-danger" id="mat-del">Xóa</button>` : ""}</div>
    </form>`;
    $("#mat-form").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        if (editing === "new") {
          const r = await api("/materials", { method: "POST", body: fd });
          go(`/admin/materials/${r.id}`);
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
      go("/admin/materials");
    });
  }

  async function viewAdminAnnouncements() {
    $("#page-title").textContent = "Announcements";
    const editing = parts()[2];
    const [data, programs, sessions] = await Promise.all([api("/announcements"), api("/programs"), api("/sessions")]);
    if (!editing) {
      app.innerHTML = `<div class="toolbar"><a class="btn btn-primary" href="/admin/announcements/new">+ Thông báo</a></div>
        ${table(
          ["Title", "Target", "Priority"],
          data.items.map((x) => `<tr><td><a href="/admin/announcements/${x.id}">${esc(x.title_vi)}</a></td><td>${esc(x.target_type)}</td><td>${esc(x.priority)}</td></tr>`),
        )}`;
      return;
    }
    const item = editing === "new" ? {} : data.items.find((x) => x.id === editing) || {};
    app.innerHTML = `<form id="ann-form" class="card" style="padding:18px">
      <div class="form-grid">
        <div class="field full"><label>Title VI</label><input name="titleVi" value="${esc(item.title_vi || "")}" required /></div>
        <div class="field full"><label>Title EN</label><input name="titleEn" value="${esc(item.title_en || "")}" /></div>
        <div class="field full"><label>Nội dung VI</label><textarea name="contentVi">${esc(item.content_vi || "")}</textarea></div>
        <div class="field full"><label>Nội dung EN</label><textarea name="contentEn">${esc(item.content_en || "")}</textarea></div>
        <div class="field"><label>Target</label><select name="targetType">${["all","program","session","student"].map((x) => `<option ${item.target_type === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
        <div class="field"><label>Priority</label><select name="priority">${["normal","important","urgent"].map((x) => `<option ${item.priority === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
        <div class="field"><label>Program</label><select name="programId"><option value="">—</option>${programs.items.map((p) => `<option value="${p.id}" ${item.program_id === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></div>
        <div class="field"><label>Session</label><select name="sessionId"><option value="">—</option>${sessions.items.map((s) => `<option value="${s.id}" ${item.session_id === s.id ? "selected" : ""}>${esc(s.session_name)}</option>`).join("")}</select></div>
        <div class="field"><label>Student ID (nếu target student)</label><input name="studentId" value="${esc(item.student_id || "")}" /></div>
      </div>
      <div class="toolbar"><button class="btn btn-primary">Publish</button>
      ${editing !== "new" ? `<button type="button" class="btn-danger" id="ann-del">Xóa</button>` : ""}</div>
    </form>`;
    $("#ann-form").onsubmit = async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.target).entries());
      try {
        if (editing === "new") {
          const r = await api("/announcements", { method: "POST", body });
          go(`/admin/announcements/${r.id}`);
        } else {
          await api(`/announcements/${editing}`, { method: "PUT", body });
          toast("Đã lưu thông báo");
        }
      } catch (err) {
        toast(err.message, true);
      }
    };
    $("#ann-del")?.addEventListener("click", async () => {
      if (!confirmAction("Xóa thông báo?")) return;
      await api(`/announcements/${editing}`, { method: "DELETE" });
      go("/admin/announcements");
    });
  }

  async function viewEnrollments() {
    $("#page-title").textContent = "Enrollments";
    const q = new URLSearchParams(location.search).get("q") || "";
    const data = await api(`/enrollments?q=${encodeURIComponent(q)}`);
    app.innerHTML = `
      <div class="toolbar"><input id="search" placeholder="Học viên, email, khóa" value="${esc(q)}" /></div>
      ${table(
        ["Học viên", "Khóa", "Lớp", "Status", "Payment", "Progress", "Cert"],
        data.items.map(
          (e) => `<tr>
            <td><a href="/admin/students/${e.student_id}">${esc(e.student_name)}</a><br><small>${esc(e.student_email || "")}</small></td>
            <td>${esc(e.program_name)}</td>
            <td>${esc(e.session_name)}</td>
            <td>${badge(e.status)}</td>
            <td>${badge(e.payment_status)}</td>
            <td>${e.progress?.percent ?? e.progress}%</td>
            <td>${badge(e.eligibility?.certificateStatus || e.certificate_status || "none")}</td>
          </tr>`,
        ),
      )}`;
    $("#search").addEventListener("keydown", (e) => {
      if (e.key === "Enter") go(`/admin/enrollments?q=${encodeURIComponent(e.target.value)}`);
    });
  }

  async function viewCertificates() {
    $("#page-title").textContent = "Certificates";
    const data = await api("/certificates");
    app.innerHTML = table(
      ["Code", "Học viên", "Chương trình", "Status", "Ngày cấp", ""],
      data.items.map(
        (c) => `<tr>
          <td>${esc(c.certificate_code)}</td>
          <td><a href="/admin/students/${c.student_id}">${esc(c.student_name_snapshot)}</a></td>
          <td>${esc(c.program_name_vi_snapshot)}</td>
          <td>${badge(c.status)}</td>
          <td>${fmtDate(c.issue_date)}</td>
          <td>
            ${c.status === "issued" ? `<a class="btn" href="/verify/${esc(c.certificate_code)}" target="_blank">Verify</a>
            <a class="btn" href="/api/admin/certificates/${c.id}/pdf">PDF</a>
            <button class="btn" data-reissue="${c.id}">Reissue</button>
            <button class="btn-danger" data-revoke="${c.id}">Revoke</button>` : ""}
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
    $("#page-title").textContent = "Certificate templates";
    const editing = parts()[2];
    const data = await api("/certificate-templates");
    if (!editing) {
      app.innerHTML = `<div class="toolbar"><a class="btn btn-primary" href="/admin/certificate-templates/new">+ Template</a></div>
        ${table(
          ["Name", "Language", "Status", "Version"],
          data.items.map((x) => `<tr><td><a href="/admin/certificate-templates/${x.id}">${esc(x.name)}</a></td><td>${esc(x.language)}</td><td>${badge(x.status)}</td><td>${esc(x.version)}</td></tr>`),
        )}`;
      return;
    }
    const item = editing === "new" ? {} : data.items.find((x) => x.id === editing) || data.items[0] || {};
    app.innerHTML = `<form id="tpl-form" class="card" style="padding:18px">
      <div class="form-grid">
        <div class="field"><label>Template name</label><input name="name" value="${esc(item.name || "")}" required /></div>
        <div class="field"><label>Language</label><select name="language"><option ${item.language === "vi" ? "selected" : ""}>vi</option><option ${item.language === "en" ? "selected" : ""}>en</option></select></div>
        <div class="field full"><label>Title VI</label><input name="titleVi" value="${esc(item.title_vi || "")}" /></div>
        <div class="field full"><label>Title EN</label><input name="titleEn" value="${esc(item.title_en || "")}" /></div>
        <div class="field full"><label>Body VI</label><textarea name="bodyVi">${esc(item.body_vi || "")}</textarea></div>
        <div class="field full"><label>Body EN</label><textarea name="bodyEn">${esc(item.body_en || "")}</textarea></div>
        <div class="field"><label>Signer 1</label><input name="signer1Name" value="${esc(item.signer1_name || "")}" /></div>
        <div class="field"><label>Signer 1 title</label><input name="signer1Title" value="${esc(item.signer1_title || "")}" /></div>
        <div class="field"><label>Signer 2</label><input name="signer2Name" value="${esc(item.signer2_name || "")}" /></div>
        <div class="field"><label>Signer 2 title</label><input name="signer2Title" value="${esc(item.signer2_title || "")}" /></div>
        <div class="field full"><label>Footer VI</label><textarea name="footerVi">${esc(item.footer_vi || "")}</textarea></div>
        <div class="field full"><label>Footer EN</label><textarea name="footerEn">${esc(item.footer_en || "")}</textarea></div>
        <div class="field"><label>Status</label><select name="status"><option ${item.status === "published" ? "selected" : ""}>published</option><option ${item.status === "draft" ? "selected" : ""}>draft</option></select></div>
      </div>
      <button class="btn btn-primary" style="margin-top:12px">Lưu template</button>
    </form>`;
    $("#tpl-form").onsubmit = async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.target).entries());
      if (editing === "new") {
        const r = await api("/certificate-templates", { method: "POST", body });
        go(`/admin/certificate-templates/${r.id}`);
      } else {
        await api(`/certificate-templates/${editing}`, { method: "PUT", body });
        toast("Đã lưu template");
      }
    };
  }

  async function viewSettings() {
    $("#page-title").textContent = "Settings";
    if (state.user.role !== "OWNER") {
      app.innerHTML = `<p class="empty">Chỉ OWNER mới sửa cấu hình hệ thống.</p>`;
      return;
    }
    const s = await api("/settings");
    const c = s.contact || {};
    const seo = s.seo || {};
    const reg = s.registration || {};
    const footer = s.footer || {};
    app.innerHTML = `<form id="set-form" class="card" style="padding:18px">
      <h2>Contact</h2>
      <div class="form-grid">
        <div class="field"><label>Email</label><input name="email" value="${esc(c.email || "")}" /></div>
        <div class="field"><label>Phone</label><input name="phone" value="${esc(c.phone || "")}" /></div>
        <div class="field"><label>Zalo</label><input name="zalo" value="${esc(c.zalo || "")}" /></div>
        <div class="field"><label>Website</label><input name="website" value="${esc(c.website || "")}" /></div>
        <div class="field full"><label>Address</label><input name="address" value="${esc(c.address || "")}" /></div>
      </div>
      <h2>SEO</h2>
      <div class="form-grid">
        <div class="field full"><label>Site title VI</label><input name="titleVi" value="${esc(seo.titleVi || "")}" /></div>
        <div class="field full"><label>Site title EN</label><input name="titleEn" value="${esc(seo.titleEn || "")}" /></div>
        <div class="field full"><label>Description VI</label><textarea name="descriptionVi">${esc(seo.descriptionVi || "")}</textarea></div>
        <div class="field full"><label>Description EN</label><textarea name="descriptionEn">${esc(seo.descriptionEn || "")}</textarea></div>
      </div>
      <h2>Footer</h2>
      <div class="form-grid">
        <div class="field"><label>Footer VI</label><input name="footerVi" value="${esc(footer.vi || "")}" /></div>
        <div class="field"><label>Footer EN</label><input name="footerEn" value="${esc(footer.en || "")}" /></div>
      </div>
      <h2>Registration</h2>
      <div class="form-grid">
        <div class="field full"><label>Confirmation VI</label><textarea name="confirmationVi">${esc(reg.confirmationVi || "")}</textarea></div>
        <div class="field full"><label>Confirmation EN</label><textarea name="confirmationEn">${esc(reg.confirmationEn || "")}</textarea></div>
        <div class="field full"><label>Support contact</label><input name="supportContact" value="${esc(reg.supportContact || "")}" /></div>
      </div>
      <button class="btn btn-primary" style="margin-top:16px">Lưu settings</button>
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
        toast("Đã lưu settings");
      } catch (err) {
        toast(err.message, true);
      }
    };
  }

  async function render() {
    const p = path();
    if (!state.user) {
      $("#login-view").classList.remove("hidden");
      $("#password-view").classList.add("hidden");
      $("#shell").classList.add("hidden");
      if (p !== "/admin/login") history.replaceState({}, "", "/admin/login");
      return;
    }
    if (state.user.mustChangePassword) {
      $("#login-view").classList.add("hidden");
      $("#password-view").classList.remove("hidden");
      $("#shell").classList.add("hidden");
      if (p !== "/admin/change-password") history.replaceState({}, "", "/admin/change-password");
      return;
    }
    $("#login-view").classList.add("hidden");
    $("#password-view").classList.add("hidden");
    $("#shell").classList.remove("hidden");
    layout();
    const segs = parts();
    app.innerHTML = `<p class="empty">Đang tải…</p>`;
    try {
      if (p === "/admin" || p === "/admin/login") return viewDashboard();
      if (p === "/admin/programs") return viewPrograms();
      if (segs[0] === "admin" && segs[1] === "programs" && segs[2]) return viewProgram(segs[2]);
      if (p === "/admin/sessions") return viewSessions();
      if (segs[0] === "admin" && segs[1] === "sessions" && segs[2]) return viewSession(segs[2]);
      if (p === "/admin/registrations") return viewRegistrations();
      if (segs[0] === "admin" && segs[1] === "registrations" && segs[2]) return viewRegistration(segs[2]);
      if (p === "/admin/students") return viewStudents();
      if (segs[0] === "admin" && segs[1] === "students" && segs[2]) return viewStudent(segs[2]);
      if (p === "/admin/enrollments") return viewEnrollments();
      if (p.startsWith("/admin/materials")) return viewLearnerMaterials();
      if (p.startsWith("/admin/announcements")) return viewAdminAnnouncements();
      if (p === "/admin/certificates") return viewCertificates();
      if (p.startsWith("/admin/certificate-templates")) return viewCertificateTemplates();
      if (p === "/admin/instructors") return viewInstructors();
      if (p === "/admin/venues") return viewVenues();
      if (p.startsWith("/admin/insights")) return viewInsights();
      if (p.startsWith("/admin/resources")) return viewResources();
      if (p === "/admin/media") return viewMedia();
      if (p === "/admin/settings") return viewSettings();
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
      go(data.user.mustChangePassword ? "/admin/change-password" : "/admin");
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
      go("/admin");
    } catch (err) {
      $("#password-error").textContent = err.message;
    }
  });
  $("#logout").addEventListener("click", async () => {
    await api("/logout", { method: "POST", body: {} });
    state.user = null;
    go("/admin/login");
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
