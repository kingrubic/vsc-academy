const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const { now, parseJson, alive, aliveById } = require("./convex-db");
const { randomId } = require("./auth");
const Security = require("./lms-security");
const {
  generateCertificateCode,
  evaluateEligibility,
  publicSiteUrl,
  programCode,
} = require("./lms-core");

const CERT_DIR = Security.CERTIFICATE_DIR;
fs.mkdirSync(CERT_DIR, { recursive: true });

const FONT_REG =
  "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf";
const FONT_BOLD = "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf";

const DEFAULT_TEMPLATE = {
  id: "tpl-vsc-default",
  name: "VSC Academy Standard",
  program_id: null,
  language: "vi",
  title_vi: "CHỨNG NHẬN HOÀN THÀNH",
  title_en: "CERTIFICATE OF COMPLETION",
  body_vi: "VSC Academy chứng nhận rằng",
  body_en: "VSC Academy hereby certifies that",
  footer_vi: "Chứng nhận này xác nhận việc hoàn thành chương trình đào tạo Applied AI của VSC Academy.",
  footer_en: "This certificate confirms completion of a VSC Academy Applied AI programme.",
  signer1_name: "Trần Anh Vũ",
  signer1_title: "Founder · VSC Academy",
  signer2_name: "",
  signer2_title: "",
  qr_position: "bottom-right",
  status: "published",
  version: 1,
};

function programName(row, locale) {
  const content = parseJson(locale === "en" ? row?.content_en : row?.content_vi, {});
  return content.shortName || content.name || row?.id || "";
}

function resolveTemplate(snap, templateId) {
  const row = (snap.certificate_templates || []).find((t) => t.id === templateId && t.status !== "archived");
  return row || (snap.certificate_templates || []).find((t) => t.id === "tpl-vsc-default") || DEFAULT_TEMPLATE;
}

function fitNameSize(doc, name, maxWidth, start = 36, min = 18) {
  let size = start;
  doc.fontSize(size);
  while (size > min && doc.widthOfString(name) > maxWidth) {
    size -= 1;
    doc.fontSize(size);
  }
  return size;
}

