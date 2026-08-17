const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const fs = require("fs");
const path = require("path");
const express = require("express");
const { createAdminRouter } = require("../routes/admin");
const StaffPortal = require("./staff-portal");

function snapFor(user) {
  return {
    users: [
      {
        id: "u1",
        email: "gv@vsc.academy",
        name: "Giảng viên",
        role: "INSTRUCTOR",
        instructor_id: "i1",
        active: 1,
        must_change_password: 0,
        ...user,
      },
    ],
    programs: [{ id: "p1", primary_instructor_id: "i1", status: "published", name: "AI" }],
    program_instructors: [],
    sessions: [{ id: "s1", program_id: "p1", session_name: "Lớp 1" }],
    venues: [],
    instructors: [{ id: "i1", name: "GV" }],
    registrations: [{ id: "r1", full_name: "Học viên", email: "a@b.c" }],
    insights: [],
    resources: [],
    media: [],
    settings: [],
    students: [{ id: "st1", full_name: "HV", email: "hv@x.test" }],
    enrollments: [{ id: "e1", student_id: "st1", session_id: "s1", program_id: "p1", status: "active" }],
    class_meetings: [{ id: "m1", session_id: "s1" }],
    attendance: [],
    learning_materials: [
      {
        id: "mat1",
        program_id: "p1",
        session_id: "s1",
        meeting_id: null,
        title_vi: "Tài liệu lớp",
        deleted_at: null,
      },
    ],
    announcements: [
      {
        id: "a1",
        title_vi: "Thông báo lớp",
        target_type: "session",
        program_id: null,
        session_id: "s1",
        student_id: null,
      },
    ],
    certificates: [],
    certificate_templates: [],
    mail_outbox: [],
    notifications: [],
  };
}

function mockStore(user, options = {}) {
  const snap = snapFor(user);
  const writes = [];
  return {
    snap,
    writes,
    dump: async () => snap,
    upsert: async (table, row) => {
      writes.push({ table, row });
      if (!options.allowWrite) throw new Error("instructor must not write this store");
      const list = snap[table] || (snap[table] = []);
      const idx = list.findIndex((item) => item.id === row.id);
      if (idx >= 0) list[idx] = { ...list[idx], ...row };
      else list.push(row);
    },
    remove: async (table, id) => {
      if (!options.allowWrite) throw new Error("instructor must not delete");
      const list = snap[table] || [];
      snap[table] = list.filter((item) => String(item.id) !== String(id));
    },
    removeWhere: async () => {},
    url: "mock",
  };
}

function harnessFor(user, options = {}) {
  const store = mockStore(user, options);
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = {
      user: {
        id: "u1",
        email: "gv@vsc.academy",
        name: "Giảng viên",
        role: "INSTRUCTOR",
        instructorId: "i1",
        mustChangePassword: false,
        ...(options.sessionUser || {}),
      },
      destroy(cb) {
        req.session.user = null;
        if (cb) cb();
      },
    };
    next();
  });
  app.use("/api/admin", createAdminRouter(store));
  if (options.shell) {
    const adminDir = path.join(__dirname, "..", "..", "admin");
    app.use("/admin", express.static(adminDir, { index: false, extensions: ["html"], redirect: false }));
    const sendStaffShell = StaffPortal.createStaffShellHandler(
      store,
      adminDir,
    );
    app.get(/^\/admin(?:\/.*)?$/, sendStaffShell);
    app.get(/^\/giang-vien(?:\/.*)?$/, sendStaffShell);
  }
  return { app, store };
}

function appFor(user, options) {
  return harnessFor(user, options).app;
}

function request(app, { method = "GET", path: urlPath, body }) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      const req = http.request(
        {
          host: "127.0.0.1",
          port,
          method,
          path: urlPath,
          headers: { "Content-Type": "application/json" },
        },
        (res) => {
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            server.close();
            const text = Buffer.concat(chunks).toString("utf8");
            let json = {};
            try {
              json = text ? JSON.parse(text) : {};
            } catch {
              json = { raw: text };
            }
            resolve({
              status: res.statusCode,
              json,
              location: res.headers.location || "",
            });
          });
        },
      );
      req.on("error", (err) => {
        server.close();
        reject(err);
      });
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  });
}

