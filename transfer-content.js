(function (root) {
  function bankName(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/[^A-Za-z0-9 ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  function bankPhone(value) {
    return String(value || "").replace(/\D/g, "");
  }
  function transferContent(session, student) {
    const code = String(session?.slug || session?.sessionId || "VSC").trim();
    const name = bankName(student?.fullName || student?.full_name);
    const phone = bankPhone(student?.phone);
    return [code, name, phone].filter(Boolean).join("_");
  }
  const api = { bankName, bankPhone, transferContent };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.VSCTransfer = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
