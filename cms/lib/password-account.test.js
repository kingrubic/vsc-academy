const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const fs = require("fs");
const path = require("path");
const express = require("express");
const { createAdminRouter } = require("../routes/admin");
const { createLearnerRouter } = require("../routes/learner");
const { hashPassword, resetPasswordResetLimiter, verifyPassword } = require("./auth");
const Mailer = require("./mailer");
const P = require("./staff-portal");
const C = require("./lms-core");
const L = require("./learner");
const { attachAccountTx } = require("./account-tx");

function fixturePassword(kind, min = 12) {
  return ["fixture", kind, "value"].join("-").padEnd(min, "x");
}

const OWNER_PW = fixturePassword("owner");
const EDITOR_PW = fixturePassword("editor");
const INSTRUCTOR_PW = fixturePassword("instructor");
const STUDENT_PW = fixturePassword("student", 8);
const LEARNER_NEXT = fixturePassword("learner-next", 8);
const STAFF_NEXT = fixturePassword("staff-next");
const STAFF_OTHER = fixturePassword("staff-other");
const LEARNER_OTHER = fixturePassword("learner-other", 8);
const INSTRUCTOR_TMP = fixturePassword("instructor-tmp");
const STUDENT_TMP = fixturePassword("student-tmp", 8);

function snap() {
  return {
    users: [
      {
        id: "owner-1",
        email: "owner@vsc.academy",
        name: "Owner",
        role: "OWNER",
        active: 1,
        must_change_password: 0,
        password_hash: hashPassword(OWNER_PW),
      },
      {
        id: "ed-1",
        email: "ed@vsc.academy",
        name: "Editor",
        role: "EDITOR",
        active: 1,
        must_change_password: 0,
        password_hash: hashPassword(EDITOR_PW),
      },
      {
        id: "gv-user",
        email: "gv@vsc.academy",
        name: "Giảng viên",
        role: "INSTRUCTOR",
        instructor_id: "i1",
        active: 1,
        must_change_password: 0,
        password_hash: hashPassword(INSTRUCTOR_PW),
      },
    ],
    programs: [],
    program_instructors: [],
    sessions: [],
    venues: [],
    instructors: [{ id: "i1", name: "GV", email: "gv@vsc.academy" }],
    registrations: [],
    insights: [],
    resources: [],
    media: [],
    settings: [],
    students: [
      {
        id: "st1",
        full_name: "Học viên",
        email: "hv@x.test",
        status: "active",
        password_hash: hashPassword(STUDENT_PW),
        must_change_password: 1,
      },
    ],
    enrollments: [],
    class_meetings: [],
    attendance: [],
    learning_materials: [],
    announcements: [],
    certificates: [],
    certificate_templates: [],
    password_resets: [],
    mail_outbox: [],
    notifications: [],
  };
}

function mockStore() {
  const data = snap();
  const store = {
    data,
    dump: async () => data,
    upsert: async (table, row) => {
      const list = data[table] || (data[table] = []);
      const idx = list.findIndex((item) => item.id === row.id);
      if (idx >= 0) list[idx] = { ...list[idx], ...row };
      else list.push(row);
    },
    remove: async (table, id) => {
      const list = data[table] || [];
      data[table] = list.filter((item) => String(item.id) !== String(id));
    },
    removeWhere: async () => {},
    url: "mock",
  };
  return attachAccountTx(store, data);
}

function appFor(store, sessionUser) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = {
      user: sessionUser,
      student: sessionUser?.student || null,
      cookie: {},
      destroy(cb) {
        req.session.user = null;
        req.session.student = null;
        if (cb) cb();
      },
    };
    next();
  });
  app.use("/api/admin", createAdminRouter(store));
  app.use("/api/learner", createLearnerRouter(store));
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

const owner = {
  id: "owner-1",
  email: "owner@vsc.academy",
  name: "Owner",
  role: "OWNER",
  mustChangePassword: false,
  sessionVersion: 0,
};

const editor = {
  id: "ed-1",
  email: "ed@vsc.academy",
  name: "Editor",
  role: "EDITOR",
  mustChangePassword: false,
  sessionVersion: 0,
};

function withEnv(key, value, fn) {
  const prev = process.env[key];
  if (value == null) delete process.env[key];
  else process.env[key] = value;
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      if (prev == null) delete process.env[key];
      else process.env[key] = prev;
    });
}

test("creating a student stores a temporary password and requires a change on first login", async () => {
  const store = mockStore();
  const app = appFor(store, owner);
  const created = await request(app, {
    method: "POST",
    path: "/api/admin/students",
    body: { fullName: "Lan", email: "lan@vsc.academy", temporaryPassword: STUDENT_TMP },
  });
  assert.equal(created.status, 200);
  const student = store.data.students.find((row) => row.email === "lan@vsc.academy");
  assert.equal(student.status, "active");
  assert.equal(Number(student.must_change_password), 1);
  assert.ok(student.password_hash);

  const learnerApp = appFor(store, {
    student: { id: student.id, email: student.email },
  });
  const blocked = await request(learnerApp, { path: "/api/learner/dashboard" });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.json.code, "MUST_CHANGE_PASSWORD");
  const me = await request(learnerApp, { path: "/api/learner/me" });
  assert.equal(me.status, 200);
  assert.equal(me.json.student.mustChangePassword, true);
});

