const test = require("node:test");
const assert = require("node:assert/strict");

const Mailer = require("./mailer");
const C = require("./lms-core");

function withEnv(values, fn) {
  const previous = {};
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key];
    if (value == null) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value == null) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("mailer builds OAuth2 SMTP auth without requiring an app password", () => {
  withEnv(
    {
      MAIL_OAUTH_USER: "sender@example.test",
      MAIL_OAUTH_CLIENT_ID: "fixture-client-id",
      MAIL_OAUTH_CLIENT_SECRET: "fixture-client-secret",
      MAIL_OAUTH_REFRESH_TOKEN: "fixture-refresh-token",
      SMTP_USER: null,
      SMTP_PASS: null,
      MAIL_USER: null,
      MAIL_PASS: null,
      SMTP_HOST: "smtp.gmail.com",
      SMTP_PORT: "465",
      SMTP_SECURE: "1",
    },
    () => {
      assert.equal(Mailer.smtpConfigured(), true);
      const config = Mailer.parseSmtpConfig();
      assert.deepEqual(config.auth, {
        type: "OAuth2",
        user: "sender@example.test",
        clientId: "fixture-client-id",
        clientSecret: "fixture-client-secret",
        refreshToken: "fixture-refresh-token",
      });
      assert.equal(config.secure, true);
      assert.equal(config.tls.minVersion, "TLSv1.2");
    },
  );
});

test("mailer rejects incomplete OAuth2 config without password SMTP fallback", () => {
  withEnv(
    {
      MAIL_OAUTH_USER: "sender@example.test",
      MAIL_OAUTH_CLIENT_ID: "fixture-client-id",
      MAIL_OAUTH_CLIENT_SECRET: null,
      MAIL_OAUTH_REFRESH_TOKEN: "fixture-refresh-token",
      SMTP_USER: null,
      SMTP_PASS: null,
      MAIL_USER: null,
      MAIL_PASS: null,
    },
    () => {
      assert.equal(Mailer.smtpConfigured(), false);
      assert.equal(Mailer.parseSmtpConfig(), null);
    },
  );
});

test("security email origin is exactly the canonical production origin", () => {
  withEnv({ PUBLIC_SITE_URL: "https://vscacademy.edu.vn" }, () => {
    assert.equal(C.publicEmailOrigin(), "https://vscacademy.edu.vn");
  });
  for (const origin of [
    "https://www.vscacademy.edu.vn",
    "https://mail.vscacademy.edu.vn",
    "https://vscacademy.edu.vn:8443",
  ]) {
    withEnv({ PUBLIC_SITE_URL: origin }, () => {
      assert.throws(() => C.publicEmailOrigin(), /canonical production origin/);
    });
  }
});
