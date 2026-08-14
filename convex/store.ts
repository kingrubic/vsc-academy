import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const TABLES = [
  "users",
  "venues",
  "instructors",
  "programs",
  "program_instructors",
  "sessions",
  "registrations",
  "insights",
  "resources",
  "media",
  "settings",
  "students",
  "enrollments",
  "class_meetings",
  "attendance",
  "learning_materials",
  "announcements",
  "announcement_reads",
  "certificates",
  "certificate_templates",
  "password_resets",
  "notifications",
  "mail_outbox",
  "audit_logs",
] as const;

type TableName = (typeof TABLES)[number];

function assertTable(table: string): TableName {
  if (!TABLES.includes(table as TableName)) {
    throw new Error(`Unknown CMS table: ${table}`);
  }
  return table as TableName;
}

function rowId(table: string, data: Record<string, unknown>): string {
  if (table === "settings") return String(data.key ?? data.id ?? "");
  if (table === "program_instructors") {
    return String(data.id ?? `${data.program_id}::${data.instructor_id}`);
  }
  if (table === "attendance") {
    return String(data.id ?? `${data.enrollment_id}::${data.meeting_id}`);
  }
  if (table === "announcement_reads") {
    return String(data.id ?? `${data.announcement_id}::${data.student_id}`);
  }
  if (table === "password_resets") {
    return String(data.id ?? data.token_hash ?? "");
  }
  return String(data.id ?? "");
}

function publicRow(table: string, id: string, data: Record<string, unknown>) {
  const row: Record<string, unknown> = { ...data, id };
  if (table === "settings" && row.key == null) row.key = id;
  return row;
}

export const dumpAll = query({
  args: {},
  handler: async (ctx) => {
    const snapshot: Record<string, unknown[]> = {};
    for (const table of TABLES) snapshot[table] = [];
    const docs = await ctx.db.query("documents").collect();
    for (const doc of docs) {
      if (!snapshot[doc.table]) snapshot[doc.table] = [];
      snapshot[doc.table].push(publicRow(doc.table, doc.id, doc.data as Record<string, unknown>));
    }
    return snapshot;
  },
});

export const upsert = mutation({
  args: {
    table: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const table = assertTable(args.table);
    const data = { ...(args.data as Record<string, unknown>) };
    const id = rowId(table, data);
    if (!id) throw new Error(`Missing id for ${table}`);
    data.id = id;
    const existing = await ctx.db
      .query("documents")
      .withIndex("by_table_id", (q) => q.eq("table", table).eq("id", id))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { data });
    } else {
      await ctx.db.insert("documents", { table, id, data });
    }
    return { id };
  },
});

export const remove = mutation({
  args: {
    table: v.string(),
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const table = assertTable(args.table);
    const existing = await ctx.db
      .query("documents")
      .withIndex("by_table_id", (q) => q.eq("table", table).eq("id", args.id))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
    return { ok: true };
  },
});

export const removeWhere = mutation({
  args: {
    table: v.string(),
    field: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    const table = assertTable(args.table);
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_table", (q) => q.eq("table", table))
      .collect();
    let n = 0;
    for (const doc of docs) {
      const data = doc.data as Record<string, unknown>;
      if (String(data[args.field] ?? "") === args.value) {
        await ctx.db.delete(doc._id);
        n += 1;
      }
    }
    return { n };
  },
});

export const replaceAll = mutation({
  args: {
    snapshot: v.any(),
  },
  handler: async (ctx, args) => {
    const snapshot = args.snapshot as Record<string, unknown[]>;
    const existing = await ctx.db.query("documents").collect();
    for (const doc of existing) await ctx.db.delete(doc._id);

    let count = 0;
    for (const table of TABLES) {
      const rows = Array.isArray(snapshot[table]) ? snapshot[table] : [];
      for (const raw of rows) {
        const data = { ...(raw as Record<string, unknown>) };
        const id = rowId(table, data);
        if (!id) continue;
        data.id = id;
        await ctx.db.insert("documents", { table, id, data });
        count += 1;
      }
    }
    return { ok: true, count };
  },
});
