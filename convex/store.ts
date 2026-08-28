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
    if (table === "students") return { id, rejected: true, reason: "dedicated_mutation_required" };
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
      const changed: Record<string, unknown> = {
        ...student,
        password_hash: args.passwordHash,
        activation_token: null,
        activation_expires_at: null,
        must_change_password: 0,
        status: student.status === "invited" ? "active" : student.status,
        session_version: sessionVersion,
        password_changed_at: args.now,
        updated_at: args.now,
      };
      delete changed.reset_access_operation_id;
      delete changed.reset_access_operation_expires_at;
      delete changed.reset_access_previous;
      await ctx.db.patch(studentDoc._id, { data: changed });
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
    if (table === "students") {
      delete data.reset_access_operation_id;
      delete data.reset_access_operation_expires_at;
      delete data.reset_access_previous;
    }
    await ctx.db.patch(doc._id, { data });
    return { sessionVersion };
  },
});

const STUDENT_PATCH_FIELDS = new Set([
  "full_name", "phone", "avatar", "language_preference", "notes", "status", "last_login_at", "updated_at",
]);

export const patchStudentFields = mutation({
  args: { id: v.string(), expectedSessionVersion: v.number(), fields: v.any() },
  handler: async (ctx, args) => {
    const doc = await findDoc(ctx, "students", args.id);
    if (!doc || (doc.data as Record<string, unknown>).deleted_at) return { ok: false, error: "Not found" };
    const student = { ...(doc.data as Record<string, unknown>) };
    if (Number(student.session_version || 0) !== args.expectedSessionVersion) return { ok: false, stale: true };
    const previousStatus = student.status;
    for (const [key, value] of Object.entries(args.fields as Record<string, unknown>)) {
      if (STUDENT_PATCH_FIELDS.has(key)) student[key] = value;
    }
    if (Object.prototype.hasOwnProperty.call(args.fields as Record<string, unknown>, "status") && student.status !== previousStatus) {
      student.session_version = nextSessionVersion(student);
    }
    await ctx.db.patch(doc._id, { data: student });
    return { ok: true, student };
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
    studentId: v.optional(v.union(v.string(), v.null())),
    userId: v.optional(v.union(v.string(), v.null())),
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
    const activated: Record<string, unknown> = {
        ...student,
        password_hash: args.passwordHash,
        activation_token: null,
        activation_expires_at: null,
        must_change_password: 0,
        status: "active",
        session_version: sessionVersion,
        password_changed_at: args.now,
        updated_at: args.now,
    };
    delete activated.reset_access_operation_id;
    delete activated.reset_access_operation_expires_at;
    delete activated.reset_access_previous;
    await ctx.db.patch(studentDoc._id, { data: activated });
    return { claimed: true, targetId: String(student.id || studentDoc.id), sessionVersion };
  },
});

function markLearnerProvision(row: Record<string, unknown>, operationId: string) {
  row.provision_operation_id = operationId;
  row.provision_revision = Number(row.provision_revision || 0) + 1;
  return { id: String(row.id || ""), revision: row.provision_revision };
}

function ownsLearnerProvision(row: Record<string, unknown> | null, operationId: string, ownership: any) {
  return !!row &&
    String(row.provision_operation_id || "") === operationId &&
    Number(row.provision_revision || 0) === Number(ownership?.revision || 0);
}

