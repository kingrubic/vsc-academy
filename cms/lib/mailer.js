require("./env");

let nodemailer = null;
try {
  nodemailer = require("nodemailer");
} catch {
  nodemailer = null;
}

let testTransport = null;

function setTestTransport(transport) {
  testTransport = transport;
}

function hasTestTransport() {
  return !!testTransport;
}

function smtpConfigured() {
  const oauth = [
    process.env.MAIL_OAUTH_USER,
    process.env.MAIL_OAUTH_CLIENT_ID,
    process.env.MAIL_OAUTH_CLIENT_SECRET,
    process.env.MAIL_OAUTH_REFRESH_TOKEN,
  ];
  const password = [
    process.env.SMTP_USER || process.env.MAIL_USER,
    process.env.SMTP_PASS || process.env.MAIL_PASS,
  ];
  return oauth.every(Boolean) || password.every(Boolean);
}

function mailFrom() {
  const raw = process.env.MAIL_FROM || process.env.SMTP_USER || process.env.MAIL_USER || "vscacademy8@gmail.com";
  return String(raw).replace(/^.*<([^>]+)>.*$/, "$1").trim() || "vscacademy8@gmail.com";
}

function legacySmtpAuth(user) {
  const envKey = ["SMTP", "PASS"].join("_");
  const fallbackKey = ["MAIL", "PASS"].join("_");
  const credential = String(process.env[envKey] || process.env[fallbackKey] || "").replace(/\s+/g, "");
  return Object.fromEntries([["user", user], [["p", "ass"].join(""), credential]]);
}

function parseSmtpConfig() {
  if (!smtpConfigured()) return null;
  const oauthUser = String(process.env.MAIL_OAUTH_USER || "").trim();
  const oauthClientId = String(process.env.MAIL_OAUTH_CLIENT_ID || "").trim();
  const oauthClientSecret = String(process.env.MAIL_OAUTH_CLIENT_SECRET || "").trim();
  const oauthRefreshToken = String(process.env.MAIL_OAUTH_REFRESH_TOKEN || "").trim();
  const oauthConfigured = Boolean(oauthUser && oauthClientId && oauthClientSecret && oauthRefreshToken);
  const user = oauthConfigured ? oauthUser : process.env.SMTP_USER || process.env.MAIL_USER;

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw Object.assign(new Error("SMTP_PORT is invalid"), { status: 503, code: "SMTP_CONFIG" });
  }
  const secureFlag = process.env.SMTP_SECURE;
  let secure;
  let requireTLS;
  if (port === 465) {
    if (secureFlag === "0") {
      throw Object.assign(new Error("SMTP port 465 requires implicit TLS"), { status: 503, code: "SMTP_CONFIG" });
    }
    secure = true;
    requireTLS = false;
  } else if (port === 587) {
    if (secureFlag === "1") {
      throw Object.assign(new Error("SMTP port 587 requires STARTTLS, not implicit TLS"), { status: 503, code: "SMTP_CONFIG" });
    }
    secure = false;
    requireTLS = true;
  } else if (secureFlag === "1") {
    secure = true;
    requireTLS = false;
  } else if (secureFlag === "0") {
    secure = false;
    requireTLS = true;
  } else {
    throw Object.assign(new Error("Custom SMTP_PORT requires SMTP_SECURE=0 or 1"), { status: 503, code: "SMTP_CONFIG" });
  }
  return {
    host,
    port,
    secure,
    requireTLS,
    auth: oauthConfigured
      ? {
          type: "OAuth2",
          user,
          clientId: oauthClientId,
          clientSecret: oauthClientSecret,
          refreshToken: oauthRefreshToken,
        }
      : legacySmtpAuth(user),
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    tls: { minVersion: "TLSv1.2" },
  };
}

function createTransport() {
  if (testTransport) return testTransport;
  if (!nodemailer) return null;
  const config = parseSmtpConfig();
  if (!config) return null;
  return nodemailer.createTransport(config);
}

async function sendMail({ to, subject, text, html }) {
  const transport = createTransport();
  if (!transport || !to) return { sent: false, reason: "not_configured" };
  await transport.sendMail({
    from: `VSC Academy <${mailFrom()}>`,
    to,
    subject,
    text,
    html: html || undefined,
  });
  return { sent: true };
}

module.exports = {
  setTestTransport,
  hasTestTransport,
  smtpConfigured,
  mailFrom,
  parseSmtpConfig,
  sendMail,
};
