import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import bcrypt from "bcryptjs";

const EMAIL = "vutrananh97@gmail.com";
const NAME = "Trần Anh Vũ";
const TEMP_PASSWORD = process.env.VSC_OWNER_TEMP_PASSWORD || "vsc@12345";
const url = process.env.CONVEX_SELF_HOSTED_URL || process.env.CONVEX_URL || "http://127.0.0.1:3280";
const client = new ConvexHttpClient(url);
const ts = new Date().toISOString();

const snap = await client.query(anyApi.store.dumpAll, {});
const existing = (snap.users || []).find((row) => String(row.email || "").toLowerCase() === EMAIL);
const id = existing ? String(existing.id) : "2";

await client.mutation(anyApi.store.upsert, {
  table: "users",
  data: {
    ...(existing || {}),
    id,
    email: EMAIL,
    name: NAME,
    password_hash: bcrypt.hashSync(TEMP_PASSWORD, 10),
    role: "OWNER",
    active: 1,
    must_change_password: 1,
    created_at: existing?.created_at || ts,
    updated_at: ts,
  },
});

console.log(`Upserted OWNER ${EMAIL} (id ${id}). First login must change password.`);
