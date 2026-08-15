const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const session = require("express-session");
const { createStore } = require("./lib/convex-db");
const serialize = require("./lib/serialize");
const { createPublicRouter } = require("./routes/public");
const { createAdminRouter } = require("./routes/admin");
const { createLearnerRouter } = require("./routes/learner");
const Security = require("./lib/lms-security");
const StaffPortal = require("./lib/staff-portal");
require("./lib/env");

const SITE_ROOT = path.join(__dirname, "..");
const ADMIN_DIR = path.join(SITE_ROOT, "admin");
const PORTAL_DIR = path.join(SITE_ROOT, "portal");
const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 4173);

function sessionSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const file = path.join(__dirname, "data", ".secret");
  try {
    return fs.readFileSync(file, "utf8").trim();
  } catch {
    const secret = crypto.randomBytes(32).toString("hex");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, secret, { mode: 0o600 });
    return secret;
  }
}

async function main() {
  const store = createStore();
  await Security.migrateLegacyPrivateFiles(store, SITE_ROOT);
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(
    session({
      name: "vsc_admin",
      secret: sessionSecret(),
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    }),
  );

  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    let parsed;
    try {
      parsed = new URL(req.url || "/", "http://localhost");
    } catch {
      return next();
    }
    const pathname = decodeURIComponent(parsed.pathname);
    if (pathname.startsWith("/api/") || pathname === "/healthz") return next();
    const search = parsed.search;
    if (pathname === "/index.html") {
      return res.redirect(301, `/${search}`);
    }
    if (pathname.endsWith("/index.html")) {
      const dest = pathname.slice(0, -10) || "/";
      return res.redirect(301, dest + search);
    }
    if (pathname.endsWith(".html")) {
      return res.redirect(301, pathname.slice(0, -5) + search);
    }
    const assetMatch = pathname.match(/^(\/assets\/.+)\.(png|jpe?g)$/i);
    if (assetMatch) {
      const webpPath = path.join(SITE_ROOT, `${assetMatch[1].slice(1)}.webp`);
      if (fs.existsSync(webpPath)) {
        return res.redirect(301, `${assetMatch[1]}.webp${search}`);
      }
    }
    next();
  });

  app.use("/api/public", createPublicRouter(store));
  app.use("/api/admin", createAdminRouter(store));
  app.use("/api/learner", createLearnerRouter(store));
  app.use("/uploads/cms", express.static(path.join(SITE_ROOT, "uploads", "cms")));
  app.use(["/uploads/learner", "/uploads/certificates"], (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  const generated = [
    [/schedule-data\.js$/, serialize.scheduleDataJs],
    [/course-data\.js$/, serialize.courseDataJs],
    [/course-data-en\.js$/, serialize.courseDataEnJs],
    [/article-data\.js$/, serialize.articleDataJs],
    [/resource-data\.js$/, serialize.resourceDataJs],
  ];
  generated.forEach(([pattern, builder]) => {
    app.get(pattern, async (req, res, next) => {
      try {
        const snap = await store.dump();
        res.setHeader("Content-Type", "application/javascript; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.send(builder(snap));
      } catch (err) {
        console.error("Generate data JS failed, falling back to static file:", err.message);
        next();
      }
    });
  });

  app.use(
    "/admin",
    express.static(ADMIN_DIR, {
      index: false,
      extensions: ["html"],
      redirect: false,
      setHeaders(res) {
        res.setHeader("Cache-Control", "no-cache, must-revalidate");
      },
    }),
  );
  const sendStaffShell = StaffPortal.createStaffShellHandler(store, ADMIN_DIR);
  app.get(/^\/admin(?:\/.*)?$/, sendStaffShell);
  app.get(/^\/giang-vien(?:\/.*)?$/, sendStaffShell);

  app.use("/portal", express.static(PORTAL_DIR));
  app.use("/hoc-vien", express.static(PORTAL_DIR, { index: false }));
  app.use("/en/student", express.static(PORTAL_DIR, { index: false }));
  app.get(/^\/hoc-vien(?:\/.*)?$/, (_req, res) => {
    res.sendFile(path.join(PORTAL_DIR, "index.html"));
  });
  app.get(/^\/en\/student(?:\/.*)?$/, (_req, res) => {
    res.sendFile(path.join(PORTAL_DIR, "index.html"));
  });

  const VERIFY_DIR = path.join(SITE_ROOT, "verify");
  app.use("/verify-assets", express.static(VERIFY_DIR));
  app.get(/^\/verify(?:\/.*)?$/, (_req, res) => {
    res.sendFile(path.join(VERIFY_DIR, "index.html"));
  });
  app.get(/^\/en\/verify(?:\/.*)?$/, (_req, res) => {
    res.sendFile(path.join(VERIFY_DIR, "index.html"));
  });

  app.get("/healthz", async (_req, res) => {
    try {
      await store.dump();
      res.json({ status: "ok", convex: store.url });
    } catch (err) {
      res.status(503).json({ status: "degraded", error: err.message });
    }
  });

  app.use(
    express.static(SITE_ROOT, {
      index: ["index.html"],
      extensions: ["html"],
      setHeaders(res, filePath) {
        if (filePath.endsWith(".html")) res.setHeader("Cache-Control", "no-store");
      },
    }),
  );

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || "Server error" });
  });

  app.listen(PORT, HOST, () => {
    console.log(`VSC Academy running at http://${HOST}:${PORT}`);
    console.log(`Admin CMS            http://${HOST}:${PORT}/admin`);
    console.log(`Instructor portal    http://${HOST}:${PORT}/giang-vien`);
    console.log(`Learner portal       http://${HOST}:${PORT}/hoc-vien`);
    console.log(`Verify certificates  http://${HOST}:${PORT}/verify`);
    console.log(`Convex backend       ${store.url}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
