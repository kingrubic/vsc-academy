import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const snapshotPath = path.join(root, "cms/data/sqlite-snapshot.json");
const url = process.env.CONVEX_SELF_HOSTED_URL || process.env.CONVEX_URL || "http://127.0.0.1:3280";

function normalize(snapshot) {
  const out = {};
  for (const [table, rows] of Object.entries(snapshot)) {
    out[table] = (rows || []).map((row) => {
      const data = { ...row };
      if (table === "users") data.id = String(data.id ?? "1");
      if (table === "settings") data.id = String(data.key);
      if (table === "program_instructors") {
        data.id = `${data.program_id}::${data.instructor_id}`;
      }
      if (table === "attendance") {
        data.id = `${data.enrollment_id}::${data.meeting_id}`;
      }
      if (table === "announcement_reads") {
        data.id = `${data.announcement_id}::${data.student_id}`;
      }
      return data;
    });
  }
  return out;
}

const snapshot = normalize(JSON.parse(readFileSync(snapshotPath, "utf8")));
const client = new ConvexHttpClient(url);
const current = await client.query(anyApi.store.dumpAll, {});
// Content reseeding must never delete or reset existing administrator accounts.
snapshot.users = Array.isArray(current.users) ? current.users : [];
const result = await client.mutation(anyApi.store.replaceAll, { snapshot });
console.log(`Seeded Convex at ${url}: ${result.count} documents`);