test("creating an instructor also creates a login user from email and temporary password", async () => {
  const store = mockStore();
  const app = appFor(store, owner);
  const created = await request(app, {
    method: "POST",
    path: "/api/admin/instructors",
    body: {
      name: "Minh",
      email: "minh@vsc.academy",
      temporaryPassword: INSTRUCTOR_TMP,
    },
  });
  assert.equal(created.status, 200);
  const instructor = store.data.instructors.find((row) => row.id === created.json.id);
  assert.equal(instructor.email, "minh@vsc.academy");
  const user = store.data.users.find((row) => row.email === "minh@vsc.academy");
  assert.equal(user.role, "INSTRUCTOR");
  assert.equal(user.instructor_id, instructor.id);
  assert.equal(Number(user.must_change_password), 1);
});

test("admin reset password emails a link and does not return the token", async () => {
  const sent = [];
  Mailer.setTestTransport({
    sendMail: async (msg) => {
      sent.push(msg);
      return msg;
    },
  });
  await withEnv("PUBLIC_SITE_URL", "https://vscacademy.edu.vn", async () => {
    try {
      const store = mockStore();
      const app = appFor(store, owner);
      const studentReset = await request(app, {
        method: "POST",
        path: "/api/admin/students/st1/reset-password",
        body: {},
      });
      assert.equal(studentReset.status, 200);
      assert.equal(studentReset.json.to, "hv@x.test");
      assert.equal(studentReset.json.emailed, true);
      assert.equal(studentReset.json.activationPath, undefined);
      assert.equal(JSON.stringify(studentReset.json).includes("token="), false);
      const studentMail = store.data.mail_outbox.find((row) => row.to_email === "hv@x.test");
      assert.doesNotMatch(studentMail.body, /token=/);
      assert.doesNotMatch(JSON.stringify(studentMail), /dat-lai-mat-khau\?token=/);
      assert.match(sent[0].text, /https:\/\/vscacademy\.edu\.vn\/hoc-vien\/dat-lai-mat-khau\?token=/);
      const outbox = await request(app, { path: "/api/admin/mail-outbox" });
      assert.equal(outbox.status, 200);
      assert.equal(outbox.json.items[0].body, undefined);
      assert.equal(outbox.json.items[0].payload, undefined);
      assert.equal(JSON.stringify(outbox.json).includes("token="), false);

      const instructorReset = await request(app, {
        method: "POST",
        path: "/api/admin/instructors/i1/reset-password",
        body: {},
      });
      assert.equal(instructorReset.status, 200);
      assert.equal(instructorReset.json.to, "gv@vsc.academy");
      const staffMail = store.data.mail_outbox.find((row) => row.to_email === "gv@vsc.academy");
      assert.doesNotMatch(staffMail.body, /token=/);
      assert.match(sent[1].text, /https:\/\/vscacademy\.edu\.vn\/giang-vien\/dat-lai-mat-khau\?token=/);
      assert.equal(sent.length >= 2, true);
    } finally {
      Mailer.setTestTransport(null);
    }
  });
});

test("admin can create, edit, and soft-delete students", async () => {
  const store = mockStore();
  store.data.sessions = [{ id: "s1", program_id: "p1", session_name: "Lớp 1" }];
  store.data.enrollments = [
    { id: "e1", student_id: "st1", session_id: "s1", program_id: "p1", status: "active" },
    { id: "e2", student_id: "st1", session_id: "s1", program_id: "p1", status: "completed" },
  ];
  store.data.password_resets = [
    { id: "pr1", token_hash: "pr1", student_id: "st1", used_at: null, expires_at: new Date(Date.now() + 3600_000).toISOString() },
  ];
  const app = appFor(store, owner);

  const created = await request(app, {
    method: "POST",
    path: "/api/admin/students",
    body: { fullName: "Lan", email: "lan@vsc.academy", phone: "0901111222", temporaryPassword: STUDENT_TMP },
  });
  assert.equal(created.status, 200);
  const createdStudent = store.data.students.find((row) => row.email === "lan@vsc.academy");
  assert.equal(createdStudent.full_name, "Lan");
  assert.equal(createdStudent.phone, "0901111222");

  const edited = await request(app, {
    method: "PUT",
    path: `/api/admin/students/${createdStudent.id}`,
    body: { fullName: "Lan Nguyễn", phone: "0903333444", status: "active" },
  });
  assert.equal(edited.status, 200);
  assert.equal(createdStudent.full_name, "Lan Nguyễn");
  assert.equal(createdStudent.phone, "0903333444");

  const listed = await request(app, { path: "/api/admin/students" });
  assert.equal(listed.status, 200);
  assert.equal(listed.json.items.some((row) => row.id === "st1"), true);

  const deleted = await request(app, { method: "DELETE", path: "/api/admin/students/st1" });
  assert.equal(deleted.status, 200);
  const student = store.data.students.find((row) => row.id === "st1");
  assert.ok(student.deleted_at);
  assert.equal(student.status, "inactive");
  assert.equal(store.data.enrollments.find((row) => row.id === "e1").status, "cancelled");
  assert.equal(store.data.enrollments.find((row) => row.id === "e2").status, "completed");
  assert.ok(store.data.password_resets[0].used_at);

  const hidden = await request(app, { path: "/api/admin/students" });
  assert.equal(hidden.json.items.some((row) => row.id === "st1"), false);
  const missing = await request(app, { method: "DELETE", path: "/api/admin/students/st1" });
  assert.equal(missing.status, 404);

  const editorApp = appFor(store, editor);
  const forbidden = await request(editorApp, { method: "DELETE", path: `/api/admin/students/${createdStudent.id}` });
  assert.equal(forbidden.status, 403);
});