export const provisionLearnerAccount = mutation({
  args: { payload: v.any() },
  handler: async (ctx, args) => {
    const payload = args.payload as Record<string, unknown>;
    const operationId = String(payload.operationId || "");
    if (!operationId) return { ok: false, error: "Missing learner provision operation id" };
    const registration = { ...(payload.registration as Record<string, unknown>) };
    const email = String(registration.email || "").trim().toLowerCase();
    const ts = String(payload.now || "");
    const students = await collectTable(ctx, "students");
    const existing = students.find((doc) => {
      const data = doc.data as Record<string, unknown>;
      return String(data.email || "").toLowerCase() === email && !data.deleted_at;
    });
    let student: Record<string, unknown>;
    let studentDoc = existing || null;
    const createdStudent = !existing;
    if (existing) student = { ...(existing.data as Record<string, unknown>), id: existing.id };
    else {
      student = { ...(payload.student as Record<string, unknown>), email };
      const id = rowId("students", student);
      if (!id) throw new Error("Missing student id");
      student.id = id;
    }
    const previousStudent = createdStudent ? null : { ...student };
    const studentOwnership = markLearnerProvision(student, operationId);
    if (studentDoc) await ctx.db.patch(studentDoc._id, { data: student });
    else await ctx.db.insert("documents", { table: "students", id: String(student.id), data: student });

    const enrollments = await collectTable(ctx, "enrollments");
    const existingEnroll = enrollments.find((doc) => {
      const data = doc.data as Record<string, unknown>;
      return String(data.student_id || "") === String(student.id) && String(data.session_id || "") === String(registration.session_id || "");
    });
    let enrollment: Record<string, unknown>;
    let enrollmentDoc = existingEnroll || null;
    const createdEnrollment = !existingEnroll;
    if (existingEnroll) enrollment = { ...(existingEnroll.data as Record<string, unknown>), id: existingEnroll.id };
    else {
      enrollment = { ...(payload.enrollment as Record<string, unknown>), student_id: student.id };
      const id = rowId("enrollments", enrollment);
      if (!id) throw new Error("Missing enrollment id");
      enrollment.id = id;
    }
    const previousEnrollment = createdEnrollment ? null : { ...enrollment };
    enrollment.registration_id = registration.id;
    const enrollmentOwnership = markLearnerProvision(enrollment, operationId);
    if (enrollmentDoc) await ctx.db.patch(enrollmentDoc._id, { data: enrollment });
    else await ctx.db.insert("documents", { table: "enrollments", id: String(enrollment.id), data: enrollment });

    const previousDoc = registration.id ? await findDoc(ctx, "registrations", String(registration.id)) : null;
    const previousRegistration = previousDoc ? { ...(previousDoc.data as Record<string, unknown>) } : null;
    const nextRegistration: Record<string, unknown> = {
      ...(previousRegistration || {}), ...registration, email, student_id: student.id, updated_at: ts,
    };
    const registrationId = rowId("registrations", nextRegistration);
    if (!registrationId) throw new Error("Missing registration id");
    nextRegistration.id = registrationId;
    const registrationOwnership = markLearnerProvision(nextRegistration, operationId);
    if (previousDoc) await ctx.db.patch(previousDoc._id, { data: nextRegistration });
    else await ctx.db.insert("documents", { table: "registrations", id: registrationId, data: nextRegistration });
    return {
      ok: true, operationId, student, enrollment, createdStudent, createdEnrollment,
      previousStudent, previousEnrollment, previousRegistration,
      activationToken: student.status === "invited" ? student.activation_token || null : null,
      ownership: {
        student: { ...studentOwnership, created: createdStudent },
        enrollment: { ...enrollmentOwnership, created: createdEnrollment },
        registration: { ...registrationOwnership, created: !previousRegistration },
      },
    };
  },
});

export const finalizeLearnerProvision = mutation({
  args: { payload: v.any() },
  handler: async (ctx, args) => {
    const payload = args.payload as Record<string, any>;
    const operationId = String(payload.operationId || "");
    for (const [table, ownership] of Object.entries(payload.ownership || {})) {
      const doc = await findDoc(ctx, table === "student" ? "students" : table === "enrollment" ? "enrollments" : "registrations", String((ownership as any)?.id || ""));
      if (!doc) continue;
      const row = { ...(doc.data as Record<string, unknown>) };
      if (ownsLearnerProvision(row, operationId, ownership)) {
        delete row.provision_operation_id;
        delete row.provision_revision;
        await ctx.db.patch(doc._id, { data: row });
      }
    }
    return { ok: true };
  },
});

export const abortLearnerProvision = mutation({
  args: { payload: v.any() },
  handler: async (ctx, args) => {
    const payload = args.payload as Record<string, any>;
    const operationId = String(payload.operationId || "");
    const ownership = payload.ownership || {};
    for (const [key, table, previousKey] of [
      ["student", "students", "previousStudent"],
      ["enrollment", "enrollments", "previousEnrollment"],
    ] as const) {
      const claimed = ownership[key];
      const doc = await findDoc(ctx, table, String(claimed.id || ""));
      if (doc && ownsLearnerProvision(doc.data as Record<string, unknown>, operationId, claimed)) {
        if (claimed.created) await ctx.db.delete(doc._id);
        else if (payload[previousKey]) await ctx.db.patch(doc._id, { data: payload[previousKey] });
      }
    }
    const claimed = ownership.registration;
    if (claimed) {
      const doc = await findDoc(ctx, "registrations", String(claimed.id || ""));
      if (doc && ownsLearnerProvision(doc.data as Record<string, unknown>, operationId, claimed)) {
        if (payload.previousRegistration) await ctx.db.patch(doc._id, { data: payload.previousRegistration });
        else if (claimed.created) await ctx.db.delete(doc._id);
      }
    }
    return { ok: true };
  },
});

