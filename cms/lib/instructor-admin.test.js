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
    remove: async () => {
      throw new Error("instructor must not delete");
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
    ["PUT", "/api/admin/enrollments/e1", { status: "completed" }],
    ["PUT", "/api/admin/students/st1", { notes: "nope" }],
    ["DELETE", "/api/admin/materials/m1"],
    ["DELETE", "/api/admin/announcements/a1"],
    ["GET", "/api/admin/registrations"],
    ["GET", "/api/admin/settings"],
    ["POST", "/api/admin/certificates/issue", { enrollmentId: "e1" }],
  ];
  for (const [method, path, body] of denied) {
    const res = await request(app, { method, path, body });
    assert.equal(res.status, 403, `${method} ${path} should be forbidden, got ${res.status}`);
  }
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
