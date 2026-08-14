const express = require("express");
const { remainingSeats } = require("../lib/serialize");
const { parseJson, now, alive, aliveById } = require("../lib/convex-db");
const { email, phone, required, fail } = require("../lib/validate");

function nextRegistrationId(snap) {
  const year = new Date().getFullYear();
  const prefix = `VSC-${year}-`;
  const ids = (snap.registrations || [])
    .map((row) => row.id)
    .filter((id) => String(id).startsWith(prefix))
    .sort();
  const last = ids[ids.length - 1];
  const n = last ? Number(String(last).slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(n).padStart(6, "0")}`;
}

function parseAmount(label) {
  const digits = String(label || "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : null;
}

function createPublicRouter(store) {
  const router = express.Router();

  router.get("/health", (_req, res) => {
    res.json({ ok: true, service: "vsc-academy-cms", backend: "convex-local" });
  });

  router.get("/bootstrap", async (_req, res) => {
    const serialize = require("../lib/serialize");
    const snap = await store.dump();
    res.json(serialize.bootstrap(snap));
  });

  router.post("/registrations", async (req, res) => {
    try {
      const snap = await store.dump(true);
      const body = req.body || {};
      const student = body.student || body;
      required({ fullName: student.fullName, phone: student.phone, email: student.email }, [
        "fullName",
        "phone",
        "email",
      ]);
      email(student.email);
      phone(student.phone);

      const sessionId = body.session?.sessionId || body.sessionId;
      const session = sessionId ? aliveById(snap.sessions, sessionId) : null;
      if (sessionId && !session) throw fail("Session not found");

      const programId = body.program?.programId || body.programId || session?.program_id;
      if (programId && !aliveById(snap.programs, programId)) throw fail("Program not found");

      const remaining = session ? remainingSeats(session) : null;
      const status = body.status || (remaining === 0 ? "waitlist" : "new");
      const program = aliveById(snap.programs, programId);
      const amount =
        body.amount != null
          ? Number(body.amount)
          : parseAmount(body.session?.price) ??
            (session?.price_override != null ? session.price_override : program?.price_amount);

      const id = nextRegistrationId(snap);
      const ts = now();
      await store.upsert("registrations", {
        id,
        full_name: String(student.fullName).trim(),
        phone: String(student.phone).trim(),
        email: String(student.email).trim().toLowerCase(),
        job_role: student.role || "",
        organization: student.organization || "",
        program_id: programId || null,
        session_id: session?.id || null,
        student_id: null,
        amount,
        currency: "VND",
        status,
        source: body.marketing?.source || body.source || "",
        utm: JSON.stringify(body.marketing || {}),
        ai_level: body.learningProfile?.aiLevel || body.aiLevel || "",
        goal: body.learningProfile?.goal || body.goal || "",
        consent_privacy: body.consentPrivacy ? 1 : 0,
        consent_marketing: body.consentMarketing ? 1 : 0,
        invoice: JSON.stringify(body.invoice || {}),
        notes: "[]",
        locale: body.locale || "vi",
        created_at: ts,
        updated_at: ts,
      });

      if (session && status !== "waitlist" && status !== "cancelled") {
        const registered = Number(session.registered_count || 0) + 1;
        const updated = { ...session, registered_count: registered, updated_at: ts };
        if (updated.capacity != null && remainingSeats(updated) <= 0) {
          if (["open", "limited"].includes(updated.status)) updated.status = "full";
        } else if (updated.capacity != null && remainingSeats(updated) <= 3 && updated.status === "open") {
          updated.status = "limited";
        }
        await store.upsert("sessions", updated);
      }

      res.status(201).json({ id, status, amount });
    } catch (err) {
      res.status(err.status || 400).json({ error: err.message || "Invalid registration" });
    }
  });

  router.get("/certificates/:code", async (req, res) => {
    const snap = await store.dump();
    const Cert = require("../lib/certificate");
    const row = Cert.findByCode(snap, req.params.code);
    if (!row) {
      return res.json({
        valid: false,
        status: "not_found",
        messageVi: "CHỨNG NHẬN KHÔNG TỒN TẠI",
        messageEn: "CERTIFICATE NOT FOUND",
      });
    }
    if (row.status === "revoked") {
      return res.json({
        valid: false,
        status: "revoked",
        certificateCode: row.certificate_code,
        messageVi: "CHỨNG NHẬN ĐÃ BỊ THU HỒI",
        messageEn: "CERTIFICATE REVOKED",
      });
    }
    if (row.status === "reissued") {
      return res.json({
        valid: false,
        status: "reissued",
        certificateCode: row.certificate_code,
        messageVi: "CHỨNG NHẬN ĐÃ ĐƯỢC CẤP LẠI",
        messageEn: "CERTIFICATE REISSUED",
      });
    }
    if (row.status !== "issued") {
      return res.json({
        valid: false,
        status: row.status,
        certificateCode: row.certificate_code,
        messageVi: "CHỨNG NHẬN KHÔNG TỒN TẠI",
        messageEn: "CERTIFICATE NOT FOUND",
      });
    }
    res.json({
      valid: true,
      status: "valid",
      messageVi: "CHỨNG NHẬN HỢP LỆ",
      messageEn: "CERTIFICATE VALID",
      ...Cert.publicCertificate(row),
    });
  });

  return router;
}

module.exports = { createPublicRouter };