async function renderCertificatePdf(cert, template) {
  const qrPng = await QRCode.toBuffer(cert.verification_url, {
    margin: 1,
    width: 320,
    color: { dark: "#10213a", light: "#ffffff" },
  });
  const locale = template.language === "en" ? "en" : "vi";
  const title = locale === "en" ? template.title_en || template.title_vi : template.title_vi;
  const body = locale === "en" ? template.body_en || template.body_vi : template.body_vi;
  const footer = locale === "en" ? template.footer_en || template.footer_vi : template.footer_vi;
  const programNameText =
    locale === "en" ? cert.program_name_en_snapshot || cert.program_name_vi_snapshot : cert.program_name_vi_snapshot;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = doc.page.width;
    const H = doc.page.height;
    const hasFonts = fs.existsSync(FONT_REG) && fs.existsSync(FONT_BOLD);
    if (hasFonts) {
      doc.registerFont("VSC", FONT_REG);
      doc.registerFont("VSC-Bold", FONT_BOLD);
    }
    const regular = hasFonts ? "VSC" : "Helvetica";
    const bold = hasFonts ? "VSC-Bold" : "Helvetica-Bold";

    doc.rect(0, 0, W, H).fill("#0b1324");
    doc.save();
    doc.strokeColor("#1769ff").lineWidth(0.4).opacity(0.22);
    for (let x = 36; x < W; x += 28) {
      doc.moveTo(x, 0).lineTo(x, H).stroke();
    }
    for (let y = 28; y < H; y += 28) {
      doc.moveTo(0, y).lineTo(W, y).stroke();
    }
    doc.restore();

    doc.lineWidth(1.2).strokeColor("#1769ff");
    doc.rect(22, 22, W - 44, H - 44).stroke();
    doc.lineWidth(0.6).strokeColor("#64dcff");
    doc.rect(30, 30, W - 60, H - 60).stroke();
    doc.moveTo(48, 86).lineTo(W - 48, 86).strokeColor("#1769ff").lineWidth(0.8).stroke();

    doc.fillColor("#64dcff").font(bold).fontSize(10).text("VSC ACADEMY", 48, 48, {
      characterSpacing: 3.2,
      width: W - 96,
      align: "left",
    });
    doc.fillColor("#8ea0b8").font(regular).fontSize(8).text("APPLIED AI EDUCATION", 48, 64, {
      characterSpacing: 2.4,
    });

    doc.fillColor("#ffffff").font(bold).fontSize(22).text(title, 48, 110, {
      width: W - 96,
      align: "center",
      characterSpacing: 1.6,
    });
    doc.fillColor("#c5d2e5").font(regular).fontSize(11).text(body, 80, 150, {
      width: W - 160,
      align: "center",
    });

    const nameSize = fitNameSize(doc.font(bold), cert.student_name_snapshot, W - 160, 34, 16);
    doc.fillColor("#ffffff").font(bold).fontSize(nameSize).text(cert.student_name_snapshot, 80, 178, {
      width: W - 160,
      align: "center",
    });

    doc.fillColor("#64dcff").font(regular).fontSize(10).text(
      locale === "en" ? "has completed the programme" : "đã hoàn thành chương trình",
      80,
      230,
      { width: W - 160, align: "center" },
    );
    doc.fillColor("#ffffff").font(bold).fontSize(16).text(programNameText, 80, 248, {
      width: W - 160,
      align: "center",
    });

    const fmt = (iso) => {
      if (!iso) return "—";
      const d = String(iso).slice(0, 10).split("-");
      return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : iso;
    };
    doc.fillColor("#8ea0b8").font(regular).fontSize(9);
    doc.text(
      locale === "en"
        ? `Completion  ${fmt(cert.completion_date)}      Issued  ${fmt(cert.issue_date)}`
        : `Hoàn thành  ${fmt(cert.completion_date)}      Cấp ngày  ${fmt(cert.issue_date)}`,
      80,
      290,
      { width: W - 160, align: "center" },
    );

    doc.fillColor("#64dcff").font(bold).fontSize(9).text(cert.certificate_code, 80, 318, {
      width: W - 160,
      align: "center",
      characterSpacing: 1.8,
    });

    const signerY = H - 128;
    doc.strokeColor("#3d5a80").lineWidth(0.7);
    doc.moveTo(72, signerY).lineTo(250, signerY).stroke();
    doc.fillColor("#ffffff").font(bold).fontSize(10).text(template.signer1_name || "VSC Academy", 72, signerY + 8, {
      width: 180,
    });
    doc.fillColor("#8ea0b8").font(regular).fontSize(8).text(template.signer1_title || "", 72, signerY + 24, {
      width: 180,
    });
    if (template.signer2_name) {
      doc.strokeColor("#3d5a80").moveTo(W - 250, signerY).lineTo(W - 72, signerY).stroke();
      doc.fillColor("#ffffff").font(bold).fontSize(10).text(template.signer2_name, W - 250, signerY + 8, {
        width: 178,
        align: "right",
      });
      doc.fillColor("#8ea0b8").font(regular).fontSize(8).text(template.signer2_title || "", W - 250, signerY + 24, {
        width: 178,
        align: "right",
      });
    }

    doc.image(qrPng, W - 128, H - 128, { width: 72, height: 72 });
    doc.fillColor("#8ea0b8").font(regular).fontSize(7).text(
      locale === "en" ? "Verify" : "Xác minh",
      W - 128,
      H - 50,
      { width: 72, align: "center" },
    );

    doc.fillColor("#6b7c94").font(regular).fontSize(8).text(footer || "", 72, H - 48, {
      width: W - 220,
    });
    doc.end();
  });
}

function publicCertificate(row) {
  if (!row) return null;
  return {
    certificateCode: row.certificate_code,
    studentName: row.student_name_snapshot,
    programNameVi: row.program_name_vi_snapshot,
    programNameEn: row.program_name_en_snapshot,
    completionDate: row.completion_date,
    issueDate: row.issue_date,
    status: row.status,
    issuer: "VSC Academy",
    verificationUrl: row.verification_url,
  };
}

async function writeAudit(store, action, actor, target, detail) {
  const ts = now();
  await store.upsert("audit_logs", {
    id: randomId("aud"),
    action,
    actor_id: actor?.id || null,
    actor_email: actor?.email || "",
    target_type: target?.type || "",
    target_id: target?.id || "",
    detail: typeof detail === "string" ? detail : JSON.stringify(detail || {}),
    created_at: ts,
    created_by: actor?.id || null,
  });
}

