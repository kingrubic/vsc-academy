const fs = require("fs");
const path = require("path");

function parseEnvValue(raw) {
  const trimmed = String(raw || "").trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (process.env[key] != null && process.env[key] !== "") continue;
    process.env[key] = parseEnvValue(trimmed.slice(eq + 1));
  }
}

function loadCmsEnv() {
  // Process env wins. Files only fill keys that are still empty.
  const cmsDir = path.join(__dirname, "..");
  loadEnvFile(path.join(cmsDir, ".env"));
  loadEnvFile(path.join(cmsDir, "..", ".env"));
  loadEnvFile(path.join(cmsDir, "..", ".env.local"));
}

loadCmsEnv();

module.exports = { loadCmsEnv, loadEnvFile, parseEnvValue };
