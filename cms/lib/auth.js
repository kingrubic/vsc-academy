const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX = 10;
const attempts = new Map();

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

function requireAuth(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session?.user) return res.status(401).json({ error: "Unauthorized" });
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
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

module.exports = {
  hashPassword,
  verifyPassword,
  tooManyLogins,
  recordLogin,
  requireAuth,
  requireRole,
  canEditConfig,
  canDelete,
  editorLocked,
  randomId,
};
