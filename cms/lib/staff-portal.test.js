const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("./staff-portal");

const instructor = { role: "INSTRUCTOR", mustChangePassword: false };
const owner = { role: "OWNER", mustChangePassword: false };

test("unauthenticated deep link stays on the same portal login and keeps next", () => {
  const gv = P.mapStaffPortalLocation("/giang-vien/sessions/s1", "?tab=meetings", null);
  assert.equal(gv.path, "/giang-vien/login");
  assert.equal(gv.next, "/giang-vien/sessions/s1?tab=meetings");
  const admin = P.mapStaffPortalLocation("/admin/programs", "", null);
  assert.equal(admin.path, "/admin/login");
  assert.equal(admin.next, "/admin/programs");
  const reset = P.mapStaffPortalLocation("/admin/dat-lai-mat-khau", "?token=x", null);
  assert.equal(reset.path, "/admin/dat-lai-mat-khau");
  assert.equal(reset.search, "?token=x");
});

test("INSTRUCTOR on /admin deep links moves to /giang-vien and drops forbidden sections", () => {
  assert.equal(
    P.resolveStaffDestination("/admin/sessions/s1", "?tab=meetings", instructor),
    "/giang-vien/sessions/s1?tab=meetings",
  );
  assert.equal(P.resolveStaffDestination("/admin/programs", "", instructor), "/giang-vien");
  assert.equal(P.staffShellRedirect("/admin/sessions/s1", "?tab=meetings", instructor), "/giang-vien/sessions/s1?tab=meetings");
  assert.equal(P.staffShellRedirect("/giang-vien/sessions/s1", "?tab=meetings", instructor), null);
});

test("OWNER/ADMIN on /giang-vien moves to the matching /admin path", () => {
  assert.equal(
    P.resolveStaffDestination("/giang-vien/sessions/s1", "?tab=meetings", owner),
    "/admin/sessions/s1?tab=meetings",
  );
  assert.equal(P.staffShellRedirect("/giang-vien/students", "", { role: "ADMIN" }), "/admin/students");
  assert.equal(P.staffShellRedirect("/admin/students", "", owner), null);
});

test("staff portal roots with trailing slash do not redirect to themselves", () => {
  assert.equal(P.staffShellRedirect("/admin/", "", owner), null);
  assert.equal(P.staffShellRedirect("/giang-vien/", "", instructor), null);
});

test("first-password stays on the correct portal and next is applied after the flag clears", () => {
  const pending = { role: "INSTRUCTOR", mustChangePassword: true };
  assert.equal(P.resolveStaffDestination("/giang-vien/sessions/s1", "?tab=meetings", pending), "/giang-vien/change-password");
  assert.equal(P.resolveStaffDestination("/admin/login", "", { role: "OWNER", mustChangePassword: true }), "/admin/change-password");
  assert.equal(
    P.resolveStaffDestination("/giang-vien/change-password", "", instructor, "/giang-vien/sessions/s1?tab=meetings"),
    "/giang-vien/sessions/s1?tab=meetings",
  );
  assert.equal(P.applyNextPath(pending, "/giang-vien/sessions/s1"), "");
});

test("stored next is sanitized and remapped to the role portal", () => {
  assert.equal(P.sanitizeNext("https://evil.test/admin"), "");
  assert.equal(P.sanitizeNext("//evil.test"), "");
  assert.equal(P.sanitizeNext("/hoc-vien"), "");
  assert.equal(
    P.applyNextPath(instructor, "/admin/sessions/abc?tab=attendance"),
    "/giang-vien/sessions/abc?tab=attendance",
  );
  assert.equal(P.applyNextPath(instructor, "/admin/insights/new"), "");
});

test("instructor admin allowlist is fail-closed for CMS mutations and private admin reads", () => {
  assert.equal(P.instructorMayAccessAdmin("GET", "/me"), true);
  assert.equal(P.instructorMayAccessAdmin("POST", "/change-password"), true);
  assert.equal(P.instructorMayAccessAdmin("GET", "/sessions/s1/lms"), true);
  assert.equal(P.instructorMayAccessAdmin("PUT", "/attendance"), true);
  assert.equal(P.instructorMayAccessAdmin("POST", "/enrollments/e1/recommend-completion"), true);
  assert.equal(P.instructorMayAccessAdmin("POST", "/materials"), true);
  assert.equal(P.instructorMayAccessAdmin("POST", "/meetings"), true);
  assert.equal(P.instructorMayAccessAdmin("PUT", "/meetings/m1"), true);
  assert.equal(P.instructorMayAccessAdmin("DELETE", "/meetings/m1"), false);
  assert.equal(P.instructorMayAccessAdmin("POST", "/announcements"), true);
  assert.equal(P.instructorMayAccessAdmin("GET", "/insights"), false);
  assert.equal(P.instructorMayAccessAdmin("POST", "/insights"), false);
  assert.equal(P.instructorMayAccessAdmin("POST", "/resources"), false);
  assert.equal(P.instructorMayAccessAdmin("PUT", "/enrollments/e1"), false);
  assert.equal(P.instructorMayAccessAdmin("DELETE", "/materials/m1"), false);
  assert.equal(P.instructorMayAccessAdmin("DELETE", "/announcements/a1"), false);
  assert.equal(P.instructorMayAccessAdmin("GET", "/registrations"), false);
  assert.equal(P.instructorMayAccessAdmin("GET", "/dashboard/class-report.pdf"), false);
  assert.equal(P.instructorMayAccessAdmin("GET", "/reports/classes"), false);
  assert.equal(P.instructorMayAccessAdmin("GET", "/reports/classes.pdf"), false);
  assert.equal(P.instructorMayAccessAdmin("GET", "/settings"), false);
  assert.equal(P.instructorMayAccessAdmin("GET", "/certificates"), false);
  for (const [method, path] of P.ADMIN_MUTATION_SAMPLES) {
    assert.equal(P.instructorMayAccessAdmin(method, path), false, `${method} ${path}`);
  }
});
