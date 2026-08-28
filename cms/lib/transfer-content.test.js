const test = require("node:test");
const assert = require("node:assert/strict");
const { bankName, bankPhone, transferContent } = require("./transfer-content");

test("transfer content matches the student payment guide: class code, name, phone", () => {
  assert.equal(
    transferContent(
      { slug: "AS-2482026-01" },
      { fullName: "VSC Academy", phone: "0916 546 087" },
    ),
    "AS-2482026-01_VSC Academy_0916546087",
  );
  assert.equal(
    transferContent(
      { slug: "ai-starter-thang-8" },
      { full_name: "Nguyễn An", phone: "+84 901.234.567" },
    ),
    "ai-starter-thang-8_Nguyen An_84901234567",
  );
});

test("transfer content falls back to VSC when the class has no code", () => {
  assert.equal(bankName("Trần Đỗ"), "Tran Do");
  assert.equal(bankPhone("0901-234-567"), "0901234567");
  assert.equal(transferContent({}, { fullName: "Lan", phone: "0901234567" }), "VSC_Lan_0901234567");
});
