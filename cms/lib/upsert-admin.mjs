import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import bcrypt from "bcryptjs";

const OWNER_TEMP_PASSWORD = process.env.VSC_OWNER_TEMP_PASSWORD;
const ADMIN_TEMP_PASSWORD = process.env.VSC_ADMIN_TEMP_PASSWORD;
if (!OWNER_TEMP_PASSWORD || OWNER_TEMP_PASSWORD.length < 12) {
  throw new Error("VSC_OWNER_TEMP_PASSWORD must be set and contain at least 12 characters");
}
if (!ADMIN_TEMP_PASSWORD || ADMIN_TEMP_PASSWORD.length < 12) {
  throw new Error("VSC_ADMIN_TEMP_PASSWORD must be set and contain at least 12 characters");
}
if (OWNER_TEMP_PASSWORD === ADMIN_TEMP_PASSWORD) {
  throw new Error("Owner and admin temporary passwords must be different");
}
const ACCOUNTS = [
  {
    id: "admin-vutrananh97",
    email: "vutrananh97@gmail.com",
    name: "Trần Anh Vũ",
    role: "OWNER",
    temporaryPassword: OWNER_TEMP_PASSWORD,
  },
  {
    id: "admin-nnqbao",
    email: "nnqbao@gmail.com",
    name: "Bao",
    role: "ADMIN",
    temporaryPassword: ADMIN_TEMP_PASSWORD,
  },
];

const url = process.env.CONVEX_SELF_HOSTED_URL || process.env.CONVEX_URL || "http://127.0.0.1:3280";
const client = new ConvexHttpClient(url);
const ts = new Date().toISOString();
const snap = await client.query(anyApi.store.dumpAll, {});

for (const account of ACCOUNTS) {
  const existing = (snap.users || []).find(
    (row) => String(row.email || "").toLowerCase() === account.email,
  );
  if (existing) {
    console.log(`Skipped existing ${existing.role} ${account.email}; credentials were not changed.`);
    continue;
  }
  const id = account.id;
  if (!existing && (snap.users || []).some((row) => String(row.id) === id)) {
    throw new Error(`Refusing to overwrite an existing user with reserved id ${id}`);
  }
  await client.mutation(anyApi.store.upsert, {
    table: "users",
    data: {
      id,
      email: account.email,
      name: account.name,
      password_hash: bcrypt.hashSync(account.temporaryPassword, 10),
      role: account.role,
      active: 1,
      must_change_password: 1,
      created_at: ts,
      updated_at: ts,
    },
  });
  console.log(`Upserted ${account.role} ${account.email} (id ${id}). First login must change password.`);
}
