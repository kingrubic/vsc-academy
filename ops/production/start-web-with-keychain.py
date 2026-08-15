#!/usr/bin/env python3
"""Start VSC Academy with Gmail OAuth credentials sourced from macOS Keychain."""

import json
import os
import subprocess

ACCOUNT = "vscacademy8@gmail.com"
CLIENT_SERVICE = "vsc-academy-google-oauth-client-json"
TOKEN_SERVICE = "vsc-academy-google-oauth-token-json"


def keychain_json(service: str) -> dict:
    raw = subprocess.check_output(
        [
            "/usr/bin/security",
            "find-generic-password",
            "-s",
            service,
            "-a",
            ACCOUNT,
            "-w",
        ],
        text=True,
        stderr=subprocess.DEVNULL,
    ).rstrip("\n")
    return json.loads(raw)


def required(value, label: str) -> str:
    text = str(value or "").strip()
    if not text:
        raise SystemExit(f"missing required Keychain field: {label}")
    return text


client = keychain_json(CLIENT_SERVICE).get("installed") or {}
token = keychain_json(TOKEN_SERVICE)
env = os.environ.copy()
env.update(
    {
        "PUBLIC_SITE_URL": "https://vscacademy.edu.vn",
        "MAIL_OAUTH_USER": ACCOUNT,
        "MAIL_OAUTH_CLIENT_ID": required(client.get("client_id"), "client_id"),
        "MAIL_OAUTH_CLIENT_SECRET": required(client.get("client_secret"), "client_secret"),
        "MAIL_OAUTH_REFRESH_TOKEN": required(token.get("refresh_token"), "refresh_token"),
        "MAIL_FROM": ACCOUNT,
        "SMTP_HOST": "smtp.gmail.com",
        "SMTP_PORT": "465",
        "SMTP_SECURE": "1",
    }
)
os.execve("/opt/homebrew/bin/npm", ["npm", "run", "start"], env)