test("instructor API allowlist permits class-scoped work and denies CMS/enrollment mutations", async () => {
  const app = appFor();
  const allowed = await request(app, { path: "/api/admin/sessions" });
  assert.equal(allowed.status, 200);
  const lms = await request(app, { path: "/api/admin/sessions/s1/lms" });
  assert.notEqual(lms.status, 403);
  const denied = [
    ["GET", "/api/admin/insights"],
    ["POST", "/api/admin/insights", { titleVi: "x", slugVi: "x" }],
    ["POST", "/api/admin/resources", { titleVi: "x", slug: "x" }],
    ["POST", "/api/admin/enrollments", { studentId: "st1", sessionId: "s1" }],
    ["PUT", "/api/admin/enrollments/e1", { status: "completed" }],
    ["DELETE", "/api/admin/enrollments/e1"],
    ["PUT", "/api/admin/students/st1", { notes: "nope" }],
    ["DELETE", "/api/admin/students/st1"],
    ["DELETE", "/api/admin/materials/m1"],
    ["DELETE", "/api/admin/announcements/a1"],
    ["GET", "/api/admin/registrations"],
    ["GET", "/api/admin/settings"],
    ["POST", "/api/admin/certificates/issue", { enrollmentId: "e1" }],
    ["DELETE", "/api/admin/certificate-templates/t1"],
  ];
  for (const [method, path, body] of denied) {
    const res = await request(app, { method, path, body });
    assert.equal(res.status, 403, `${method} ${path} should be forbidden, got ${res.status}`);
  }
});

test("registration CRUD enforces roles, validation, persistence, and protected soft deletion", async () => {
  const admin = { role: "ADMIN", instructor_id: null, email: "admin@vsc.academy" };
  const { app, store } = harnessFor(admin, {
    allowWrite: true,
    sessionUser: { role: "ADMIN", instructorId: null, email: "admin@vsc.academy" },
  });
  store.snap.registrations = [];
  store.snap.sessions[0].registered_count = 0;

  const invalid = await request(app, { method: "POST", path: "/api/admin/registrations", body: {} });
  assert.equal(invalid.status, 400);
  const created = await request(app, {
    method: "POST", path: "/api/admin/registrations",
    body: { fullName: "Nguyễn An", phone: "0901234567", email: "AN@example.com", sessionId: "s1", amount: 1200000, status: "pending_payment", consentPrivacy: true },
  });
  assert.equal(created.status, 201);
  assert.match(created.json.id, /^VSC-\d{4}-000001$/);
  const registration = store.snap.registrations.find((row) => row.id === created.json.id);
  assert.equal(registration.program_id, "p1");
  assert.equal(registration.email, "an@example.com");
  assert.equal(store.snap.sessions[0].registered_count, 1);

  const edited = await request(app, {
    method: "PUT", path: `/api/admin/registrations/${created.json.id}`,
    body: { fullName: "Nguyễn An B", phone: "0901234567", email: "an@example.com", sessionId: "s1", amount: 0, status: "cancelled", jobRole: "Quản lý" },
  });
  assert.equal(edited.status, 200);
  assert.equal(registration.created_at, store.snap.registrations[0].created_at);
  assert.equal(store.snap.registrations[0].job_role, "Quản lý");
  assert.equal(store.snap.sessions[0].registered_count, 0);

  let confirmedUpdates = 0;
  store.provisionLearnerAccount = async ({ registration }) => {
    confirmedUpdates += 1;
    return { ok: true, student: {}, enrollment: {}, ownership: {}, registration };
  };
  store.finalizeLearnerProvision = async () => {};
  store.abortLearnerProvision = async () => {};
  store.snap.students.push({ id: "st-confirmed", email: "an@example.com", status: "active" });
  store.snap.registrations[0].status = "confirmed";
  const confirmedEdit = await request(app, {
    method: "PUT", path: `/api/admin/registrations/${created.json.id}`,
    body: { fullName: "Nguyễn An C", sessionId: "s1", status: "confirmed" },
  });
  assert.equal(confirmedEdit.status, 200);
  assert.equal(confirmedUpdates, 1, "editing a confirmed registration must keep learner/enrollment synchronization");

  store.snap.registrations[0].student_id = "st1";
  const protectedDelete = await request(app, { method: "DELETE", path: `/api/admin/registrations/${created.json.id}` });
  assert.equal(protectedDelete.status, 409);
  store.snap.registrations[0].student_id = null;
  store.snap.enrollments = [];
  const deleted = await request(app, { method: "DELETE", path: `/api/admin/registrations/${created.json.id}` });
  assert.equal(deleted.status, 200);
  assert.ok(store.snap.registrations[0].deleted_at);

  const editor = appFor({ role: "EDITOR", instructor_id: null }, { sessionUser: { role: "EDITOR", instructorId: null } });
  const forbidden = await request(editor, { method: "POST", path: "/api/admin/registrations", body: {} });
  assert.equal(forbidden.status, 403);
});