export const beginResetAccess = mutation({
  args: {
    studentId: v.string(),
    operationId: v.string(),
    activationToken: v.string(),
    expiresAt: v.string(),
    operationExpiresAt: v.string(),
    now: v.string(),
  },
  handler: async (ctx, args) => {
    const studentDoc = await findDoc(ctx, "students", args.studentId);
    if (!studentDoc) return { ok: false, error: "Not found" };
    const student = { ...(studentDoc.data as Record<string, unknown>) };
    if (student.status === "suspended" || student.status === "inactive") {
      return { ok: false, error: "Inactive accounts cannot be reset" };
    }
    if (student.reset_access_operation_id && String(student.reset_access_operation_expires_at || "") > args.now) {
      return { ok: false, error: "Reset access already in progress" };
    }
    const previous = (student.reset_access_previous as Record<string, unknown> | undefined) || {
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
        reset_access_operation_id: args.operationId,
        reset_access_operation_expires_at: args.operationExpiresAt,
        reset_access_previous: previous,
        updated_at: args.now,
      },
    });
    return { ok: true, previous, sessionVersion };
  },
});

export const finalizeResetAccess = mutation({
  args: {
    studentId: v.string(),
    operationId: v.string(),
    activationToken: v.string(),
    sessionVersion: v.number(),
  },
  handler: async (ctx, args) => {
    const studentDoc = await findDoc(ctx, "students", args.studentId);
    if (!studentDoc) return { ok: false, error: "Not found" };
    const student = { ...(studentDoc.data as Record<string, unknown>) };
    if (
      String(student.reset_access_operation_id || "") !== args.operationId ||
      student.activation_token !== args.activationToken ||
      Number(student.session_version || 0) !== args.sessionVersion
    ) return { ok: true, stale: true };
    delete student.reset_access_operation_id;
    delete student.reset_access_operation_expires_at;
    delete student.reset_access_previous;
    await ctx.db.patch(studentDoc._id, { data: student });
    return { ok: true };
  },
});

export const abortResetAccess = mutation({
  args: {
    studentId: v.string(),
    operationId: v.string(),
    activationToken: v.string(),
    sessionVersion: v.number(),
    previous: v.any(),
    now: v.string(),
  },
  handler: async (ctx, args) => {
    const studentDoc = await findDoc(ctx, "students", args.studentId);
    if (!studentDoc || !args.previous) return { ok: false, error: "Not found" };
    const current = { ...(studentDoc.data as Record<string, unknown>) };
    if (
      String(current.reset_access_operation_id || "") !== args.operationId ||
      current.activation_token !== args.activationToken ||
      Number(current.session_version || 0) !== args.sessionVersion
    ) return { ok: true, stale: true };
    const student: Record<string, unknown> = {
      ...current,
      ...(args.previous as Record<string, unknown>),
      session_version: nextSessionVersion(current),
      updated_at: args.now,
    };
    delete student.reset_access_operation_id;
    delete student.reset_access_operation_expires_at;
    delete student.reset_access_previous;
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

export const softDeleteStudent = mutation({
  args: { id: v.string(), now: v.string() },
  handler: async (ctx, args) => {
    const doc = await findDoc(ctx, "students", args.id);
    if (!doc || (doc.data as Record<string, unknown>).deleted_at) return { ok: false, error: "Not found" };
    const student = { ...(doc.data as Record<string, unknown>) };
    student.deleted_at = args.now;
    student.updated_at = args.now;
    student.status = "inactive";
    student.activation_token = null;
    student.activation_expires_at = null;
    student.session_version = nextSessionVersion(student);
    delete student.reset_access_operation_id;
    delete student.reset_access_operation_expires_at;
    delete student.reset_access_previous;
    await ctx.db.patch(doc._id, { data: student });
    let cancelledEnrollments = 0;
    const enrollments = await collectTable(ctx, "enrollments");
    for (const enrollmentDoc of enrollments) {
      const enrollment = { ...(enrollmentDoc.data as Record<string, unknown>) };
      if (String(enrollment.student_id) !== String(args.id) || enrollment.status !== "active") continue;
      enrollment.status = "cancelled";
      enrollment.updated_at = args.now;
      await ctx.db.patch(enrollmentDoc._id, { data: enrollment });
      cancelledEnrollments += 1;
    }
    const resets = await collectTable(ctx, "password_resets");
    for (const resetDoc of resets) {
      const reset = { ...(resetDoc.data as Record<string, unknown>) };
      if (String(reset.student_id || "") !== String(args.id) || reset.used_at) continue;
      reset.used_at = args.now;
      await ctx.db.patch(resetDoc._id, { data: reset });
    }
    return { ok: true, id: args.id, cancelledEnrollments };
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
