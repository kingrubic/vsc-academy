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
  return Boolean(process.env.SMTP_USER || process.env.MAIL_USER) && Boolean(process.env.SMTP_PASS || process.env.MAIL_PASS);
}

function mailFrom() {
  const raw = process.env.MAIL_FROM || process.env.SMTP_USER || process.env.MAIL_USER || "vscacademy8@gmail.com";
  return String(raw).replace(/^.*<([^>]+)>.*$/, "$1").trim() || "vscacademy8@gmail.com";
}

function parseSmtpConfig() {
  if (!smtpConfigured()) return null;
  const user = process.env.SMTP_USER || process.env.MAIL_USER;
  const pass = String(process.env.SMTP_PASS || process.env.MAIL_PASS).replace(/\s+/g, "");
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
    auth: { user, pass },
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