test("enrollment CRUD enforces roles, duplicates, and protected soft deletion", async () => {
  const admin = { role: "ADMIN", instructor_id: null, email: "admin@vsc.academy" };
  const { app, store } = harnessFor(admin, {
    allowWrite: true,
    sessionUser: { role: "ADMIN", instructorId: null, email: "admin@vsc.academy" },
  });
  store.snap.students.push({ id: "st2", full_name: "Lan", email: "lan@x.test" });
  store.snap.sessions.push({ id: "s2", program_id: "p1", session_name: "Lớp 2" });

  const invalid = await request(app, { method: "POST", path: "/api/admin/enrollments", body: {} });
  assert.equal(invalid.status, 400);

  const created = await request(app, {
    method: "POST",
    path: "/api/admin/enrollments",
    body: { studentId: "st2", sessionId: "s2", paymentStatus: "unpaid", notes: "manual" },
  });
  assert.equal(created.status, 200);
  const enrollment = store.snap.enrollments.find((row) => row.id === created.json.id);
  assert.equal(enrollment.student_id, "st2");
  assert.equal(enrollment.session_id, "s2");
  assert.equal(enrollment.payment_status, "unpaid");
  assert.equal(enrollment.notes, "manual");

  const duplicate = await request(app, {
    method: "POST",
    path: "/api/admin/enrollments",
    body: { studentId: "st2", sessionId: "s2" },
  });
  assert.equal(duplicate.status, 400);

  const edited = await request(app, {
    method: "PUT",
    path: `/api/admin/enrollments/${created.json.id}`,
    body: { status: "paused", paymentStatus: "paid", notes: "updated" },
  });
  assert.equal(edited.status, 200);
  const updated = store.snap.enrollments.find((row) => row.id === created.json.id);
  assert.equal(updated.status, "paused");
  assert.equal(updated.payment_status, "paid");
  assert.equal(updated.notes, "updated");

  const listed = await request(app, { path: "/api/admin/enrollments" });
  assert.equal(listed.status, 200);
  assert.equal(listed.json.items.some((row) => row.id === created.json.id), true);

  store.snap.certificates.push({ id: "c1", enrollment_id: "e1", status: "issued" });
  const protectedDelete = await request(app, { method: "DELETE", path: "/api/admin/enrollments/e1" });
  assert.equal(protectedDelete.status, 409);

  const deleted = await request(app, { method: "DELETE", path: `/api/admin/enrollments/${created.json.id}` });
  assert.equal(deleted.status, 200);
  assert.ok(store.snap.enrollments.find((row) => row.id === created.json.id).deleted_at);
  const hidden = await request(app, { path: "/api/admin/enrollments" });
  assert.equal(hidden.json.items.some((row) => row.id === created.json.id), false);
  const missing = await request(app, { method: "DELETE", path: `/api/admin/enrollments/${created.json.id}` });
  assert.equal(missing.status, 404);

  const editor = appFor({ role: "EDITOR", instructor_id: null }, { sessionUser: { role: "EDITOR", instructorId: null } });
  const forbidden = await request(editor, { method: "POST", path: "/api/admin/enrollments", body: {} });
  assert.equal(forbidden.status, 403);
});

