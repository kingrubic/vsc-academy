const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const fs = require("fs");
const path = require("path");
const express = require("express");
const { createAdminRouter } = require("../routes/admin");

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
    learning_materials: [],
    announcements: [],
    certificates: [],
    certificate_templates: [],
    mail_outbox: [],
    notifications: [],
  };
}

function mockStore(user) {
  const snap = snapFor(user);
  return {
    dump: async () => snap,
    upsert: async () => {
      throw new Error("instructor must not write this store");
    },
    remove: async () => {
      throw new Error("instructor must not delete");
    },
    removeWhere: async () => {},
    url: "mock",
  };
}

function appFor(user) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = {
      user: { id: "u1", email: "gv@vsc.academy", name: "Giảng viên", role: "INSTRUCTOR", instructorId: "i1", mustChangePassword: false, ...user },
      destroy(cb) {
        if (cb) cb();
      },
    };
    next();
  });
  app.use("/api/admin", createAdminRouter(mockStore(user)));
  return app;
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
            resolve({ status: res.statusCode, json });
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
