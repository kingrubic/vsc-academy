(() => {
  const toggle = document.querySelector(".menu-toggle");
  const mobile = document.querySelector(".mobile-nav");
  toggle?.addEventListener("click", () => {
    if (!mobile) return;
    const open = mobile.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  mobile?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mobile.classList.remove("open");
      toggle?.setAttribute("aria-expanded", "false");
    });
  });
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      }),
    { threshold: 0.1 },
  );
  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
})();
