(() => {
  const EN = location.pathname.startsWith("/en/verify");
  const t = EN
    ? {
        title: "VERIFY CERTIFICATE",
        lead: "Enter a Certificate ID issued by VSC Academy.",
        cta: "VERIFY →",
        valid: "CERTIFICATE VALID",
        missing: "CERTIFICATE NOT FOUND",
        missingLead: "This Certificate ID cannot be verified.",
        revoked: "CERTIFICATE REVOKED",
        issuer: "Issuer",
        completion: "Completion date",
        issued: "Issue date",
        status: "Status",
        student: "Student",
        program: "Programme",
      }
    : {
        title: "XÁC MINH CHỨNG NHẬN",
        lead: "Nhập Certificate ID để xác minh chứng nhận do VSC Academy cấp.",
        cta: "XÁC MINH →",
        valid: "CHỨNG NHẬN HỢP LỆ",
        missing: "CHỨNG NHẬN KHÔNG TỒN TẠI",
        missingLead: "Không thể xác minh Certificate ID này.",
        revoked: "CHỨNG NHẬN ĐÃ BỊ THU HỒI",
        issuer: "Đơn vị cấp",
        completion: "Ngày hoàn thành",
        issued: "Ngày cấp",
        status: "Trạng thái",
        student: "Học viên",
        program: "Chương trình",
      };

  document.documentElement.lang = EN ? "en" : "vi";
  document.title = `${t.title} | VSC Academy`;
  document.getElementById("headline").textContent = t.title;
  document.getElementById("lead").textContent = t.lead;
  document.getElementById("cta").textContent = t.cta;
  document.getElementById("lang-link").href = EN ? "/verify" + location.search : "/en/verify" + location.search;
  document.getElementById("lang-link").textContent = EN ? "VI" : "EN";

  function fmt(d) {
    if (!d) return "—";
    const [y, m, day] = String(d).slice(0, 10).split("-");
    return `${day}/${m}/${y}`;
  }

  async function verify(code) {
    const result = document.getElementById("result");
    result.innerHTML = "";
    const res = await fetch(`/api/public/certificates/${encodeURIComponent(code)}`);
    const data = await res.json();
    if (data.valid) {
      const program = EN ? data.programNameEn || data.programNameVi : data.programNameVi;
      result.innerHTML = `<div class="card">
        <p class="ok">✓ ${t.valid}</p>
        <p class="meta"><b>${t.student}:</b> ${data.studentName}</p>
        <p class="meta"><b>${t.program}:</b> ${program}</p>
        <p class="meta"><b>${t.completion}:</b> ${fmt(data.completionDate)}</p>
        <p class="meta"><b>${t.issued}:</b> ${fmt(data.issueDate)}</p>
        <p class="meta"><b>Certificate ID:</b> ${data.certificateCode}</p>
        <p class="meta"><b>${t.issuer}:</b> VSC Academy</p>
        <p class="meta"><b>${t.status}:</b> VALID</p>
      </div>`;
      return;
    }
    if (data.status === "revoked") {
      result.innerHTML = `<div class="card"><p class="bad">${t.revoked}</p><p class="meta">Status: REVOKED</p><p class="meta">${data.certificateCode || code}</p></div>`;
      return;
    }
    result.innerHTML = `<div class="card"><p class="bad">${t.missing}</p><p class="meta">${t.missingLead}</p></div>`;
  }

  document.getElementById("form").addEventListener("submit", (e) => {
    e.preventDefault();
    const code = document.getElementById("code").value.trim();
    const base = EN ? "/en/verify/" : "/verify/";
    history.pushState({}, "", base + encodeURIComponent(code));
    verify(code);
  });

  const fromPath = location.pathname.replace(/^\/en\/verify\/?/, "").replace(/^\/verify\/?/, "");
  const q = new URLSearchParams(location.search).get("code");
  const code = decodeURIComponent(fromPath || q || "").replace(/\/$/, "");
  if (code) {
    document.getElementById("code").value = code;
    verify(code);
  }
})();
