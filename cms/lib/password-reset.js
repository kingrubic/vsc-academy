const { now } = require("./convex-db");
const C = require("./lms-core");
const Mailer = require("./mailer");
const { queueMail } = require("./notify");

const MAX_OUTSTANDING = 3;

function resetPathForUser(user) {
  const home = user?.role === "INSTRUCTOR" ? "/giang-vien" : "/admin";
  return `${home}/dat-lai-mat-khau`;
}

function smtpReady() {
  return Mailer.hasTestTransport() || Mailer.smtpConfigured();
}

function optionalId(value) {
  const id = String(value || "").trim();
  return id || undefined;
}

function requireSecurityMail() {
  const origin = C.publicEmailOrigin();
  if (!smtpReady()) {
    throw Object.assign(new Error("SMTP chưa cấu hình, chưa gửi được email"), {
      status: 503,
      code: "SMTP_NOT_CONFIGURED",
    });
  }
  return origin;
}

async function issuePasswordReset(store, _req, target) {
  const origin = requireSecurityMail();
  const token = C.newSecretToken();
  const ts = now();
  const hash = C.hashToken(token);
  const payload = {
    tokenHash: hash,
    now: ts,
    expiresAt: new Date(Date.now() + C.RESET_TTL_MS).toISOString(),
    maxOutstanding: MAX_OUTSTANDING,
  };
  const studentId = optionalId(target.studentId);
  const userId = optionalId(target.userId);
  if (studentId) payload.studentId = studentId;
  if (userId) payload.userId = userId;
  let issued;
  try {
    issued = await store.issuePasswordReset(payload);
  } catch (err) {
    throw Object.assign(new Error("Không gửi được yêu cầu đặt lại mật khẩu. Thử lại sau."), {
      status: 502,
      cause: err,
    });
  }
  if (!issued?.ok) {
    throw Object.assign(new Error("Quá nhiều yêu cầu đặt lại mật khẩu. Thử lại sau."), { status: 429 });
  }
  const url = `${origin}${target.path}?token=${token}`;
  const name = target.name || "";
  const subject = target.subject || "Đặt lại mật khẩu VSC Academy";
  const text =
    target.text ||
    `Chào ${name || "bạn"},\n\nĐặt mật khẩu mới tại:\n${url}\n\nLink hết hạn sau 1 giờ.\n\nVSC Academy`;
  const html =
    target.html ||
    `<p>Chào ${name || "bạn"},</p><p>Đặt mật khẩu mới tại:</p><p><a href="${url}">${url}</a></p><p>Link hết hạn sau 1 giờ.</p><p>VSC Academy</p>`;
  const mailed = await queueMail(store, target.email, subject, text, target.kind || "password_reset", {
    studentId: studentId || null,
    userId: userId || null,
    html,
  });
  if (!mailed.sent) {
    try {
      await store.cancelPasswordReset({ tokenHash: hash, now: now() });
    } catch {
      await store.cancelPasswordReset({ tokenHash: hash, now: now() });
    }
    throw Object.assign(new Error("Không gửi được email đặt lại mật khẩu"), {
      status: 503,
      code: mailed.reason || "SMTP_SEND_FAILED",
    });
  }
  return { emailed: true, to: target.email };
}

function findResetRow(snap, token) {
  const hash = C.hashToken(token);
  return (snap.password_resets || []).find((row) => row.token_hash === hash || row.id === hash) || null;
}

function resetStillValid(row) {
  return row && !row.used_at && row.expires_at >= now();
}

module.exports = {
  resetPathForUser,
  issuePasswordReset,
  findResetRow,
  resetStillValid,
  smtpReady,
  requireSecurityMail,
  MAX_OUTSTANDING,
};
