const INSTRUCTOR_PORTAL_SEGS = new Set([
  "",
  "login",
  "change-password",
  "dat-lai-mat-khau",
  "sessions",
  "students",
  "materials",
  "announcements",
]);

const INSTRUCTOR_GET = [
  /^\/me$/,
  /^\/dashboard$/,
  /^\/programs(?:\/[^/]+)?$/,
  /^\/sessions(?:\/[^/]+)?$/,
  /^\/sessions\/[^/]+\/lms$/,
  /^\/venues$/,
  /^\/students(?:\/[^/]+)?$/,
  /^\/enrollments$/,
  /^\/meetings$/,
  /^\/materials(?:\/[^/]+)?$/,
  /^\/announcements(?:\/[^/]+)?$/,
];

const INSTRUCTOR_MUTATE = [
  { method: "POST", re: /^\/change-password$/ },
  { method: "POST", re: /^\/meetings$/ },
  { method: "PUT", re: /^\/meetings\/[^/]+$/ },
  { method: "PUT", re: /^\/attendance$/ },
  { method: "POST", re: /^\/enrollments\/[^/]+\/recommend-completion$/ },
  { method: "POST", re: /^\/materials$/ },
  { method: "PUT", re: /^\/materials\/[^/]+$/ },
  { method: "POST", re: /^\/announcements$/ },
  { method: "PUT", re: /^\/announcements\/[^/]+$/ },
];

const ADMIN_MUTATION_SAMPLES = [
  ["POST", "/programs"],
  ["PUT", "/programs/ai-starter"],
  ["POST", "/programs/ai-starter/en-draft"],
  ["DELETE", "/programs/ai-starter"],
  ["POST", "/sessions"],
  ["PUT", "/sessions/s1"],
  ["DELETE", "/sessions/s1"],
  ["POST", "/venues"],
  ["PUT", "/venues/v1"],
  ["DELETE", "/venues/v1"],
  ["POST", "/instructors"],
  ["PUT", "/instructors/i1"],
  ["DELETE", "/instructors/i1"],
  ["PUT", "/registrations/r1"],
  ["POST", "/insights"],
  ["PUT", "/insights/n1"],
  ["POST", "/insights/n1/en-draft"],
  ["DELETE", "/insights/n1"],
  ["POST", "/resources"],
  ["PUT", "/resources/res1"],
  ["DELETE", "/resources/res1"],
  ["POST", "/media"],
  ["DELETE", "/media/m1"],
  ["PUT", "/settings"],
  ["POST", "/students"],
  ["PUT", "/students/st1"],
  ["DELETE", "/students/st1"],
  ["POST", "/students/st1/reset-access"],
  ["POST", "/students/st1/reset-password"],
  ["POST", "/instructors/i1/reset-password"],
  ["POST", "/students/st1/enroll"],
  ["PUT", "/enrollments/e1"],
  ["DELETE", "/enrollments/e1"],
  ["DELETE", "/meetings/mtg1"],
  ["DELETE", "/materials/mat1"],
  ["DELETE", "/announcements/a1"],
  ["POST", "/certificate-templates"],
  ["PUT", "/certificate-templates/t1"],
  ["POST", "/certificates/issue"],
  ["POST", "/certificates/issue-bulk"],
  ["POST", "/certificates/c1/revoke"],
  ["POST", "/certificates/c1/reissue"],
];

function staffHomeForRole(role) {
  return role === "INSTRUCTOR" ? "/giang-vien" : "/admin";
}

function parseStaffPath(pathname) {
  const clean = String(pathname || "/").replace(/\/+$/, "") || "/";
  const parts = clean.split("/").filter(Boolean);
  const portal = parts[0] === "giang-vien" || parts[0] === "admin" ? parts[0] : null;
  const rest = portal ? parts.slice(1) : parts;
  return {
    portal,
    first: rest[0] || "",
    restPath: rest.length ? `/${rest.join("/")}` : "",
  };
}

function sanitizeNext(raw) {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//") || /[a-z]+:/i.test(raw)) {
    return "";
  }
  const pathOnly = raw.split("?")[0];
  if (!pathOnly.startsWith("/admin") && !pathOnly.startsWith("/giang-vien")) return "";
  return raw;
}

