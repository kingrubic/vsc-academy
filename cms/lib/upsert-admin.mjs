import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import bcrypt from "bcryptjs";

const TEMP_PASSWORD = process.env.VSC_OWNER_TEMP_PASSWORD || "vsc@12345";
const ACCOUNTS = [
  { id: "2", email: "vutrananh97@gmail.com", name: "Trần Anh Vũ", role: "OWNER" },
  { id: "3", email: "nnqbao@gmail.com", name: "Bao", role: "ADMIN" },
];

const url = process.env.CONVEX_SELF_HOSTED_URL || process.env.CONVEX_URL || "http://127.0.0.1:3280";
const client = new ConvexHttpClient(url);
const ts = new Date().toISOString();
const snap = await client.query(anyApi.store.dumpAll, {});
const hash = bcrypt.hashSync(TEMP_PASSWORD, 10);

for (const account of ACCOUNTS) {
  const existing = (snap.users || []).find(
    (row) => String(row.email || "").toLowerCase() === account.email,
  );
  const id = existing ? String(existing.id) : account.id;
  await client.mutation(anyApi.store.upsert, {
    table: "users",
    data: {
      ...(existing || {}),
      id,
      email: account.email,
      name: account.name,
      password_hash: hash,
      role: account.role,
      active: 1,
      must_change_password: 1,
      created_at: existing?.created_at || ts,
      updated_at: ts,
    },
  });
  console.log(`Upserted ${account.role} ${account.email} (id ${id}). First login must change password.`);
}