test("student list includes class names and can filter by session", async () => {
  const app = appFor(
    { role: "ADMIN", instructor_id: null },
    { allowWrite: true, sessionUser: { role: "ADMIN", instructorId: null, email: "admin@vsc.academy" } },
  );
  const listed = await request(app, { path: "/api/admin/students" });
  assert.equal(listed.status, 200);
  assert.equal(listed.json.items[0].classes[0].session_name, "Lớp 1");
  const filtered = await request(app, { path: "/api/admin/students?sessionId=s1" });
  assert.equal(filtered.json.items.length, 1);
  const empty = await request(app, { path: "/api/admin/students?sessionId=missing" });
  assert.equal(empty.json.items.length, 0);
});

test("admin can create, edit, and delete announcements", async () => {
  const admin = { role: "ADMIN", instructor_id: null, email: "admin@vsc.academy" };
  const { app, store } = harnessFor(admin, {
    allowWrite: true,
    sessionUser: { role: "ADMIN", instructorId: null, email: "admin@vsc.academy" },
  });

  const invalid = await request(app, { method: "POST", path: "/api/admin/announcements", body: {} });
  assert.equal(invalid.status, 400);

  const created = await request(app, {
    method: "POST",
    path: "/api/admin/announcements",
    body: { titleVi: "Nhắc buổi học", targetType: "session", sessionId: "s1", priority: "high" },
  });
  assert.equal(created.status, 200);
  const row = store.snap.announcements.find((item) => item.id === created.json.id);
  assert.equal(row.title_vi, "Nhắc buổi học");
  assert.equal(row.target_type, "session");
  assert.equal(row.session_id, "s1");

  const edited = await request(app, {
    method: "PUT",
    path: `/api/admin/announcements/${created.json.id}`,
    body: { titleVi: "Nhắc buổi học 2", targetType: "session", sessionId: "s1", priority: "normal" },
  });
  assert.equal(edited.status, 200);
  const updated = store.snap.announcements.find((item) => item.id === created.json.id);
  assert.equal(updated.title_vi, "Nhắc buổi học 2");
  assert.equal(updated.priority, "normal");

  const deleted = await request(app, { method: "DELETE", path: `/api/admin/announcements/${created.json.id}` });
  assert.equal(deleted.status, 200);
  assert.equal(store.snap.announcements.some((item) => item.id === created.json.id), false);
  const missing = await request(app, { method: "DELETE", path: `/api/admin/announcements/${created.json.id}` });
  assert.equal(missing.status, 404);
});

test("admin UI exposes announcement add, edit, and delete controls", () => {
  const ui = fs.readFileSync(path.join(__dirname, "..", "..", "admin", "admin.js"), "utf8");
  assert.match(ui, /\+ Thông báo/);
  assert.match(ui, /\["Tiêu đề", "Đối tượng", "Mức ưu tiên", "Thao tác"\]/);
  assert.match(ui, /data-ann-delete/);
  assert.match(ui, /id="ann-del"/);
  assert.match(ui, /confirmAction\("Xóa thông báo này\?"\)/);
});