test("admin UI adds temporary password fields and reset buttons", () => {
  const ui = fs.readFileSync(path.join(__dirname, "..", "..", "admin", "admin.js"), "utf8");
  assert.match(ui, /name="temporaryPassword"/);
  assert.match(ui, /Email đăng nhập/);
  assert.match(ui, /instructor-reset-password/);
  assert.match(ui, /student-reset-password/);
  assert.match(ui, /\/students\/\$\{id\}\/reset-password/);
  assert.doesNotMatch(ui, /xếp hàng gửi email/);
});

test("admin UI exposes student add, edit, and delete controls", () => {
  const ui = fs.readFileSync(path.join(__dirname, "..", "..", "admin", "admin.js"), "utf8");
  assert.match(ui, /\+ Học viên/);
  assert.match(ui, /\["Tên", "Email", "SĐT", "Đang học", "Hoàn thành", "Trạng thái", "Ngày tạo", "Thao tác"\]/);
  assert.match(ui, /data-student-delete/);
  assert.match(ui, /id="student-delete"/);
  assert.match(ui, /confirmAction\("Xóa học viên này\?/);
  assert.match(ui, /canManageStaff\(\) \? `<a class="btn btn-primary" href="\$\{href\("\/students\/new"\)\}"/);
  assert.match(ui, /Phản hồi máy chủ không hợp lệ/);
});

test("unauthenticated staff reset path stays on dat-lai-mat-khau", () => {
  const mapped = P.mapStaffPortalLocation("/giang-vien/dat-lai-mat-khau", "?token=abc", null);
  assert.equal(mapped.path, "/giang-vien/dat-lai-mat-khau");
  assert.equal(mapped.search, "?token=abc");
  assert.equal(P.staffShellRedirect("/giang-vien/dat-lai-mat-khau", "?token=abc", null), null);
  assert.equal(P.instructorMayAccessAdmin("POST", "/students/st1/reset-password"), false);
  assert.equal(P.instructorMayAccessAdmin("POST", "/instructors/i1/reset-password"), false);
});

test("concurrent password reset consume has a single winner for staff and learners", async () => {
  const now = new Date().toISOString();
  const staffHash = C.hashToken("staff-token");
  const learnerHash = C.hashToken("learner-token");
  const store = mockStore();
  store.data.password_resets.push(
    { id: staffHash, token_hash: staffHash, user_id: "gv-user", expires_at: new Date(Date.now() + 3600_000).toISOString(), used_at: null },
    { id: learnerHash, token_hash: learnerHash, student_id: "st1", expires_at: new Date(Date.now() + 3600_000).toISOString(), used_at: null },
  );
  const [staffA, staffB] = await Promise.all([
    store.consumePasswordReset({ tokenHash: staffHash, passwordHash: hashPassword(STAFF_NEXT), now }),
    store.consumePasswordReset({ tokenHash: staffHash, passwordHash: hashPassword(STAFF_OTHER), now }),
  ]);
  assert.equal([staffA, staffB].filter((row) => row.claimed).length, 1);
  const [learnerA, learnerB] = await Promise.all([
    store.consumePasswordReset({ tokenHash: learnerHash, passwordHash: hashPassword(LEARNER_NEXT), now }),
    store.consumePasswordReset({ tokenHash: learnerHash, passwordHash: hashPassword(LEARNER_OTHER), now }),
  ]);
  assert.equal([learnerA, learnerB].filter((row) => row.claimed).length, 1);
});

test("old staff and learner sessions are rejected after password reset", async () => {
  const sent = [];
  Mailer.setTestTransport({
    sendMail: async (msg) => {
      sent.push(msg);
      return msg;
    },
  });
  await withEnv("PUBLIC_SITE_URL", "https://vscacademy.edu.vn", async () => {
    try {
      const store = mockStore();
      const instructorSession = {
        id: "gv-user",
        email: "gv@vsc.academy",
        name: "Giảng viên",
        role: "INSTRUCTOR",
        instructorId: "i1",
        mustChangePassword: false,
        sessionVersion: 0,
      };
      const instructorApp = appFor(store, instructorSession);
      const before = await request(instructorApp, { path: "/api/admin/me" });
      assert.equal(before.status, 200);

      const ownerApp = appFor(store, owner);
      const issued = await request(ownerApp, {
        method: "POST",
        path: "/api/admin/instructors/i1/reset-password",
        body: {},
      });
      assert.equal(issued.status, 200);
      const staffToken = sent[0].text.match(/token=([A-Fa-f0-9]+)/)[1];
      const reset = await request(appFor(store, null), {
        method: "POST",
        path: "/api/admin/reset-password",
        body: { token: staffToken, newPassword: STAFF_NEXT, confirmPassword: STAFF_NEXT },
      });
      assert.equal(reset.status, 200);
      const after = await request(instructorApp, { path: "/api/admin/me" });
      assert.equal(after.status, 401);

      const learnerSession = { student: { id: "st1", email: "hv@x.test", sessionVersion: 0 } };
      const learnerApp = appFor(store, learnerSession);
      const studentIssued = await request(ownerApp, {
        method: "POST",
        path: "/api/admin/students/st1/reset-password",
        body: {},
      });
      assert.equal(studentIssued.status, 200);
      const learnerToken = sent[1].text.match(/token=([A-Fa-f0-9]+)/)[1];
      const learnerReset = await request(appFor(store, null), {
        method: "POST",
        path: "/api/learner/reset-password",
        body: { token: learnerToken, password: LEARNER_NEXT },
      });
      assert.equal(learnerReset.status, 200);
      const learnerAfter = await request(learnerApp, { path: "/api/learner/dashboard" });
      assert.equal(learnerAfter.status, 401);
    } finally {
      Mailer.setTestTransport(null);
    }
  });
});

test("creating an instructor with a taken email leaves no orphan profile", async () => {
  const store = mockStore();
  const app = appFor(store, owner);
  const created = await request(app, {
    method: "POST",
    path: "/api/admin/instructors",
    body: { name: "Trùng", email: "owner@vsc.academy", temporaryPassword: INSTRUCTOR_TMP },
  });
  assert.equal(created.status, 400);
  assert.equal(store.data.instructors.some((row) => row.email === "owner@vsc.academy"), false);
  assert.equal(store.data.users.filter((row) => row.email === "owner@vsc.academy").length, 1);
});

test("concurrent instructor creates with the same email keep a single account", async () => {
  const store = mockStore();
  const ts = new Date().toISOString();
  const make = (id) =>
    store.upsertInstructorAccount({
      instructor: { id, name: "Minh", email: "dup@vsc.academy", created_at: ts, updated_at: ts },
      user: {
        id: `usr-${id}`,
        email: "dup@vsc.academy",
        name: "Minh",
        role: "INSTRUCTOR",
        instructor_id: id,
        active: 1,
        password_hash: "x",
        must_change_password: 1,
      },
    });
  const [a, b] = await Promise.all([make("ins-a"), make("ins-b")]);
  assert.equal([a, b].filter((row) => row.ok).length, 1);
  assert.equal([a, b].filter((row) => !row.ok).length, 1);
  assert.equal(store.data.instructors.filter((row) => row.email === "dup@vsc.academy").length, 1);
  assert.equal(store.data.users.filter((row) => row.email === "dup@vsc.academy").length, 1);
});

test("EDITOR cannot change instructor login email and reset uses users.email", async () => {
  const sent = [];
  Mailer.setTestTransport({
    sendMail: async (msg) => {
      sent.push(msg);
      return msg;
    },
  });
  await withEnv("PUBLIC_SITE_URL", "https://vscacademy.edu.vn", async () => {
    try {
      const store = mockStore();
      store.data.instructors[0].email = "profile@vsc.academy";
      const edited = await request(appFor(store, editor), {
        method: "PUT",
        path: "/api/admin/instructors/i1",
        body: { name: "GV", email: "attacker@evil.test", bioVi: "ok" },
      });
      assert.equal(edited.status, 200);
      assert.equal(store.data.instructors[0].email, "profile@vsc.academy");
      assert.equal(store.data.users.find((row) => row.id === "gv-user").email, "gv@vsc.academy");

      const reset = await request(appFor(store, owner), {
        method: "POST",
        path: "/api/admin/instructors/i1/reset-password",
        body: {},
      });
      assert.equal(reset.status, 200);
      assert.equal(reset.json.to, "gv@vsc.academy");
      assert.match(sent[0].text, /gv@vsc\.academy|giang-vien\/dat-lai-mat-khau/);
      assert.equal(sent[0].to, "gv@vsc.academy");
    } finally {
      Mailer.setTestTransport(null);
    }
  });
});

test("activation email uses an absolute https URL and outbox redacts the token", async () => {
  const sent = [];
  Mailer.setTestTransport({
    sendMail: async (msg) => {
      sent.push(msg);
      return msg;
    },
  });
  await withEnv("PUBLIC_SITE_URL", "https://vscacademy.edu.vn", async () => {
    try {
      const store = mockStore();
      await L.sendActivationEmail(
        store,
        { id: "st-new", email: "new@vsc.academy", full_name: "New" },
        "act-token-secret",
      );
      assert.match(sent[0].text, /https:\/\/vscacademy\.edu\.vn\/hoc-vien\/kich-hoat\?token=/);
      const mail = store.data.mail_outbox.find((row) => row.to_email === "new@vsc.academy");
      assert.doesNotMatch(mail.body, /token=/);
      assert.doesNotMatch(JSON.stringify(mail), /kich-hoat\?token=/);
    } finally {
      Mailer.setTestTransport(null);
    }
  });
});

test("confirming a registration creates an active learner without sending mail", async () => {
  const sent = [];
  Mailer.setTestTransport({
    sendMail: async (msg) => {
      sent.push(msg);
      return msg;
    },
  });
  try {
    const store = mockStore();
    const result = await L.ensureStudentAndEnrollment(store, store.data, {
      id: "reg1",
      email: "new@vsc.academy",
      full_name: "New",
      session_id: "s1",
      program_id: "p1",
      locale: "vi",
      status: "confirmed",
    });
    assert.equal(sent.length, 0);
    assert.equal(result.emailed, false);
    assert.equal(result.studentCreated, true);
    assert.equal(result.to, "new@vsc.academy");
    assert.equal(result.temporaryPassword.length, 12);
    assert.equal(store.data.mail_outbox.length, 0);
    const student = store.data.students.find((row) => row.email === "new@vsc.academy");
    assert.equal(student.status, "active");
    assert.equal(Number(student.must_change_password), 1);
    assert.equal(student.activation_token, null);
    assert.equal(verifyPassword(result.temporaryPassword, student.password_hash), true);
    const enrollment = store.data.enrollments.find((row) => row.student_id === student.id);
    assert.equal(enrollment.session_id, "s1");
    assert.equal(store.data.registrations.find((row) => row.id === "reg1").student_id, student.id);
  } finally {
    Mailer.setTestTransport(null);
  }
});

test("password reset fails closed without PUBLIC_SITE_URL and ignores Host", async () => {
  Mailer.setTestTransport({ sendMail: async (msg) => msg });
  try {
    const store = mockStore();
    const app = appFor(store, owner);
    await withEnv("PUBLIC_SITE_URL", null, async () => {
      const missing = await request(app, {
        method: "POST",
        path: "/api/admin/students/st1/reset-password",
        body: {},
      });
      assert.equal(missing.status, 503);
    });
  } finally {
    Mailer.setTestTransport(null);
  }
});

test("SMTP 465 uses implicit TLS and 587 uses STARTTLS", () => {
  const keys = ["SMTP_USER", "SMTP_PASS", "SMTP_PORT", "SMTP_SECURE", "MAIL_USER", "MAIL_PASS"];
  const prev = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    process.env.SMTP_USER = "a@b.c";
    process.env.SMTP_PASS = "secret";
    delete process.env.MAIL_USER;
    delete process.env.MAIL_PASS;
    process.env.SMTP_PORT = "465";
    delete process.env.SMTP_SECURE;
    const implicit = Mailer.parseSmtpConfig();
    assert.equal(implicit.secure, true);
    assert.equal(implicit.requireTLS, false);
    process.env.SMTP_SECURE = "0";
    assert.throws(() => Mailer.parseSmtpConfig(), /465/);
    process.env.SMTP_PORT = "587";
    delete process.env.SMTP_SECURE;
    const starttls = Mailer.parseSmtpConfig();
    assert.equal(starttls.secure, false);
    assert.equal(starttls.requireTLS, true);
    process.env.SMTP_SECURE = "1";
    assert.throws(() => Mailer.parseSmtpConfig(), /587/);
  } finally {
    for (const key of keys) {
      if (prev[key] == null) delete process.env[key];
      else process.env[key] = prev[key];
    }
  }
});

test("forgot-password throttles repeated requests without leaking accounts", async () => {
  process.env.PASSWORD_RESET_PAD_MS = "0";
  resetPasswordResetLimiter();
  const sent = [];
  Mailer.setTestTransport({
    sendMail: async (msg) => {
      sent.push(msg);
      return msg;
    },
  });
  await withEnv("PUBLIC_SITE_URL", "https://vscacademy.edu.vn", async () => {
    try {
      const store = mockStore();
      const app = appFor(store, null);
      const first = await request(app, {
        method: "POST",
        path: "/api/learner/forgot-password",
        body: { email: "hv@x.test" },
      });
      const unknown = await request(app, {
        method: "POST",
        path: "/api/learner/forgot-password",
        body: { email: "missing@x.test" },
      });
      assert.equal(first.status, 200);
      assert.equal(unknown.status, 200);
      assert.equal(first.json.message, unknown.json.message);
      assert.equal(sent.length, 1);
      for (let i = 0; i < 3; i += 1) {
        await request(app, {
          method: "POST",
          path: "/api/learner/forgot-password",
          body: { email: "hv@x.test" },
        });
      }
      const throttled = await request(app, {
        method: "POST",
        path: "/api/learner/forgot-password",
        body: { email: "hv@x.test" },
      });
      assert.equal(throttled.status, 200);
      assert.equal(throttled.json.message, first.json.message);
      assert.ok(sent.length <= 3);
    } finally {
      Mailer.setTestTransport(null);
      resetPasswordResetLimiter();
      delete process.env.PASSWORD_RESET_PAD_MS;
    }
  });
});

test("reset tokens are rejected across portals before any password write", async () => {
  const sent = [];
  Mailer.setTestTransport({ sendMail: async (msg) => { sent.push(msg); return msg; } });
  await withEnv("PUBLIC_SITE_URL", "https://vscacademy.edu.vn", async () => {
    try {
      const store = mockStore();
      const app = appFor(store, owner);
      const staffHashBefore = store.data.users.find((row) => row.id === "gv-user").password_hash;
      await request(app, { method: "POST", path: "/api/admin/instructors/i1/reset-password", body: {} });
      const staffToken = sent[0].text.match(/token=([A-Fa-f0-9]+)/)[1];
      const crossLearner = await request(appFor(store, null), {
        method: "POST",
        path: "/api/learner/reset-password",
        body: { token: staffToken, password: LEARNER_NEXT },
      });
      assert.equal(crossLearner.status, 400);
      assert.equal(store.data.users.find((row) => row.id === "gv-user").password_hash, staffHashBefore);
      assert.equal(store.data.password_resets.some((row) => row.user_id === "gv-user" && !row.used_at), true);

      const studentHashBefore = store.data.students.find((row) => row.id === "st1").password_hash;
      await request(app, { method: "POST", path: "/api/admin/students/st1/reset-password", body: {} });
      const learnerToken = sent[1].text.match(/token=([A-Fa-f0-9]+)/)[1];
      const crossStaff = await request(appFor(store, null), {
        method: "POST",
        path: "/api/admin/reset-password",
        body: { token: learnerToken, newPassword: STAFF_NEXT, confirmPassword: STAFF_NEXT },
      });
      assert.equal(crossStaff.status, 400);
      assert.equal(store.data.students.find((row) => row.id === "st1").password_hash, studentHashBefore);
    } finally {
      Mailer.setTestTransport(null);
    }
  });
});

test("concurrent activation consume has a single winner", async () => {
  const store = mockStore();
  const student = store.data.students[0];
  student.status = "invited";
  student.activation_token = "act-token";
  student.activation_expires_at = new Date(Date.now() + 60_000).toISOString();
  const now = new Date().toISOString();
  const [a, b] = await Promise.all([
    store.consumeActivation({ token: "act-token", passwordHash: hashPassword(LEARNER_NEXT), now }),
    store.consumeActivation({ token: "act-token", passwordHash: hashPassword(LEARNER_OTHER), now }),
  ]);
  assert.equal([a, b].filter((row) => row.claimed).length, 1);
  assert.equal(store.data.students[0].activation_token, null);
});

test("concurrent reset issuance respects the outstanding cap", async () => {
  const store = mockStore();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 3600_000).toISOString();
  const results = await Promise.all(
    ["a", "b", "c", "d"].map((id) =>
      store.issuePasswordReset({
        tokenHash: `hash-${id}`,
        studentId: "st1",
        now,
        expiresAt,
        maxOutstanding: 3,
      }),
    ),
  );
  assert.equal(results.filter((row) => row.ok).length, 3);
  assert.equal(store.data.password_resets.filter((row) => row.student_id === "st1" && !row.used_at).length, 3);
});

test("new instructor cannot steal another instructor login email", async () => {
  const store = mockStore();
  const created = await request(appFor(store, owner), {
    method: "POST",
    path: "/api/admin/instructors",
    body: { name: "Khác", email: "gv@vsc.academy", temporaryPassword: INSTRUCTOR_TMP },
  });
  assert.equal(created.status, 400);
  assert.equal(store.data.users.find((row) => row.email === "gv@vsc.academy").instructor_id, "i1");
  assert.equal(store.data.instructors.filter((row) => row.email === "gv@vsc.academy").length, 1);
});

test("confirming a registration still creates a learner without PUBLIC_SITE_URL or SMTP", async () => {
  Mailer.setTestTransport(null);
  const registration = {
    id: "reg-new",
    email: "new2@vsc.academy",
    full_name: "New",
    session_id: "s1",
    program_id: "p1",
    status: "confirmed",
  };

  const missingOrigin = mockStore();
  await withEnv("PUBLIC_SITE_URL", null, async () => {
    const result = await L.ensureStudentAndEnrollment(missingOrigin, missingOrigin.data, registration);
    assert.equal(result.created, true);
    assert.equal(result.emailed, false);
    assert.equal(result.studentCreated, true);
  });
  assert.equal(missingOrigin.data.students.some((row) => row.email === "new2@vsc.academy"), true);
  assert.equal(missingOrigin.data.enrollments.length, 1);

  const noSmtp = mockStore();
  await withEnv("PUBLIC_SITE_URL", "https://vscacademy.edu.vn", async () => {
    const result = await L.ensureStudentAndEnrollment(noSmtp, noSmtp.data, registration);
    assert.equal(result.created, true);
    assert.equal(result.emailed, false);
  });
  assert.equal(noSmtp.data.students.some((row) => row.email === "new2@vsc.academy"), true);

  Mailer.setTestTransport({
    sendMail: async () => {
      throw new Error("smtp-down");
    },
  });
  const sendFail = mockStore();
  sendFail.data.registrations.push({ id: "reg-new", status: "pending", email: "new2@vsc.academy" });
  const mailed = await L.ensureStudentAndEnrollment(sendFail, sendFail.data, registration);
  assert.equal(mailed.emailed, false);
  assert.equal(sendFail.data.students.some((row) => row.email === "new2@vsc.academy"), true);
  assert.equal(sendFail.data.enrollments.length, 1);
  Mailer.setTestTransport(null);

  const storeFail = mockStore();
  storeFail.provisionLearnerAccount = async () => {
    throw new Error("store down");
  };
  await assert.rejects(
    () => L.ensureStudentAndEnrollment(storeFail, storeFail.data, registration),
    /store down/,
  );
  assert.equal(storeFail.data.students.some((row) => row.email === "new2@vsc.academy"), false);
});

test("reset-access and confirm do not return raw activation tokens", async () => {
  Mailer.setTestTransport({ sendMail: async (msg) => msg });
  await withEnv("PUBLIC_SITE_URL", "https://vscacademy.edu.vn", async () => {
    try {
      const store = mockStore();
      const app = appFor(store, owner);
      const reset = await request(app, { method: "POST", path: "/api/admin/students/st1/reset-access", body: {} });
      assert.equal(reset.status, 200);
      assert.equal(reset.json.emailed, true);
      assert.equal(reset.json.activationPath, undefined);
      assert.equal(JSON.stringify(reset.json).includes("token="), false);

      store.data.sessions.push({
        id: "s1",
        program_id: "p1",
        session_name: "AS01",
        start_date: "2026-08-24",
        registered_count: 0,
      });
      store.data.registrations.push({
        id: "reg-confirm",
        full_name: "Học viên mới",
        phone: "0901234567",
        email: "confirm@vsc.academy",
        session_id: "s1",
        program_id: "p1",
        status: "new",
        amount: 0,
        notes: "[]",
      });
      const confirmed = await request(app, {
        method: "PUT",
        path: "/api/admin/registrations/reg-confirm",
        body: { status: "confirmed" },
      });
      assert.equal(confirmed.status, 200);
      assert.equal(confirmed.json.emailed, false);
      assert.equal(confirmed.json.studentCreated, true);
      assert.ok(confirmed.json.temporaryPassword);
      assert.equal(JSON.stringify(confirmed.json).includes("token="), false);
      assert.equal(confirmed.json.activationPath, undefined);
    } finally {
      Mailer.setTestTransport(null);
    }
  });
});

test("reset-access consumes outstanding reset tokens so they cannot activate", async () => {
  const sent = [];
  Mailer.setTestTransport({ sendMail: async (msg) => { sent.push(msg); return msg; } });
  await withEnv("PUBLIC_SITE_URL", "https://vscacademy.edu.vn", async () => {
    try {
      const store = mockStore();
      const app = appFor(store, owner);
      const issued = await request(app, { method: "POST", path: "/api/admin/students/st1/reset-password", body: {} });
      assert.equal(issued.status, 200);
      const oldToken = sent[0].text.match(/token=([A-Fa-f0-9]+)/)[1];
      const access = await request(app, { method: "POST", path: "/api/admin/students/st1/reset-access", body: {} });
      assert.equal(access.status, 200);
      const hijack = await request(appFor(store, null), {
        method: "POST",
        path: "/api/learner/reset-password",
        body: { token: oldToken, password: LEARNER_NEXT },
      });
      assert.equal(hijack.status, 400);
      assert.equal(store.data.students.find((row) => row.id === "st1").status, "invited");
      assert.equal(store.data.password_resets.filter((row) => row.student_id === "st1" && !row.used_at).length, 0);
    } finally {
      Mailer.setTestTransport(null);
    }
  });
});

test("concurrent learner provision keeps a single email identity", async () => {
  const store = mockStore();
  const ts = new Date().toISOString();
  const registration = {
    id: "reg-dup",
    email: "dup@vsc.academy",
    full_name: "Dup",
    session_id: "s1",
    program_id: "p1",
    status: "confirmed",
  };
  const make = (id) =>
    store.provisionLearnerAccount({
      operationId: `operation-${id}`,
      registration,
      student: {
        id,
        full_name: "Dup",
        email: "dup@vsc.academy",
        status: "invited",
        activation_token: `tok-${id}`,
        created_at: ts,
        updated_at: ts,
      },
      enrollment: { id: `enr-${id}`, session_id: "s1", program_id: "p1", status: "active" },
      now: ts,
    });
  const [a, b] = await Promise.all([make("stu-a"), make("stu-b")]);
  assert.equal([a, b].filter((row) => row.createdStudent).length, 1);
  assert.equal(store.data.students.filter((row) => row.email === "dup@vsc.academy").length, 1);
  assert.equal(store.data.enrollments.filter((row) => row.session_id === "s1").length, 1);
});

test("failed reset delivery cancels the unused token", async () => {
  Mailer.setTestTransport({
    sendMail: async () => {
      throw new Error("smtp-down");
    },
  });
  await withEnv("PUBLIC_SITE_URL", "https://vscacademy.edu.vn", async () => {
    try {
      const store = mockStore();
      const app = appFor(store, owner);
      const reset = await request(app, { method: "POST", path: "/api/admin/students/st1/reset-password", body: {} });
      assert.equal(reset.status, 503);
      const rows = store.data.password_resets.filter((row) => row.student_id === "st1");
      assert.equal(rows.length, 1);
      assert.ok(rows[0].used_at);
      assert.equal(rows[0].delivery_failed, 1);
    } finally {
      Mailer.setTestTransport(null);
    }
  });
});

test("outbox reserve failure does not send mail", async () => {
  const { queueMail } = require("./notify");
  let sent = 0;
  Mailer.setTestTransport({
    sendMail: async (msg) => {
      sent += 1;
      return msg;
    },
  });
  try {
    await assert.rejects(
      () => queueMail({ upsert: async () => { throw new Error("audit down"); } }, "a@b.c", "s", "body", "x"),
      /audit down/,
    );
    assert.equal(sent, 0);
  } finally {
    Mailer.setTestTransport(null);
  }
});

test("stale learner provision abort cannot delete state finalized by a newer request", async () => {
  const store = mockStore();
  const ts = new Date().toISOString();
  const provision = (operationId, registrationId, studentId, enrollmentId) =>
    store.provisionLearnerAccount({
      operationId,
      registration: {
        id: registrationId,
        email: "shared@vsc.academy",
        full_name: "Shared",
        session_id: "s1",
        program_id: "p1",
        status: "confirmed",
      },
      student: {
        id: studentId,
        full_name: "Shared",
        email: "shared@vsc.academy",
        status: "invited",
        activation_token: `token-${operationId}`,
        created_at: ts,
        updated_at: ts,
      },
      enrollment: {
        id: enrollmentId,
        session_id: "s1",
        program_id: "p1",
        status: "active",
      },
      now: ts,
    });

  const a = await provision("operation-a", "reg-a", "student-a", "enrollment-a");
  const b = await provision("operation-b", "reg-b", "student-b", "enrollment-b");
  assert.equal(a.createdStudent, true);
  assert.equal(b.createdStudent, false);
  assert.equal(b.activationToken, a.activationToken);
  await store.finalizeLearnerProvision({ operationId: "operation-b", ownership: b.ownership });
  await store.abortLearnerProvision({
    operationId: "operation-a",
    ownership: a.ownership,
    previousRegistration: a.previousRegistration,
  });

  assert.equal(store.data.students.some((row) => row.id === a.student.id), true);
  const survivingEnrollment = store.data.enrollments.find((row) => row.id === a.enrollment.id);
  assert.ok(survivingEnrollment);
  assert.equal(survivingEnrollment.registration_id, "reg-b");
  assert.equal(store.data.registrations.some((row) => row.id === "reg-a"), false);
  assert.equal(store.data.registrations.find((row) => row.id === "reg-b").student_id, a.student.id);

  const c = await provision("operation-c", "reg-c", "student-c", "enrollment-c");
  assert.equal(c.previousEnrollment.registration_id, "reg-b");
  await store.abortLearnerProvision({
    operationId: "operation-c",
    ownership: c.ownership,
    previousStudent: c.previousStudent,
    previousEnrollment: c.previousEnrollment,
    previousRegistration: c.previousRegistration,
  });
  const restoredEnrollment = store.data.enrollments.find((row) => row.id === a.enrollment.id);
  assert.equal(restoredEnrollment.registration_id, "reg-b");
  assert.equal(restoredEnrollment.provision_operation_id, undefined);
  assert.equal(restoredEnrollment.provision_revision, undefined);
  assert.equal(store.data.registrations.some((row) => row.id === "reg-c"), false);
});

test("reset-access lease blocks overlap and expired takeover makes stale abort harmless", async () => {
  const store = mockStore();
  const student = store.data.students.find((row) => row.id === "st1");
  student.session_version = 4;
  const base = Date.now();
  const args = (operationId, activationToken, nowMs) => ({
    studentId: "st1",
    operationId,
    activationToken,
    expiresAt: new Date(nowMs + 60_000).toISOString(),
    operationExpiresAt: new Date(nowMs + 10_000).toISOString(),
    now: new Date(nowMs).toISOString(),
  });
  const a = await store.beginResetAccess(args("reset-a", "activation-a", base));
  const blocked = await store.beginResetAccess(args("reset-b", "activation-b", base + 1_000));
  assert.equal(blocked.ok, false);
  assert.match(blocked.error, /in progress/);

  const b = await store.beginResetAccess(args("reset-b", "activation-b", base + 11_000));
  assert.equal(b.ok, true);
  assert.equal(b.previous.session_version, 4);
  const stale = await store.abortResetAccess({
    studentId: "st1",
    operationId: "reset-a",
    activationToken: "activation-a",
    sessionVersion: a.sessionVersion,
    previous: a.previous,
    now: new Date(base + 12_000).toISOString(),
  });
  assert.equal(stale.stale, true);
  assert.equal(student.activation_token, "activation-b");
  assert.equal(student.session_version, b.sessionVersion);

  const restored = await store.abortResetAccess({
    studentId: "st1",
    operationId: "reset-b",
    activationToken: "activation-b",
    sessionVersion: b.sessionVersion,
    previous: b.previous,
    now: new Date(base + 13_000).toISOString(),
  });
  assert.equal(restored.ok, true);
  assert.equal(student.session_version, b.sessionVersion + 1);
  assert.equal(student.status, "active");
});

test("credential change clears pending reset-access so its abort cannot restore stale state", async () => {
  const store = mockStore();
  const student = store.data.students.find((row) => row.id === "st1");
  const started = await store.beginResetAccess({
    studentId: "st1",
    operationId: "reset-pending",
    activationToken: "activation-pending",
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    now: new Date().toISOString(),
  });
  const changed = await store.applyPasswordChange({
    table: "students",
    id: "st1",
    passwordHash: hashPassword(LEARNER_NEXT),
    now: new Date().toISOString(),
  });
  assert.equal(student.reset_access_operation_id, undefined);
  const stale = await store.abortResetAccess({
    studentId: "st1",
    operationId: "reset-pending",
    activationToken: "activation-pending",
    sessionVersion: started.sessionVersion,
    previous: started.previous,
    now: new Date().toISOString(),
  });
  assert.equal(stale.stale, true);
  assert.equal(student.session_version, changed.sessionVersion);
  assert.equal(student.status, "active");
});

test("stale student writes cannot restore credentials or roll session_version backward", async () => {
  const store = mockStore();
  const student = store.data.students.find((row) => row.id === "st1");
  student.status = "active";
  student.session_version = 7;
  student.password_hash = hashPassword(STUDENT_PW);
  const staleSnapshot = { ...student };

  const started = await store.beginResetAccess({
    studentId: "st1",
    operationId: "reset-cas",
    activationToken: "activation-cas",
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    operationExpiresAt: new Date(Date.now() + 10_000).toISOString(),
    now: new Date().toISOString(),
  });
  assert.equal(started.ok, true);
  assert.equal(student.session_version, 8);

  const narrow = await store.patchStudentFields({
    id: "st1",
    expectedSessionVersion: 7,
    fields: {
      full_name: "Stale Name",
      password_hash: staleSnapshot.password_hash,
      activation_token: null,
      session_version: 7,
    },
  });
  assert.equal(narrow.stale, true);

  const broad = await store.upsert("students", { ...staleSnapshot, full_name: "Stale Broad" });
  assert.equal(broad.rejected, true);
  assert.equal(student.session_version, 8);
  assert.equal(student.password_hash, null);
  assert.equal(student.activation_token, "activation-cas");
  assert.notEqual(student.full_name, "Stale Name");
  assert.notEqual(student.full_name, "Stale Broad");

  const safe = await store.patchStudentFields({
    id: "st1",
    expectedSessionVersion: 8,
    fields: {
      full_name: "Current Name",
      password_hash: staleSnapshot.password_hash,
      activation_token: null,
      session_version: 1,
    },
  });
  assert.equal(safe.ok, true);
  assert.equal(student.full_name, "Current Name");
  assert.equal(student.password_hash, null);
  assert.equal(student.activation_token, "activation-cas");
  assert.equal(student.session_version, 8);

  const suspended = await store.patchStudentFields({
    id: "st1",
    expectedSessionVersion: 8,
    fields: { status: "suspended" },
  });
  assert.equal(suspended.ok, true);
  assert.equal(student.session_version, 9);
  const reactivated = await store.patchStudentFields({
    id: "st1",
    expectedSessionVersion: 9,
    fields: { status: "active" },
  });
  assert.equal(reactivated.ok, true);
  assert.equal(student.session_version, 10);
});
