const { ConvexHttpClient } = require("convex/browser");
const { anyApi } = require("convex/server");

const CONVEX_URL =
  process.env.CONVEX_URL ||
  process.env.CONVEX_SELF_HOSTED_URL ||
  "http://127.0.0.1:3280";

function now() {
  return new Date().toISOString();
}

function parseJson(value, fallback) {
  if (value == null || value === "") return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function alive(rows) {
  return (rows || []).filter((row) => !row.deleted_at);
}

function byId(rows, id) {
  if (id == null || id === "") return null;
  return (rows || []).find((row) => String(row.id) === String(id)) || null;
}

function aliveById(rows, id) {
  const row = byId(rows, id);
  return row && !row.deleted_at ? row : null;
}

function like(value, needle) {
  if (!needle || needle === "%") return true;
  const n = String(needle).replace(/%/g, "").toLowerCase();
  if (!n) return true;
  return String(value || "").toLowerCase().includes(n);
}

function programShortName(program) {
  const content = parseJson(program?.content_vi, {});
  return content.shortName || content.name || program?.id || "";
}

function createStore() {
  const client = new ConvexHttpClient(CONVEX_URL);
  let cache = { at: 0, snap: null };

  async function dump(force) {
    if (!force && cache.snap && Date.now() - cache.at < 250) return cache.snap;
    const snap = await client.query(anyApi.store.dumpAll, {});
    cache = { at: Date.now(), snap };
    return snap;
  }

  function invalidate() {
    cache = { at: 0, snap: null };
  }

  async function upsert(table, data) {
    const result = await client.mutation(anyApi.store.upsert, { table, data });
    invalidate();
    return result;
  }

  async function remove(table, id) {
    const result = await client.mutation(anyApi.store.remove, { table, id: String(id) });
    invalidate();
    return result;
  }

  async function removeWhere(table, field, value) {
    const result = await client.mutation(anyApi.store.removeWhere, {
      table,
      field,
      value: String(value),
    });
    invalidate();
    return result;
  }

  async function replaceAll(snapshot) {
    const result = await client.mutation(anyApi.store.replaceAll, { snapshot });
    invalidate();
    return result;
  }

  async function count() {
    const snap = await dump(true);
    return (snap.users || []).length;
  }

  return {
    url: CONVEX_URL,
    dump,
    invalidate,
    upsert,
    remove,
    removeWhere,
    replaceAll,
    count,
  };
}

module.exports = {
  CONVEX_URL,
  now,
  parseJson,
  alive,
  byId,
  aliveById,
  like,
  programShortName,
  createStore,
};