async function issueCertificate(store, snap, enrollmentId, actor, req) {
  const enrollment = (snap.enrollments || []).find((e) => e.id === enrollmentId);
  if (!enrollment) throw Object.assign(new Error("Enrollment not found"), { status: 404 });
  const existingIssued = (snap.certificates || []).find(
    (c) => c.enrollment_id === enrollmentId && c.status === "issued",
  );
  if (existingIssued) throw Object.assign(new Error("Certificate already issued"), { status: 409 });

  const student = aliveById(snap.students, enrollment.student_id);
  const program = aliveById(snap.programs, enrollment.program_id);
  const session = aliveById(snap.sessions, enrollment.session_id);
  if (!student || !program) throw Object.assign(new Error("Student or program missing"), { status: 400 });

  const check = evaluateEligibility(snap, enrollment, program);
  if (!check.eligible) {
    const err = Object.assign(new Error("Student is not eligible"), { status: 400 });
    err.reasons = check.reasons;
    throw err;
  }

  const template = resolveTemplate(snap, program.certificate_template_id || "tpl-vsc-default");
  const existingCodes = new Set((snap.certificates || []).map((c) => c.certificate_code));
  const code = generateCertificateCode(program, existingCodes);
  const base = publicSiteUrl(req, snap.settings);
  const verificationUrl = `${base}/verify/${code}`;
  const ts = now();
  const completionDate = (enrollment.completed_at || ts).slice(0, 10);
  const cert = {
    id: randomId("crt"),
    certificate_code: code,
    student_id: student.id,
    enrollment_id: enrollment.id,
    program_id: program.id,
    session_id: session?.id || enrollment.session_id,
    template_id: template.id,
    template_version: template.version || 1,
    student_name_snapshot: student.full_name,
    program_name_vi_snapshot: programName(program, "vi"),
    program_name_en_snapshot: programName(program, "en"),
    session_name_snapshot: session?.session_name || "",
    completion_date: completionDate,
    issue_date: ts.slice(0, 10),
    status: "generating",
    issued_by: actor?.id || null,
    issued_at: ts,
    pdf_url: "",
    verification_url: verificationUrl,
    qr_code_data: verificationUrl,
    revoked_at: null,
    revoked_by: null,
    revocation_reason: "",
    replaces_certificate_id: null,
    created_at: ts,
    updated_at: ts,
    created_by: actor?.id || null,
    updated_by: actor?.id || null,
  };

  const claim = await store.claimCertificate(cert);
  if (!claim.claimed) throw Object.assign(new Error("Certificate already issued or issuance is in progress"), { status: 409 });
  const filename = `${cert.id}.pdf`;
  const pdfPath = path.join(CERT_DIR, filename);
  try {
    const pdf = await renderCertificatePdf(cert, template);
    fs.writeFileSync(pdfPath, pdf, { flag: "wx", mode: 0o600 });
  } catch (err) {
    Security.removeFile(pdfPath);
    await store.remove("certificates", cert.id).catch(() => {});
    throw err;
  }
  cert.pdf_url = filename;
  cert.status = "issued";
  try {
    await store.finalizeCertificate(cert, {
      ...enrollment,
      certificate_status: "issued",
      completion_status: "completed",
      status: enrollment.status === "cancelled" ? enrollment.status : "completed",
      completed_at: enrollment.completed_at || ts,
      updated_at: ts,
      updated_by: actor?.id || null,
    });
  } catch (err) {
    Security.removeFile(pdfPath);
    await store.remove("certificates", cert.id).catch(() => {});
    throw err;
  }
  await writeAudit(store, "certificate.issue", actor, { type: "certificate", id: cert.id }, { code });
  return cert;
}

async function revokeCertificate(store, snap, certificateId, actor, reason) {
  const row = (snap.certificates || []).find((c) => c.id === certificateId || c.certificate_code === certificateId);
  if (!row) throw Object.assign(new Error("Certificate not found"), { status: 404 });
  if (!reason || !String(reason).trim()) throw Object.assign(new Error("Revocation reason is required"), { status: 400 });
  const ts = now();
  const fresh = {
    ...row,
    status: "revoked",
    revoked_at: ts,
    revoked_by: actor?.id || null,
    revocation_reason: String(reason).trim(),
    updated_at: ts,
    updated_by: actor?.id || null,
  };
  await store.upsert("certificates", fresh);
  const enrollment = (snap.enrollments || []).find((e) => e.id === row.enrollment_id);
  if (enrollment) {
    await store.upsert("enrollments", {
      ...enrollment,
      certificate_status: "revoked",
      updated_at: ts,
      updated_by: actor?.id || null,
    });
  }
  await writeAudit(store, "certificate.revoke", actor, { type: "certificate", id: row.id }, { reason });
  return fresh;
}

