(() => {
  const toggle = document.querySelector(".menu-toggle"),
    mobile = document.querySelector(".mobile-nav"),
    form = document.querySelector("#contactForm"),
    success = document.querySelector("#contactSuccess"),
    params = new URLSearchParams(location.search);
  toggle?.addEventListener("click", () => {
    const open = mobile.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  const observer = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          observer.unobserve(e.target);
        }
      }),
    { threshold: 0.1 },
  );
  document.querySelectorAll(".reveal").forEach((e) => observer.observe(e));
  let sending = false;
  function validate() {
    let ok = true;
    form.querySelectorAll("[required]").forEach((el) => {
      el.classList.remove("field-error");
      el.closest("label")?.querySelector(".error-text")?.remove();
      if (!el.checkValidity()) {
        ok = false;
        el.classList.add("field-error");
        const m = document.createElement("span");
        m.className = "error-text";
        m.textContent =
          el.type === "email"
            ? "Vui lòng nhập email hợp lệ"
            : "Vui lòng hoàn tất thông tin này";
        el.closest("label")?.append(m);
      }
    });
    return ok;
  }
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (sending || !validate()) return;
    sending = true;
    const button = form.querySelector("[type=submit]");
    button.disabled = true;
    button.textContent = "ĐANG GỬI...";
    const data = Object.fromEntries(new FormData(form)),
      records = JSON.parse(
        localStorage.getItem("vsc_contact_requests") || "[]",
      ),
      contactId = `VSC-CT-${new Date().getFullYear()}-${String(records.length + 1).padStart(6, "0")}`;
    records.push({
      contactId,
      createdAt: new Date().toISOString(),
      fullName: data.fullName,
      phone: data.phone,
      email: data.email,
      topic: data.topic,
      message: data.message,
      sourcePage: location.pathname,
      utmSource: params.get("utm_source") || "",
      utmMedium: params.get("utm_medium") || "",
      utmCampaign: params.get("utm_campaign") || "",
      status: "new",
    });
    localStorage.setItem("vsc_contact_requests", JSON.stringify(records));
    setTimeout(() => {
      form.hidden = true;
      document.querySelector("#contactCode").textContent = contactId;
      success.hidden = false;
      success.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 700);
  });
})();