test("admin can create, edit, and delete certificate templates", async () => {
  const admin = { role: "ADMIN", instructor_id: null, email: "admin@vsc.academy" };
  const { app, store } = harnessFor(admin, {
    allowWrite: true,
    sessionUser: { role: "ADMIN", instructorId: null, email: "admin@vsc.academy" },
  });

  const listed = await request(app, { path: "/api/admin/certificate-templates" });
  assert.equal(listed.status, 200);
  assert.equal(listed.json.items.some((row) => row.id === "tpl-vsc-default"), true);
  assert.equal(listed.json.items.some((row) => row.id === "tpl-vsc-completion-vi"), true);
  assert.equal(listed.json.items.some((row) => row.id === "tpl-vsc-completion-en"), true);
  const blockedDefault = await request(app, { method: "DELETE", path: "/api/admin/certificate-templates/tpl-vsc-default" });
  assert.equal(blockedDefault.status, 409);
  const blockedPair = await request(app, { method: "DELETE", path: "/api/admin/certificate-templates/tpl-vsc-completion-vi" });
  assert.equal(blockedPair.status, 409);

  const created = await request(app, {
    method: "POST",
    path: "/api/admin/certificate-templates",
    body: { name: "Mẫu offline", language: "vi", status: "draft" },
  });
  assert.equal(created.status, 200);
  const row = store.snap.certificate_templates.find((item) => item.id === created.json.id);
  assert.equal(row.name, "Mẫu offline");
  assert.equal(row.status, "draft");

  const edited = await request(app, {
    method: "PUT",
    path: `/api/admin/certificate-templates/${created.json.id}`,
    body: { name: "Mẫu offline 2", language: "en", status: "published" },
  });
  assert.equal(edited.status, 200);
  const updated = store.snap.certificate_templates.find((item) => item.id === created.json.id);
  assert.equal(updated.name, "Mẫu offline 2");
  assert.equal(updated.language, "en");

  store.snap.certificates.push({ id: "c-used", template_id: created.json.id, status: "issued" });
  const inUse = await request(app, { method: "DELETE", path: `/api/admin/certificate-templates/${created.json.id}` });
  assert.equal(inUse.status, 409);
  store.snap.certificates = [];

  const deleted = await request(app, { method: "DELETE", path: `/api/admin/certificate-templates/${created.json.id}` });
  assert.equal(deleted.status, 200);
  assert.equal(store.snap.certificate_templates.some((item) => item.id === created.json.id), false);
  const missing = await request(app, { method: "DELETE", path: `/api/admin/certificate-templates/${created.json.id}` });
  assert.equal(missing.status, 404);

  const editor = appFor({ role: "EDITOR", instructor_id: null }, { sessionUser: { role: "EDITOR", instructorId: null } });
  const forbidden = await request(editor, { method: "POST", path: "/api/admin/certificate-templates", body: { name: "x" } });
  assert.equal(forbidden.status, 403);
});

test("admin UI exposes certificate template add, edit, and delete controls", () => {
  const ui = fs.readFileSync(path.join(__dirname, "..", "..", "admin", "admin.js"), "utf8");
  assert.match(ui, /\+ Mẫu mới/);
  assert.match(ui, /\["Tên", "Ngôn ngữ", "Trạng thái", "Phiên bản", "Thao tác"\]/);
  assert.match(ui, /data-tpl-delete/);
  assert.match(ui, /id="tpl-del"/);
  assert.match(ui, /id="issue-template"/);
  assert.match(ui, /templateId/);
  assert.match(ui, /override: needsOverride/);
  assert.match(ui, /data-eligible/);
  assert.match(ui, /confirmAction\("Xóa mẫu chứng nhận này\?"\)/);
});