async function reissueCertificate(store, snap, certificateId, actor, req) {
  const old = (snap.certificates || []).find((c) => c.id === certificateId || c.certificate_code === certificateId);
  if (!old) throw Object.assign(new Error("Certificate not found"), { status: 404 });
  if (old.status !== "issued") throw Object.assign(new Error("Only an issued certificate can be reissued"), { status: 409 });
  const ts = now();
  const enrollment = (snap.enrollments || []).find((e) => e.id === old.enrollment_id);
  if (!enrollment) throw Object.assign(new Error("Enrollment not found"), { status: 404 });
  const student = aliveById(snap.students, enrollment.student_id);
  const program = aliveById(snap.programs, enrollment.program_id);
  const session = aliveById(snap.sessions, enrollment.session_id);
  if (!student || !program || !session) throw Object.assign(new Error("Student, program, or session missing"), { status: 400 });
  const template = resolveTemplate(snap, program?.certificate_template_id || old.template_id);
  const existingCodes = new Set((snap.certificates || []).map((c) => c.certificate_code));
  existingCodes.add(old.certificate_code);
  const code = generateCertificateCode(program, existingCodes);
  const base = publicSiteUrl(req, snap.settings);
  const verificationUrl = `${base}/verify/${code}`;
  const cert = {
    id: randomId("crt"),
    certificate_code: code,
    student_id: student.id,
    enrollment_id: enrollment.id,
    program_id: program.id,
    session_id: session?.id || enrollment.session_id,
    template_id: template.id,
    template_version: template.version || 1,
    student_name_snapshot: student.full_name,
    program_name_vi_snapshot: programName(program, "vi"),
    program_name_en_snapshot: programName(program, "en"),
    session_name_snapshot: session?.session_name || "",
    completion_date: old.completion_date,
    issue_date: ts.slice(0, 10),
    status: "generating",
    issued_by: actor?.id || null,
    issued_at: ts,
    pdf_url: "",
    verification_url: verificationUrl,
    qr_code_data: verificationUrl,
    revoked_at: null,
    revoked_by: null,
    revocation_reason: "",
    replaces_certificate_id: old.id,
    created_at: ts,
    updated_at: ts,
    created_by: actor?.id || null,
    updated_by: actor?.id || null,
  };
  const claim = await store.claimCertificate(cert, old.id);
  if (!claim.claimed) throw Object.assign(new Error("Certificate reissue conflict"), { status: 409 });
  const filename = `${cert.id}.pdf`;
  const pdfPath = path.join(CERT_DIR, filename);
  try {
    const pdf = await renderCertificatePdf(cert, template);
    fs.writeFileSync(pdfPath, pdf, { flag: "wx", mode: 0o600 });
  } catch (err) {
    Security.removeFile(pdfPath);
    await store.remove("certificates", cert.id).catch(() => {});
    throw err;
  }
  cert.pdf_url = filename;
  cert.status = "issued";
  try {
    await store.finalizeCertificate(cert, {
      ...enrollment,
      certificate_status: "issued",
      updated_at: ts,
      updated_by: actor?.id || null,
    }, old.id);
  } catch (err) {
    Security.removeFile(pdfPath);
    await store.remove("certificates", cert.id).catch(() => {});
    throw err;
  }
  await writeAudit(store, "certificate.reissue", actor, { type: "certificate", id: cert.id }, {
    replaces: old.id,
    code,
  });
  return cert;
}

function findByCode(snap, code) {
  const needle = String(code || "").trim().toUpperCase();
  return (snap.certificates || []).find((c) => String(c.certificate_code).toUpperCase() === needle) || null;
}

function pdfAbsolutePath(row) {
  if (!row?.pdf_url) return null;
  const root = path.resolve(CERT_DIR);
  const abs = Security.privateFilePath(CERT_DIR, row.pdf_url, "uploads/certificates");
  if (!abs) return null;
  if (abs !== root && !abs.startsWith(root + path.sep)) return null;
  return fs.existsSync(abs) ? abs : null;
}

module.exports = {
  CERT_DIR,
  DEFAULT_TEMPLATE,
  programName,
  resolveTemplate,
  renderCertificatePdf,
  publicCertificate,
  issueCertificate,
  revokeCertificate,
  reissueCertificate,
  findByCode,
  pdfAbsolutePath,
  writeAudit,
  programCode,
};
