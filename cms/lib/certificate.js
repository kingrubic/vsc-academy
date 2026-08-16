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

const ASSETS_DIR = path.join(__dirname, "..", "..", "assets");
const COMPLETION_PAIR_ID = "vsc-completion";
const NAVY = "#10213a";

function firstExisting(paths) {
  return paths.find((item) => item && fs.existsSync(item)) || "";
}

const FONT_REG = firstExisting([
  "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
  "/System/Library/Fonts/Supplemental/Arial.ttf",
  "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
]);
const FONT_BOLD = firstExisting([
  "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
  "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
  "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
  FONT_REG,
]);
const FONT_SERIF = firstExisting([
  "/usr/share/fonts/truetype/noto/NotoSerif-Regular.ttf",
  "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
  FONT_REG,
]);
const FONT_SERIF_BOLD = firstExisting([
  "/usr/share/fonts/truetype/noto/NotoSerif-Bold.ttf",
  "/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf",
  FONT_BOLD,
  FONT_SERIF,
]);

const DEFAULT_TEMPLATE = {
  id: "tpl-vsc-default",
  name: "VSC Academy Standard",
  program_id: null,
  language: "vi",
  pair_id: "",
  background_image: "",
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

const COMPLETION_TEMPLATE_VI = {
  ...DEFAULT_TEMPLATE,
  id: "tpl-vsc-completion-vi",
  name: "Chứng nhận hoàn thành khóa học (VI)",
  language: "vi",
  pair_id: COMPLETION_PAIR_ID,
  background_image: "certificates/vsc-completion-vi.png",
  title_vi: "CHỨNG NHẬN HOÀN THÀNH KHÓA HỌC",
  title_en: "CERTIFICATE OF COURSE COMPLETION",
  body_vi: "Chứng nhận này được trân trọng trao cho",
  body_en: "This certificate is proudly presented to",
  footer_vi: "Với tinh thần học tập nghiêm túc và hoàn thành đầy đủ nội dung của khóa học do VSC Academy tổ chức.",
  footer_en: "In recognition of dedicated learning, active participation, and successful completion of all course requirements organized by VSC Academy.",
};

const COMPLETION_TEMPLATE_EN = {
  ...COMPLETION_TEMPLATE_VI,
  id: "tpl-vsc-completion-en",
  name: "Certificate of Course Completion (EN)",
  language: "en",
  background_image: "certificates/vsc-completion-en.png",
};

const OFFICIAL_TEMPLATES = [DEFAULT_TEMPLATE, COMPLETION_TEMPLATE_VI, COMPLETION_TEMPLATE_EN];
const OFFICIAL_TEMPLATE_IDS = new Set(OFFICIAL_TEMPLATES.map((item) => item.id));

function officialTemplates() {
  return OFFICIAL_TEMPLATES.map((item) => ({ ...item }));
}

function isOfficialTemplateId(id) {
  return OFFICIAL_TEMPLATE_IDS.has(id);
}

function programName(row, locale) {
  const content = parseJson(locale === "en" ? row?.content_en : row?.content_vi, {});
  return content.shortName || content.name || row?.id || "";
}

function resolveTemplate(snap, templateId) {
  const row = (snap.certificate_templates || []).find((t) => t.id === templateId && t.status !== "archived");
  return row || (snap.certificate_templates || []).find((t) => t.id === "tpl-vsc-default") || DEFAULT_TEMPLATE;
}

function sortPair(templates) {
  return [...templates].sort((a, b) => {
    if (a.language === b.language) return 0;
    return a.language === "vi" ? -1 : 1;
  });
}

function resolveIssueTemplates(snap, templateIdOrPair) {
  const key = String(templateIdOrPair || "").trim();
  const rows = snap.certificate_templates || [];
  const byPair = rows.filter((t) => t.pair_id && t.pair_id === key && t.status !== "archived");
  if (byPair.length) return sortPair(byPair);
  const officialPair = officialTemplates().filter((t) => t.pair_id && t.pair_id === key);
  if (officialPair.length) return sortPair(officialPair);
  const officialOne = officialTemplates().find((t) => t.id === key);
  if (officialOne?.pair_id) {
    const siblings = rows.filter((t) => t.pair_id === officialOne.pair_id && t.status !== "archived");
    if (siblings.length) return sortPair(siblings);
    return sortPair(officialTemplates().filter((t) => t.pair_id === officialOne.pair_id));
  }
  const one = officialOne || resolveTemplate(snap, key || "tpl-vsc-default");
  if (one.pair_id) {
    const siblings = rows.filter((t) => t.pair_id === one.pair_id && t.status !== "archived");
    if (siblings.length) return sortPair(siblings);
    const fallback = officialTemplates().filter((t) => t.pair_id === one.pair_id);
    if (fallback.length) return sortPair(fallback);
  }
  return [one];
}

function resolveBackgroundPath(template) {
  const rel = String(template?.background_image || "").replace(/^\/+/, "");
  if (!rel || rel.includes("..") || path.isAbsolute(rel)) return null;
  const root = path.resolve(ASSETS_DIR);
  const abs = path.resolve(ASSETS_DIR, rel);
  if (abs !== root && !abs.startsWith(root + path.sep)) return null;
  return fs.existsSync(abs) ? abs : null;
}

function displayCertificateNo(cert) {
  const year = String(cert.issue_date || "").slice(0, 4) || String(new Date().getFullYear());
  const parts = String(cert.certificate_code || "").split("-");
  const tail = (parts[parts.length - 1] || "0000").replace(/[^A-Z0-9]/gi, "").slice(0, 4).padEnd(4, "0");
  return `VSCA-${tail}/${year}`;
}

function issueDateParts(iso) {
  const [year, month, day] = String(iso || "").slice(0, 10).split("-");
  return { year: year || "", month: month || "", day: day || "" };
}

function overlayDateText(iso, locale) {
  const { year, month, day } = issueDateParts(iso);
  if (!year) return "";
  return locale === "en"
    ? `Ho Chi Minh City, date ${day} month ${month} year ${year}`
    : `TP. Hồ Chí Minh, ngày ${day} tháng ${month} năm ${year}`;
}

function overlayNumberText(cert, locale) {
  const no = displayCertificateNo(cert);
  return locale === "en" ? `Certificate No.: ${no}` : `Số chứng nhận: ${no}`;
}

function pdfFilenameForLang(row, lang) {
  if (lang === "en") return row?.pdf_url_en || row?.pdf_url || "";
  return row?.pdf_url_vi || row?.pdf_url || "";
}

function registerFonts(doc) {
  const hasSans = FONT_REG && FONT_BOLD;
  if (hasSans) {
    doc.registerFont("VSC", FONT_REG);
    doc.registerFont("VSC-Bold", FONT_BOLD);
  }
  if (FONT_SERIF) doc.registerFont("VSC-Serif", FONT_SERIF);
  if (FONT_SERIF_BOLD) doc.registerFont("VSC-Serif-Bold", FONT_SERIF_BOLD);
  return {
    regular: hasSans ? "VSC" : "Helvetica",
    bold: hasSans ? "VSC-Bold" : "Helvetica-Bold",
    serif: FONT_SERIF ? "VSC-Serif" : hasSans ? "VSC" : "Times-Roman",
    serifBold: FONT_SERIF_BOLD ? "VSC-Serif-Bold" : hasSans ? "VSC-Bold" : "Times-Bold",
  };
}

async function ensureOfficialTemplates(store, snap) {
  const ts = now();
  const existing = new Map((snap.certificate_templates || []).map((row) => [row.id, row]));
  const items = [...(snap.certificate_templates || [])];
  for (const template of officialTemplates()) {
    if (existing.has(template.id)) continue;
    const row = { ...template, created_at: ts, updated_at: ts };
    await store.upsert("certificate_templates", row);
    items.push(row);
    existing.set(row.id, row);
  }
  return items;
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

function renderOverlayCertificatePdf(doc, cert, template, fonts) {
  const locale = template.language === "en" ? "en" : "vi";
  const background = resolveBackgroundPath(template);
  const W = doc.page.width;
  const H = doc.page.height;
  if (background) {
    doc.image(background, 0, 0, { width: W, height: H });
  } else {
    doc.rect(0, 0, W, H).fill("#ffffff");
  }

  const programNameText =
    locale === "en" ? cert.program_name_en_snapshot || cert.program_name_vi_snapshot : cert.program_name_vi_snapshot;
  const name = String(cert.student_name_snapshot || "").trim();
  const nameSize = fitNameSize(doc.font(fonts.serifBold), name, W * 0.62, 28, 14);
  doc.fillColor(NAVY).font(fonts.serifBold).fontSize(nameSize).text(name, W * 0.19, H * 0.438, {
    width: W * 0.62,
    align: "center",
    lineBreak: false,
  });

  const courseSize = fitNameSize(doc.font(fonts.serifBold), programNameText, W * 0.62, 16, 11);
  doc.fillColor(NAVY).font(fonts.serifBold).fontSize(courseSize).text(programNameText, W * 0.19, H * 0.558, {
    width: W * 0.62,
    align: "center",
    lineBreak: false,
  });

  const footerY = H * 0.889;
  doc.save();
  doc.fillColor("#ffffff");
  doc.rect(W * 0.058, H * 0.872, W * 0.34, 24).fill();
  doc.rect(W * 0.348, H * 0.872, W * 0.34, 24).fill();
  doc.restore();

  doc.fillColor(NAVY).font(fonts.regular).fontSize(7.2);
  doc.text(overlayNumberText(cert, locale), W * 0.068, footerY, {
    width: W * 0.325,
    align: "left",
    lineBreak: false,
  });
  doc.text(overlayDateText(cert.issue_date, locale), W * 0.348, footerY, {
    width: W * 0.34,
    align: "center",
    lineBreak: false,
  });
}

async function renderCertificatePdf(cert, template) {
  const locale = template.language === "en" ? "en" : "vi";
  const title = locale === "en" ? template.title_en || template.title_vi : template.title_vi;
  const body = locale === "en" ? template.body_en || template.body_vi : template.body_vi;
  const footer = locale === "en" ? template.footer_en || template.footer_vi : template.footer_vi;
  const programNameText =
    locale === "en" ? cert.program_name_en_snapshot || cert.program_name_vi_snapshot : cert.program_name_vi_snapshot;
  const overlay = Boolean(resolveBackgroundPath(template) || template.background_image);
  const qrPng = overlay
    ? null
    : await QRCode.toBuffer(cert.verification_url, {
        margin: 1,
        width: 320,
        color: { dark: "#10213a", light: "#ffffff" },
      });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = doc.page.width;
    const H = doc.page.height;
    const fonts = registerFonts(doc);
    const regular = fonts.regular;
    const bold = fonts.bold;

    if (overlay) {
      renderOverlayCertificatePdf(doc, cert, template, fonts);
      doc.end();
      return;
    }

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

async function writeCertificatePdfs(cert, templates) {
  const written = [];
  const files = { pdf_url: "", pdf_url_vi: "", pdf_url_en: "" };
  try {
    const pair = templates.length > 1;
    for (const template of templates) {
      const locale = template.language === "en" ? "en" : "vi";
      const filename = pair ? `${cert.id}-${locale}.pdf` : `${cert.id}.pdf`;
      const pdfPath = path.join(CERT_DIR, filename);
      const pdf = await renderCertificatePdf(cert, template);
      fs.writeFileSync(pdfPath, pdf, { flag: "wx", mode: 0o600 });
      written.push(pdfPath);
      if (locale === "en") files.pdf_url_en = filename;
      else files.pdf_url_vi = filename;
      if (!files.pdf_url) files.pdf_url = filename;
    }
    if (!files.pdf_url) files.pdf_url = files.pdf_url_vi || files.pdf_url_en;
    return files;
  } catch (err) {
    written.forEach((item) => Security.removeFile(item));
    throw err;
  }
}

function removeCertificatePdfs(files) {
  ["pdf_url", "pdf_url_vi", "pdf_url_en"].forEach((key) => {
    if (files?.[key]) Security.removeFile(path.join(CERT_DIR, files[key]));
  });
}

function selectedTemplateKey(req, program, fallback) {
  return (
    req?.body?.templateId ||
    program?.certificate_template_id ||
    fallback ||
    COMPLETION_PAIR_ID
  );
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
  const override = Boolean(req?.body?.override);
  if (!check.eligible && !override) {
    const err = Object.assign(new Error("Student is not eligible"), { status: 400 });
    err.reasons = check.reasons;
    throw err;
  }

  const templates = resolveIssueTemplates(snap, selectedTemplateKey(req, program));
  const template = templates[0];
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
    template_pair_id: template.pair_id || "",
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
    pdf_url_vi: "",
    pdf_url_en: "",
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
  let files = null;
  try {
    files = await writeCertificatePdfs(cert, templates);
  } catch (err) {
    await store.remove("certificates", cert.id).catch(() => {});
    throw err;
  }
  Object.assign(cert, files, { status: "issued" });
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
    removeCertificatePdfs(files);
    await store.remove("certificates", cert.id).catch(() => {});
    throw err;
  }
  await writeAudit(store, "certificate.issue", actor, { type: "certificate", id: cert.id }, {
    code,
    override,
    reasons: check.reasons,
  });
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
  const templates = resolveIssueTemplates(
    snap,
    selectedTemplateKey(req, program, old.template_pair_id || old.template_id),
  );
  const template = templates[0];
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
    template_pair_id: template.pair_id || "",
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
    pdf_url_vi: "",
    pdf_url_en: "",
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
  let files = null;
  try {
    files = await writeCertificatePdfs(cert, templates);
  } catch (err) {
    await store.remove("certificates", cert.id).catch(() => {});
    throw err;
  }
  Object.assign(cert, files, { status: "issued" });
  try {
    await store.finalizeCertificate(cert, {
      ...enrollment,
      certificate_status: "issued",
      updated_at: ts,
      updated_by: actor?.id || null,
    }, old.id);
  } catch (err) {
    removeCertificatePdfs(files);
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

function pdfAbsolutePath(row, lang) {
  const filename = pdfFilenameForLang(row, lang === "en" ? "en" : "vi");
  if (!filename) return null;
  const root = path.resolve(CERT_DIR);
  const abs = Security.privateFilePath(CERT_DIR, filename, "uploads/certificates");
  if (!abs) return null;
  if (abs !== root && !abs.startsWith(root + path.sep)) return null;
  return fs.existsSync(abs) ? abs : null;
}

function pdfDownloadName(row, lang) {
  const code = String(row?.certificate_code || "certificate").replace(/[^\w.-]+/g, "-");
  const suffix = row?.pdf_url_en && row?.pdf_url_vi ? `-${lang === "en" ? "en" : "vi"}` : "";
  return `${code}${suffix}.pdf`;
}

module.exports = {
  CERT_DIR,
  DEFAULT_TEMPLATE,
  COMPLETION_TEMPLATE_VI,
  COMPLETION_TEMPLATE_EN,
  COMPLETION_PAIR_ID,
  officialTemplates,
  isOfficialTemplateId,
  ensureOfficialTemplates,
  programName,
  resolveTemplate,
  resolveIssueTemplates,
  displayCertificateNo,
  pdfFilenameForLang,
  renderCertificatePdf,
  publicCertificate,
  issueCertificate,
  revokeCertificate,
  reissueCertificate,
  findByCode,
  pdfAbsolutePath,
  pdfDownloadName,
  writeAudit,
  programCode,
};
