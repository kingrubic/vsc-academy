#!/usr/bin/env python3
"""Verify VSC Academy Gmail OAuth SMTP without exposing credentials."""

import json
import os
import subprocess
from pathlib import Path

ACCOUNT = "vscacademy8@gmail.com"
CLIENT_SERVICE = "vsc-academy-google-oauth-client-json"
TOKEN_SERVICE = "vsc-academy-google-oauth-token-json"


def get(service: str) -> dict:
    raw = subprocess.check_output(
        ["/usr/bin/security", "find-generic-password", "-s", service, "-a", ACCOUNT, "-w"],
        text=True,
        stderr=subprocess.DEVNULL,
    ).rstrip("\n")
    return json.loads(raw)


client = get(CLIENT_SERVICE).get("installed") or {}
token = get(TOKEN_SERVICE)
env = os.environ.copy()
env.update(
    {
        "MAIL_OAUTH_USER": ACCOUNT,
        "MAIL_OAUTH_CLIENT_ID": str(client.get("client_id") or ""),
        "MAIL_OAUTH_CLIENT_SECRET": str(client.get("client_secret") or ""),
        "MAIL_OAUTH_REFRESH_TOKEN": str(token.get("refresh_token") or ""),
        "MAIL_FROM": ACCOUNT,
        "SMTP_HOST": "smtp.gmail.com",
        "SMTP_PORT": "465",
        "SMTP_SECURE": "1",
    }
)
if not all(env[key] for key in ("MAIL_OAUTH_CLIENT_ID", "MAIL_OAUTH_CLIENT_SECRET", "MAIL_OAUTH_REFRESH_TOKEN")):
    raise SystemExit("required OAuth credential is missing")
script = """
const Mailer = require('./cms/lib/mailer');
const nodemailer = require('nodemailer');
(async () => {
  const config = Mailer.parseSmtpConfig();
  if (!config || config.auth?.type !== 'OAuth2') throw new Error('OAuth2 mail config unavailable');
  await nodemailer.createTransport(config).verify();
  console.log(JSON.stringify({oauth2:true, smtp_verify:true, account:config.auth.user, host:config.host, port:config.port}));
})().catch((error) => { console.error(error.name + ': ' + error.message); process.exit(1); });
"""
subprocess.run(
    ["/opt/homebrew/bin/node", "-e", script],
    check=True,
    cwd=Path(__file__).resolve().parents[2],
    env=env,
)
