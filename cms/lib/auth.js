const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX = 10;
const RESET_WINDOW_MS = 15 * 60 * 1000;
const RESET_MAX_IP = 8;
const RESET_MAX_ACCOUNT = 3;
const attempts = new Map();
const resetAttempts = new Map();

function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

function pruneAttempts() {
  const cutoff = Date.now() - LOGIN_WINDOW_MS;
  for (const [ip, item] of attempts) {
    if (item.started < cutoff) attempts.delete(ip);
  }
}

function tooManyLogins(ip) {
  pruneAttempts();
  const item = attempts.get(ip);
  return item && item.count >= LOGIN_MAX;
}

function recordLogin(ip, ok) {
  pruneAttempts();
  if (ok) {
    attempts.delete(ip);
    return;
  }
  const item = attempts.get(ip) || { started: Date.now(), count: 0 };
  item.count += 1;
  attempts.set(ip, item);
}

function pruneResetAttempts() {
  const cutoff = Date.now() - RESET_WINDOW_MS;
  for (const [key, item] of resetAttempts) {
    if (item.started < cutoff) resetAttempts.delete(key);
  }
}

function resetBucketFull(key, max) {
  pruneResetAttempts();
  const item = resetAttempts.get(key);
  return item && item.count >= max;
}

function tooManyPasswordResets(ip, email) {
  if (resetBucketFull(`ip:${ip}`, RESET_MAX_IP)) return "ip";
  if (email && resetBucketFull(`email:${email}`, RESET_MAX_ACCOUNT)) return "account";
  return "";
}

function resetPasswordResetLimiter() {
  resetAttempts.clear();
}

function recordPasswordReset(ip, email) {
  pruneResetAttempts();
  for (const key of [`ip:${ip}`, email ? `email:${email}` : ""].filter(Boolean)) {
    const item = resetAttempts.get(key) || { started: Date.now(), count: 0 };
    item.count += 1;
    resetAttempts.set(key, item);
  }
}

function passwordResetPadMs() {
  if (process.env.PASSWORD_RESET_PAD_MS != null) return Number(process.env.PASSWORD_RESET_PAD_MS);
  if (process.env.NODE_ENV === "test") return 0;
  return 400;
}

async function padPasswordReset(startedAt) {
  const wait = passwordResetPadMs() - (Date.now() - startedAt);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
}

function requireAuth(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ error: "Chưa đăng nhập" });
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session?.user) return res.status(401).json({ error: "Chưa đăng nhập" });
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({ error: "Không có quyền thực hiện" });
    }
    next();
  };
}

function canEditConfig(user) {
  return user?.role === "OWNER" || user?.role === "ADMIN";
}

function canDelete(user) {
  return user?.role === "OWNER" || user?.role === "ADMIN";
}

function editorLocked(user) {
  return user?.role === "EDITOR";
}

function randomId(prefix) {
  return `${prefix}-${crypto.randomBytes(4).toString("hex")}`;
}

function destroySession(req) {
  return new Promise((resolve) => {
    if (!req.session || typeof req.session.destroy !== "function") return resolve();
    req.session.destroy(() => resolve());
  });
}

function staffUserFromRow(user) {
  return {
    id: String(user.id),
    email: user.email,
    name: user.name,
    role: user.role,
    instructorId: user.instructor_id || user.instructorId || "",
    mustChangePassword: Number(user.must_change_password ?? user.mustChangePassword) === 1,
    sessionVersion: Number(user.session_version ?? user.sessionVersion ?? 0),
  };
}

async function refreshStaffSessionUser(store, req) {
  const sessionUser = req.session && req.session.user;
  if (!sessionUser || !sessionUser.id) return { ok: false, status: 401 };
  const snap = await store.dump(true);
  const user = (snap.users || []).find((row) => String(row.id) === String(sessionUser.id));
  if (!user || Number(user.active) !== 1) {
    await destroySession(req);
    return { ok: false, status: 401 };
  }
  if (Number(sessionUser.sessionVersion || 0) !== Number(user.session_version || 0)) {
    await destroySession(req);
    return { ok: false, status: 401 };
  }
  req.session.user = staffUserFromRow(user);
  return { ok: true, user: req.session.user, snap };
}

module.exports = {
  hashPassword,
  verifyPassword,
  tooManyLogins,
  recordLogin,
  tooManyPasswordResets,
  recordPasswordReset,
  padPasswordReset,
  resetPasswordResetLimiter,
  requireAuth,
  requireRole,
  canEditConfig,
  canDelete,
  editorLocked,
  randomId,
  destroySession,
  staffUserFromRow,
  refreshStaffSessionUser,
};
