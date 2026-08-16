const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const {
  renderCertificatePdf,
  DEFAULT_TEMPLATE,
  COMPLETION_TEMPLATE_VI,
  COMPLETION_TEMPLATE_EN,
  displayCertificateNo,
  displayStudentName,
  stripVietnameseDiacritics,
  overlaySerialParts,
  overlayNumberText,
  overlayDateText,
  pdfFilenameForLang,
  resolveIssueTemplates,
} = require("./certificate");

const sample = {
  certificate_code: "VSC-2026-AIS-TEST01",
  student_name_snapshot: "Nguyễn Thị Minh Châu",
  program_name_vi_snapshot: "AI Starter",
  program_name_en_snapshot: "AI Starter",
  completion_date: "2026-08-14",
  issue_date: "2026-08-14",
  verification_url: "https://vscacademy.vn/verify/VSC-2026-AIS-TEST01",
};

test("certificate PDF is a non-empty PDF buffer", async () => {
  const buf = await renderCertificatePdf(sample, DEFAULT_TEMPLATE);
  assert.ok(Buffer.isBuffer(buf));
  assert.ok(buf.length > 2000);
  assert.equal(buf.slice(0, 4).toString(), "%PDF");
});

test("overlay templates render Vietnamese and English PDFs", async () => {
  const font = path.join(__dirname, "..", "..", "assets", "fonts", "great-vibes", "GreatVibes-Regular.ttf");
  assert.equal(fs.existsSync(font), true);
  const vi = await renderCertificatePdf(sample, COMPLETION_TEMPLATE_VI);
  const en = await renderCertificatePdf(sample, COMPLETION_TEMPLATE_EN);
  assert.equal(vi.slice(0, 4).toString(), "%PDF");
  assert.equal(en.slice(0, 4).toString(), "%PDF");
  assert.ok(vi.length > 8000);
  assert.ok(en.length > 8000);
});

test("English certificates drop Vietnamese diacritics from the student name", () => {
  assert.equal(stripVietnameseDiacritics("Nguyễn Thùy Phương Khuyên"), "Nguyen Thuy Phuong Khuyen");
  assert.equal(stripVietnameseDiacritics("Đặng Trần Anh Đào"), "Dang Tran Anh Dao");
  assert.equal(displayStudentName(sample, "vi"), "Nguyễn Thị Minh Châu");
  assert.equal(displayStudentName(sample, "en"), "Nguyen Thi Minh Chau");
});

test("display number and pair resolution follow the completion templates", () => {
  assert.equal(displayCertificateNo(sample), "VSCA-TEST/2026");
  assert.deepEqual(overlaySerialParts(sample), { serial: "TEST", year2: "26" });
  assert.equal(overlayNumberText(sample, "vi"), "Số chứng nhận: VSCA-TEST/2026");
  assert.equal(overlayNumberText(sample, "en"), "Certificate No.: VSCA-TEST/2026");
  assert.equal(overlayDateText(sample.issue_date, "vi"), "TP. Hồ Chí Minh, ngày 14 tháng 08 năm 2026");
  assert.equal(overlayDateText(sample.issue_date, "en"), "Ho Chi Minh City, date 14 month 08 year 2026");
  assert.equal(pdfFilenameForLang({ pdf_url: "a.pdf", pdf_url_vi: "a-vi.pdf", pdf_url_en: "a-en.pdf" }, "en"), "a-en.pdf");
  assert.equal(pdfFilenameForLang({ pdf_url: "a.pdf" }, "vi"), "a.pdf");
  const pair = resolveIssueTemplates({ certificate_templates: [] }, "vsc-completion");
  assert.equal(pair.length, 2);
  assert.equal(pair[0].language, "vi");
  assert.equal(pair[1].language, "en");
});

test("learner portal exposes bilingual certificate view and download", () => {
  const ui = fs.readFileSync(path.join(__dirname, "..", "..", "portal", "portal.js"), "utf8");
  assert.match(ui, /downloadPdfVi/);
  assert.match(ui, /downloadPdfEn/);
  assert.match(ui, /lang=vi&download=1/);
  assert.match(ui, /lang=en&download=1/);
});
