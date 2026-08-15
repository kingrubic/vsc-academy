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

async function findDoc(ctx: any, table: string, id: string) {
  return ctx.db
    .query("documents")
    .withIndex("by_table_id", (q: any) => q.eq("table", table).eq("id", id))
    .unique();
}

async function collectTable(ctx: any, table: string): Promise<any[]> {
  return ctx.db.query("documents").withIndex("by_table", (q: any) => q.eq("table", table)).collect();
}

async function writeDoc(ctx: any, table: string, data: Record<string, unknown>) {
  const id = rowId(table, data);
  if (!id) throw new Error(`Missing id for ${table}`);
  data.id = id;
  const existing = await findDoc(ctx, table, id);
  if (existing) await ctx.db.patch(existing._id, { data });
  else await ctx.db.insert("documents", { table, id, data });
  return id;
}

function nextSessionVersion(row: Record<string, unknown>) {
  return Number(row.session_version || 0) + 1;
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

export const claimCertificate = mutation({
  args: { data: v.any(), replacesId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const data: Record<string, unknown> = { ...(args.data as Record<string, unknown>), status: "generating" };
    const id = rowId("certificates", data);
    if (!id) throw new Error("Missing certificate id");
    const docs = await ctx.db.query("documents").withIndex("by_table", (q) => q.eq("table", "certificates")).collect();
    const enrollmentId = String(data.enrollment_id ?? "");
    const conflict = docs.find((doc) => {
      const row = doc.data as Record<string, unknown>;
      return String(row.enrollment_id ?? "") === enrollmentId &&
        (row.status === "issued" || row.status === "generating") && doc.id !== args.replacesId;
    });
    if (conflict) return { claimed: false, id: conflict.id };
    if (args.replacesId) {
      const old = docs.find((doc) => doc.id === args.replacesId);
      if (!old || (old.data as Record<string, unknown>).status !== "issued") return { claimed: false, id: args.replacesId };
    }
    data.id = id;
    await ctx.db.insert("documents", { table: "certificates", id, data });
    return { claimed: true, id };
  },
});

export const finalizeCertificate = mutation({
  args: { certificate: v.any(), enrollment: v.any(), replacesId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const certificate = { ...(args.certificate as Record<string, unknown>) };
    const certificateId = rowId("certificates", certificate);
    const pending = await ctx.db.query("documents")
      .withIndex("by_table_id", (q) => q.eq("table", "certificates").eq("id", certificateId)).unique();
    if (!pending || (pending.data as Record<string, unknown>).status !== "generating") throw new Error("Certificate claim is no longer valid");
    const enrollment = { ...(args.enrollment as Record<string, unknown>) };
    const enrollmentId = rowId("enrollments", enrollment);
    const enrollmentDoc = await ctx.db.query("documents")
      .withIndex("by_table_id", (q) => q.eq("table", "enrollments").eq("id", enrollmentId)).unique();
    if (!enrollmentDoc) throw new Error("Enrollment disappeared during certificate issuance");
    if (args.replacesId) {
      const old = await ctx.db.query("documents")
        .withIndex("by_table_id", (q) => q.eq("table", "certificates").eq("id", args.replacesId!)).unique();
      if (!old || (old.data as Record<string, unknown>).status !== "issued") throw new Error("Certificate being replaced is no longer issued");
      await ctx.db.patch(old._id, { data: { ...(old.data as Record<string, unknown>), status: "reissued", updated_at: certificate.updated_at } });
    }
    certificate.id = certificateId;
    await ctx.db.patch(pending._id, { data: certificate });
    enrollment.id = enrollmentId;
    await ctx.db.patch(enrollmentDoc._id, { data: enrollment });
    return { ok: true, id: certificateId };
  },
});

export const consumePasswordReset = mutation({
  args: {
    tokenHash: v.string(),
    passwordHash: v.string(),
    now: v.string(),
    expectedKind: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resets = await collectTable(ctx, "password_resets");
    const resetDoc = resets.find((doc) => {
      const data = doc.data as Record<string, unknown>;
      return data.token_hash === args.tokenHash || doc.id === args.tokenHash;
    });
    if (!resetDoc) return { claimed: false, reason: "invalid" };
    const row = resetDoc.data as Record<string, unknown>;
    if (row.used_at || String(row.expires_at || "") < args.now) return { claimed: false, reason: "invalid" };

    const studentId = String(row.student_id || "");
    const userId = String(row.user_id || "");
    const kind = studentId ? "students" : userId ? "users" : "";
    if (!kind) return { claimed: false, reason: "invalid" };
    if (args.expectedKind && kind !== args.expectedKind) return { claimed: false, reason: "wrong_kind" };
    if (studentId) {
      const studentDoc = await findDoc(ctx, "students", studentId);
      if (!studentDoc) return { claimed: false, reason: "invalid" };
      const student = { ...(studentDoc.data as Record<string, unknown>) };
      if (student.status === "suspended" || student.status === "inactive") {
        return { claimed: false, reason: "inactive" };
      }
      await ctx.db.patch(resetDoc._id, { data: { ...row, used_at: args.now } });
      for (const other of resets) {
        if (other._id === resetDoc._id) continue;
        const otherData = other.data as Record<string, unknown>;
        if (String(otherData.student_id || "") === studentId && !otherData.used_at) {
          await ctx.db.patch(other._id, { data: { ...otherData, used_at: args.now } });
        }
      }
      const sessionVersion = nextSessionVersion(student);
      await ctx.db.patch(studentDoc._id, {
        data: {
          ...student,
          password_hash: args.passwordHash,
          activation_token: null,
          activation_expires_at: null,
          must_change_password: 0,
          status: student.status === "invited" ? "active" : student.status,
          session_version: sessionVersion,
          password_changed_at: args.now,
          updated_at: args.now,
        },
      });
      return { claimed: true, kind: "students", targetId: studentId, sessionVersion };
    }
    if (userId) {
      const userDoc = await findDoc(ctx, "users", userId);
      if (!userDoc) return { claimed: false, reason: "invalid" };
      const user = { ...(userDoc.data as Record<string, unknown>) };
      if (Number(user.active) !== 1) return { claimed: false, reason: "inactive" };
      await ctx.db.patch(resetDoc._id, { data: { ...row, used_at: args.now } });
      for (const other of resets) {
        if (other._id === resetDoc._id) continue;
        const otherData = other.data as Record<string, unknown>;
        if (String(otherData.user_id || "") === userId && !otherData.used_at) {
          await ctx.db.patch(other._id, { data: { ...otherData, used_at: args.now } });
        }
      }
      const sessionVersion = nextSessionVersion(user);
      await ctx.db.patch(userDoc._id, {
        data: {
          ...user,
          password_hash: args.passwordHash,
          must_change_password: 0,
          session_version: sessionVersion,
          password_changed_at: args.now,
          updated_at: args.now,
        },
      });
      return { claimed: true, kind: "users", targetId: userId, sessionVersion };
    }
    return { claimed: false, reason: "invalid" };
  },
});

export const applyPasswordChange = mutation({
  args: { table: v.string(), id: v.string(), passwordHash: v.string(), now: v.string() },
  handler: async (ctx, args) => {
    const table = assertTable(args.table);
    if (table !== "users" && table !== "students") throw new Error("invalid table");
    const doc = await findDoc(ctx, table, args.id);
    if (!doc) throw new Error("not found");
    const data = { ...(doc.data as Record<string, unknown>) };
    const sessionVersion = nextSessionVersion(data);
    data.password_hash = args.passwordHash;
    data.must_change_password = 0;
    data.activation_token = null;
    data.activation_expires_at = null;
    if (table === "students" && data.status === "invited") data.status = "active";
    data.session_version = sessionVersion;
    data.password_changed_at = args.now;
    data.updated_at = args.now;
    await ctx.db.patch(doc._id, { data });
    return { sessionVersion };
  },
});

export const upsertInstructorAccount = mutation({
  args: { instructor: v.any(), user: v.optional(v.any()) },
  handler: async (ctx, args) => {
    const instructor = { ...(args.instructor as Record<string, unknown>) };
    const instructorId = rowId("instructors", instructor);
    if (!instructorId) throw new Error("Missing instructor id");
    instructor.id = instructorId;
    const user = args.user ? { ...(args.user as Record<string, unknown>) } : null;
    if (user) {
      const email = String(user.email || instructor.email || "").trim().toLowerCase();
      user.email = email;
      const userId = rowId("users", user);
      if (!userId) throw new Error("Missing user id");
      user.id = userId;
      const users = await collectTable(ctx, "users");
      const emailOwner = users.find((doc) => {
        const data = doc.data as Record<string, unknown>;
        return String(data.email || "").toLowerCase() === email;
      });
      if (emailOwner && emailOwner.id !== userId) return { ok: false, error: "Email đã được dùng cho tài khoản khác" };
      if (emailOwner) {
        const linked = String((emailOwner.data as Record<string, unknown>).instructor_id || "");
        if (linked && linked !== instructorId) return { ok: false, error: "Email đã gắn giảng viên khác" };
      }
      const link = users.find((doc) => {
        const data = doc.data as Record<string, unknown>;
        return String(data.instructor_id || "") === instructorId && doc.id !== userId;
      });
      if (link) return { ok: false, error: "Giảng viên đã gắn tài khoản khác" };
      await writeDoc(ctx, "instructors", instructor);
      await writeDoc(ctx, "users", user);
      return { ok: true, id: instructorId };
    }
    await writeDoc(ctx, "instructors", instructor);
    return { ok: true, id: instructorId };
  },
});

export const issuePasswordReset = mutation({
  args: {
    tokenHash: v.string(),
    studentId: v.optional(v.string()),
    userId: v.optional(v.string()),
    now: v.string(),
    expiresAt: v.string(),
    maxOutstanding: v.number(),
  },
  handler: async (ctx, args) => {
    const resets = await collectTable(ctx, "password_resets");
    const outstanding = resets.filter((doc) => {
      const data = doc.data as Record<string, unknown>;
      if (data.used_at || String(data.expires_at || "") < args.now) return false;
      if (args.studentId) return String(data.student_id || "") === String(args.studentId);
      return String(data.user_id || "") === String(args.userId || "");
    });
    if (outstanding.length >= args.maxOutstanding) return { ok: false, reason: "limit" };
    await writeDoc(ctx, "password_resets", {
      id: args.tokenHash,
      token_hash: args.tokenHash,
      student_id: args.studentId || null,
      user_id: args.userId || null,
      expires_at: args.expiresAt,
      used_at: null,
      created_at: args.now,
    });
    return { ok: true };
  },
});

export const consumeActivation = mutation({
  args: { token: v.string(), passwordHash: v.string(), now: v.string() },
  handler: async (ctx, args) => {
    const docs = await collectTable(ctx, "students");
    const studentDoc = docs.find((doc) => {
      const data = doc.data as Record<string, unknown>;
      return data.activation_token === args.token && !data.deleted_at;
    });
    if (!studentDoc) return { claimed: false, reason: "invalid" };
    const student = { ...(studentDoc.data as Record<string, unknown>) };
    if (student.status !== "invited") return { claimed: false, reason: "invalid" };
    if (student.activation_expires_at && String(student.activation_expires_at) < args.now) {
      return { claimed: false, reason: "expired" };
    }
    const sessionVersion = nextSessionVersion(student);
    await ctx.db.patch(studentDoc._id, {
      data: {
        ...student,
        password_hash: args.passwordHash,
        activation_token: null,
        activation_expires_at: null,
        must_change_password: 0,
        status: "active",
        session_version: sessionVersion,
        password_changed_at: args.now,
        updated_at: args.now,
      },
    });
    return { claimed: true, targetId: String(student.id || studentDoc.id), sessionVersion };
  },
});

export const provisionLearnerAccount = mutation({
  args: { payload: v.any() },
  handler: async (ctx, args) => {
    const payload = args.payload as Record<string, unknown>;
    const registration = { ...(payload.registration as Record<string, unknown>) };
    const email = String(registration.email || "").trim().toLowerCase();
    const ts = String(payload.now || "");
    const students = await collectTable(ctx, "students");
    const existing = students.find((doc) => {
      const data = doc.data as Record<string, unknown>;
      return String(data.email || "").toLowerCase() === email && !data.deleted_at;
    });
    let student: Record<string, unknown>;
    let createdStudent = false;
    if (existing) {
      student = { ...(existing.data as Record<string, unknown>), id: existing.id };
    } else {
      student = { ...(payload.student as Record<string, unknown>), email };
      const id = rowId("students", student);
      if (!id) throw new Error("Missing student id");
      student.id = id;
      await ctx.db.insert("documents", { table: "students", id, data: student });
      createdStudent = true;
    }
    const enrollments = await collectTable(ctx, "enrollments");
    const existingEnroll = enrollments.find((doc) => {
      const data = doc.data as Record<string, unknown>;
      return String(data.student_id || "") === String(student.id) &&
        String(data.session_id || "") === String(registration.session_id || "");
    });
    let enrollment: Record<string, unknown>;
    let createdEnrollment = false;
    if (existingEnroll) {
      enrollment = { ...(existingEnroll.data as Record<string, unknown>), id: existingEnroll.id };
    } else {
      enrollment = { ...(payload.enrollment as Record<string, unknown>), student_id: student.id };
      const enrollmentId = rowId("enrollments", enrollment);
      if (!enrollmentId) throw new Error("Missing enrollment id");
      enrollment.id = enrollmentId;
      await ctx.db.insert("documents", { table: "enrollments", id: enrollmentId, data: enrollment });
      createdEnrollment = true;
    }
    const previousDoc = registration.id ? await findDoc(ctx, "registrations", String(registration.id)) : null;
    const previousRegistration = previousDoc ? { ...(previousDoc.data as Record<string, unknown>) } : null;
    await writeDoc(ctx, "registrations", { ...registration, email, student_id: student.id, updated_at: ts });
    return {
      ok: true,
      student,
      enrollment,
      createdStudent,
      createdEnrollment,
      previousRegistration,
      activationToken: createdStudent ? student.activation_token || null : null,
    };
  },
});

export const abortLearnerProvision = mutation({
  args: { payload: v.any() },
  handler: async (ctx, args) => {
    const payload = args.payload as Record<string, unknown>;
    if (payload.createdStudentId) {
      const doc = await findDoc(ctx, "students", String(payload.createdStudentId));
      if (doc) await ctx.db.delete(doc._id);
    }
    if (payload.createdEnrollmentId) {
      const doc = await findDoc(ctx, "enrollments", String(payload.createdEnrollmentId));
      if (doc) await ctx.db.delete(doc._id);
    }
    if (payload.previousRegistration) {
      await writeDoc(ctx, "registrations", payload.previousRegistration as Record<string, unknown>);
    } else if (payload.registrationId) {
      const doc = await findDoc(ctx, "registrations", String(payload.registrationId));
      if (doc) await ctx.db.delete(doc._id);
    }
    return { ok: true };
  },
});

export const beginResetAccess = mutation({
  args: {
    studentId: v.string(),
    activationToken: v.string(),
    expiresAt: v.string(),
    now: v.string(),
  },
  handler: async (ctx, args) => {
    const studentDoc = await findDoc(ctx, "students", args.studentId);
    if (!studentDoc) return { ok: false, error: "Not found" };
    const student = { ...(studentDoc.data as Record<string, unknown>) };
    if (student.status === "suspended" || student.status === "inactive") {
      return { ok: false, error: "Inactive accounts cannot be reset" };
    }
    const previous = {
      password_hash: student.password_hash,
      activation_token: student.activation_token,
      activation_expires_at: student.activation_expires_at,
      status: student.status,
      session_version: student.session_version,
      must_change_password: student.must_change_password,
    };
    const resets = await collectTable(ctx, "password_resets");
    for (const doc of resets) {
      const data = { ...(doc.data as Record<string, unknown>) };
      if (String(data.student_id || "") === args.studentId && !data.used_at) {
        await ctx.db.patch(doc._id, { data: { ...data, used_at: args.now } });
      }
    }
    const sessionVersion = nextSessionVersion(student);
    await ctx.db.patch(studentDoc._id, {
      data: {
        ...student,
        password_hash: null,
        activation_token: args.activationToken,
        activation_expires_at: args.expiresAt,
        status: "invited",
        must_change_password: 0,
        session_version: sessionVersion,
        updated_at: args.now,
      },
    });
    return { ok: true, previous, sessionVersion };
  },
});

export const abortResetAccess = mutation({
  args: { studentId: v.string(), previous: v.any(), now: v.string() },
  handler: async (ctx, args) => {
    const studentDoc = await findDoc(ctx, "students", args.studentId);
    if (!studentDoc || !args.previous) return { ok: false, error: "Not found" };
    const student = { ...(studentDoc.data as Record<string, unknown>), ...(args.previous as Record<string, unknown>), updated_at: args.now };
    await ctx.db.patch(studentDoc._id, { data: student });
    return { ok: true };
  },
});

export const cancelPasswordReset = mutation({
  args: { tokenHash: v.string(), now: v.string() },
  handler: async (ctx, args) => {
    const resets = await collectTable(ctx, "password_resets");
    const resetDoc = resets.find((doc) => {
      const data = doc.data as Record<string, unknown>;
      return data.token_hash === args.tokenHash || doc.id === args.tokenHash;
    });
    if (!resetDoc) return { ok: false, reason: "missing" };
    const data = { ...(resetDoc.data as Record<string, unknown>), used_at: args.now, delivery_failed: 1 };
    await ctx.db.patch(resetDoc._id, { data });
    return { ok: true };
  },
});

export const createStudentAccount = mutation({
  args: { student: v.any() },
  handler: async (ctx, args) => {
    const student = { ...(args.student as Record<string, unknown>) };
    const email = String(student.email || "").trim().toLowerCase();
    student.email = email;
    const id = rowId("students", student);
    if (!id) throw new Error("Missing student id");
    student.id = id;
    student.session_version = Number(student.session_version || 0);
    const docs = await collectTable(ctx, "students");
    const conflict = docs.find((doc) => {
      const data = doc.data as Record<string, unknown>;
      return String(data.email || "").toLowerCase() === email && !data.deleted_at;
    });
    if (conflict) return { ok: false, error: "Email already exists" };
    await ctx.db.insert("documents", { table: "students", id, data: student });
    return { ok: true, id };
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