test("admin UI manages enrollments on the student record", () => {
  const ui = fs.readFileSync(path.join(__dirname, "..", "..", "admin", "admin.js"), "utf8");
  assert.match(ui, /data-enroll-delete/);
  assert.match(ui, /Gỡ khỏi lớp/);
  assert.match(ui, /confirmAction\("Xóa ghi danh này\?/);
  assert.match(ui, /redirectEnrollments/);
  assert.match(ui, /href\(`\/students\/\$\{row\.student_id\}\?tab=enroll`\)/);
  assert.doesNotMatch(ui, /\["Ghi danh"/);
  assert.doesNotMatch(ui, /\+ Ghi danh/);
  assert.doesNotMatch(ui, /id="enr-delete"/);
});

test("unmatched admin API returns JSON instead of an HTML error page", async () => {
  const { app } = harnessFor({ role: "ADMIN", instructor_id: null }, {
    allowWrite: true,
    sessionUser: { role: "ADMIN", instructorId: null, email: "admin@vsc.academy" },
  });
  const res = await request(app, { method: "DELETE", path: "/api/admin/does-not-exist" });
  assert.equal(res.status, 404);
  assert.equal(res.json.error, "Not found");
});

test("admin UI exposes registration add, edit, delete, and core fields", () => {
  const ui = fs.readFileSync(path.join(__dirname, "..", "..", "admin", "admin.js"), "utf8");
  assert.match(ui, /\+ Thêm đăng ký/);
  assert.match(ui, /\["ID", "Họ tên", "Khóa", "Lớp", "Số tiền", "Ngày", "Trạng thái", "Thao tác"\]/);
  assert.match(ui, /data-reg-delete/);
  for (const field of ["fullName", "phone", "email", "sessionId", "amount", "status", "jobRole", "organization", "goal", "source", "consentPrivacy", "consentMarketing"]) {
    assert.match(ui, new RegExp(`name=\\"${field}\\"`), `missing registration field ${field}`);
  }
  assert.match(ui, /confirmAction\("Xóa đăng ký này\?"\)/);
  assert.match(ui, /showLearnerCredentials/);
  assert.match(ui, /Gửi thông tin đăng nhập thủ công/);
  assert.doesNotMatch(ui, /Đã xác nhận và gửi email kích hoạt/);
  assert.match(ui, /REG_STATUS_OPTIONS/);
  assert.doesNotMatch(ui, /Danh sách chờ/);
  assert.doesNotMatch(ui, /Đã liên hệ/);
  assert.doesNotMatch(ui, /Giá riêng/);
  assert.doesNotMatch(ui, /name="priceOverride"/);
  assert.doesNotMatch(ui, /<label>Sĩ số<\/label>/);
  assert.match(ui, /canManageStaff\(\) \? `<a class="btn btn-primary" href="\$\{href\("\/registrations\/new"\)\}"/);
  assert.match(ui, /canManageStaff\(\) \? `<a class="btn" href="\$\{href\(`\/registrations\/\$\{r\.id\}`\)\}">Sửa/);
  assert.match(ui, /if \(isNew && !canManageStaff\(\)\)/);
});

test("admin UI hides instructor-forbidden enrollment and delete controls", () => {
  const ui = fs.readFileSync(path.join(__dirname, "..", "..", "admin", "admin.js"), "utf8");
  assert.match(ui, /canManageStaff\(\) \? `<select data-enr=/);
  assert.match(ui, /canManageStaff\(\) \? `<select data-pay=/);
  assert.match(ui, /canManageStaff\(\) \? `<button type="button" class="btn-danger" id="mat-del"/);
  assert.match(ui, /canManageStaff\(\) \? `<button type="button" class="btn-danger" id="ann-del"/);
  assert.match(ui, /captureNext\(/);
  assert.match(ui, /vsc_staff_next/);
  assert.doesNotMatch(ui, /\$\("#note-form"\)\.onsubmit/);
});

test("admin shell uses Vietnamese navigation and versioned assets", () => {
  const root = path.join(__dirname, "..", "..", "admin");
  const ui = fs.readFileSync(path.join(root, "admin.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  for (const label of ["Tổng quan", "Khóa học", "Lớp học", "Đăng ký", "Học viên", "Tài liệu", "Chứng nhận", "Giảng viên", "Cài đặt"]) {
    assert.match(ui, new RegExp(`\\["${label}"`), `missing Vietnamese navigation label: ${label}`);
  }
  assert.doesNotMatch(ui, /\["Ghi danh"/);
  for (const obsolete of ["Dashboard", "Programs", "Sessions", "Registrations", "Students", "Enrollments", "Materials", "Certificates", "Instructors", "Settings"]) {
    assert.doesNotMatch(ui, new RegExp(`\\["${obsolete}"`), `obsolete English navigation label: ${obsolete}`);
  }
  assert.match(html, /\/admin\/admin\.css\?v=[0-9-]+/);
  assert.match(html, /\/admin\/admin\.js\?v=[0-9-]+/);
});

test("instructor cannot create or clear unscoped materials", async () => {
  const { app, store } = harnessFor();
  const create = await request(app, {
    method: "POST",
    path: "/api/admin/materials",
    body: { titleVi: "Unscoped" },
  });
  assert.equal(create.status, 403);
  assert.equal(store.writes.length, 0);

  const clear = await request(app, {
    method: "PUT",
    path: "/api/admin/materials/mat1",
    body: { sessionId: "", programId: "", meetingId: "" },
  });
  assert.equal(clear.status, 403);
  assert.equal(store.writes.length, 0);

  const foreign = await request(app, {
    method: "POST",
    path: "/api/admin/materials",
    body: { titleVi: "Other class", sessionId: "s-other" },
  });
  assert.equal(foreign.status, 403);
});

test("instructor can create a session-scoped material", async () => {
  const { app, store } = harnessFor(undefined, { allowWrite: true });
  const res = await request(app, {
    method: "POST",
    path: "/api/admin/materials",
    body: { titleVi: "Tài liệu buổi 1", sessionId: "s1" },
  });
  assert.equal(res.status, 200);
  const material = store.writes.find((row) => row.table === "learning_materials");
  assert.ok(material);
  assert.equal(material.row.session_id, "s1");
  assert.equal(material.row.program_id, null);
});

test("instructor announcements require matching targetType and id", async () => {
  const { app, store } = harnessFor();
  const mismatches = [
    { titleVi: "Lớp", targetType: "session" },
    { titleVi: "Khoá", targetType: "program" },
    { titleVi: "HV", targetType: "student" },
  ];
  for (const body of mismatches) {
    const res = await request(app, { method: "POST", path: "/api/admin/announcements", body });
    assert.equal(res.status, 400, `${body.targetType} without id should be 400, got ${res.status}`);
  }
  const broadcast = await request(app, {
    method: "POST",
    path: "/api/admin/announcements",
    body: { titleVi: "All", targetType: "all" },
  });
  assert.equal(broadcast.status, 403);
  const retarget = await request(app, {
    method: "PUT",
    path: "/api/admin/announcements/a1",
    body: { targetType: "program" },
  });
  assert.equal(retarget.status, 400);
  const clear = await request(app, {
    method: "PUT",
    path: "/api/admin/announcements/a1",
    body: { sessionId: "" },
  });
  assert.equal(clear.status, 400);
  assert.equal(store.writes.length, 0);
});

test("GET /me and staff shell use the live Convex role, not the stale session", async () => {
  const instructorNow = harnessFor(
    { role: "INSTRUCTOR" },
    { sessionUser: { role: "OWNER", instructorId: "" }, shell: true },
  );
  const me = await request(instructorNow.app, { path: "/api/admin/me" });
  assert.equal(me.status, 200);
  assert.equal(me.json.user.role, "INSTRUCTOR");
  const adminShell = await request(instructorNow.app, { path: "/admin/sessions/s1" });
  assert.equal(adminShell.status, 302);
  assert.equal(adminShell.location, "/giang-vien/sessions/s1");

  const ownerNow = harnessFor(
    { role: "OWNER", instructor_id: "" },
    { sessionUser: { role: "INSTRUCTOR", instructorId: "i1" }, shell: true },
  );
  const meOwner = await request(ownerNow.app, { path: "/api/admin/me" });
  assert.equal(meOwner.status, 200);
  assert.equal(meOwner.json.user.role, "OWNER");
  const gvShell = await request(ownerNow.app, { path: "/giang-vien/students" });
  assert.equal(gvShell.status, 302);
  assert.equal(gvShell.location, "/admin/students");
});

test("disabled staff session is rejected on /me and does not keep a portal redirect", async () => {
  const { app } = harnessFor(
    { active: 0, role: "OWNER" },
    { sessionUser: { role: "OWNER" }, shell: true },
  );
  const me = await request(app, { path: "/api/admin/me" });
  assert.equal(me.status, 401);
  const shell = await request(app, { path: "/admin" });
  assert.equal(shell.status, 200);
  assert.equal(shell.location, "");
});

test("authenticated staff portal roots do not enter a slash redirect loop", async () => {
  const { app } = harnessFor(
    { role: "OWNER", instructor_id: "" },
    { sessionUser: { role: "OWNER", instructorId: "" }, shell: true },
  );
  for (const root of ["/admin", "/admin/"]) {
    const response = await request(app, { path: root });
    assert.equal(response.status, 200, `${root} should render directly`);
    assert.equal(response.location, "", `${root} should not redirect`);
  }
});
