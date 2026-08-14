const test = require("node:test");
const assert = require("node:assert/strict");
const { renderCertificatePdf, DEFAULT_TEMPLATE } = require("./certificate");

test("certificate PDF is a non-empty PDF buffer", async () => {
  const buf = await renderCertificatePdf(
    {
      certificate_code: "VSC-2026-AIS-TEST01",
      student_name_snapshot: "Nguyễn Thị Minh Châu",
      program_name_vi_snapshot: "AI Starter",
      program_name_en_snapshot: "AI Starter",
      completion_date: "2026-08-14",
      issue_date: "2026-08-14",
      verification_url: "https://vscacademy.vn/verify/VSC-2026-AIS-TEST01",
    },
    DEFAULT_TEMPLATE,
  );
  assert.ok(Buffer.isBuffer(buf));
  assert.ok(buf.length > 2000);
  assert.equal(buf.slice(0, 4).toString(), "%PDF");
});