function splitSearch(search) {
  if (!search || search === "?") return "";
  return search.startsWith("?") ? search : `?${search}`;
}

function mapStaffPortalLocation(pathname, search, user) {
  const { portal, first, restPath } = parseStaffPath(pathname);
  const qs = splitSearch(search);
  const currentHome = portal === "giang-vien" ? "/giang-vien" : "/admin";
  if (!user) {
    if (first === "dat-lai-mat-khau") {
      return { path: `${currentHome}/dat-lai-mat-khau`, search: qs, next: "" };
    }
    const keep = restPath && restPath !== "/login" && restPath !== "/change-password" && restPath !== "/dat-lai-mat-khau";
    return {
      path: `${currentHome}/login`,
      search: "",
      next: keep ? `${currentHome}${restPath}${qs}` : "",
    };
  }
  const home = staffHomeForRole(user.role);
  if (user.mustChangePassword) {
    return { path: `${home}/change-password`, search: "", next: "" };
  }
  if (user.role === "INSTRUCTOR") {
    if (!INSTRUCTOR_PORTAL_SEGS.has(first) || first === "login") {
      return { path: home, search: "", next: "" };
    }
    return { path: `${home}${restPath}`, search: qs, next: "" };
  }
  if (first === "login") return { path: home, search: "", next: "" };
  return { path: `${home}${restPath}`, search: qs, next: "" };
}

function applyNextPath(user, nextRaw) {
  const next = sanitizeNext(nextRaw);
  if (!user || user.mustChangePassword || !next) return "";
  const qIndex = next.indexOf("?");
  const pathname = qIndex >= 0 ? next.slice(0, qIndex) : next;
  const search = qIndex >= 0 ? next.slice(qIndex) : "";
  const mapped = mapStaffPortalLocation(pathname, search, { ...user, mustChangePassword: false });
  const { first } = parseStaffPath(mapped.path);
  if (!first || first === "login" || first === "change-password") return "";
  if (user.role === "INSTRUCTOR" && !INSTRUCTOR_PORTAL_SEGS.has(first)) return "";
  return `${mapped.path}${mapped.search}`;
}

function resolveStaffDestination(pathname, search, user, nextRaw) {
  const fromNext = applyNextPath(user, nextRaw);
  if (fromNext) return fromNext;
  const mapped = mapStaffPortalLocation(pathname, search, user);
  return `${mapped.path}${mapped.search}`;
}

function staffShellRedirect(pathname, search, user) {
  if (!user) return null;
  const dest = resolveStaffDestination(pathname, search, user);
  const current = `${pathname}${splitSearch(search)}`;
  const canonicalCurrent = `${String(pathname || "/").replace(/\/+$/, "") || "/"}${splitSearch(search)}`;
  if (dest && dest !== current && dest !== canonicalCurrent) return dest;
  return null;
}

function instructorMayAccessAdmin(method, reqPath) {
  const p = String(reqPath || "").split("?")[0];
  const m = String(method || "GET").toUpperCase();
  if (m === "GET" || m === "HEAD") return INSTRUCTOR_GET.some((re) => re.test(p));
  return INSTRUCTOR_MUTATE.some((row) => row.method === m && row.re.test(p));
}

function staffShellSearch(req) {
  try {
    return new URL(req.originalUrl || req.url || req.path || "/", "http://localhost").search;
  } catch {
    return "";
  }
}

function createStaffShellHandler(store, adminDir) {
  const path = require("path");
  const { refreshStaffSessionUser } = require("./auth");
  return async function sendStaffShell(req, res, next) {
    try {
      if (req.session?.user?.id) {
        const result = await refreshStaffSessionUser(store, req);
        if (result.ok) {
          const dest = staffShellRedirect(req.path, staffShellSearch(req), req.session.user);
          if (dest) return res.redirect(302, dest);
        }
      }
      res.sendFile(path.join(adminDir, "index.html"));
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  INSTRUCTOR_PORTAL_SEGS,
  ADMIN_MUTATION_SAMPLES,
  staffHomeForRole,
  parseStaffPath,
  sanitizeNext,
  mapStaffPortalLocation,
  applyNextPath,
  resolveStaffDestination,
  staffShellRedirect,
  instructorMayAccessAdmin,
  createStaffShellHandler,
};
