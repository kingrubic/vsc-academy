(() => {
  const I = window.VSC_I18N || { locale: "vi", root: "" };
  const T = window.VSC_T || window.VSC_UI?.vi || {};
  const resourceHref = slug => I.href ? I.href("resource-detail", `?resource=${slug}`) : `tai-lieu.html?resource=${slug}`;
  const resources = (window.VSC_RESOURCES || []).filter(r => r.status === "published" && (I.locale !== "en" || r.titleEn || r.titleVi !== r.title));
  const labels = window.VSC_RESOURCE_LABELS || {};
  const grid = document.querySelector("#resourceGrid");
  const featured = document.querySelector("#featuredResources");
  const search = document.querySelector("#resourceSearch");
  const sort = document.querySelector("#resourceSort");
  const count = document.querySelector("#resourceCount");
  const empty = document.querySelector("#resourceEmpty");
  let topic = "all", type = "all";

  const date = value => new Intl.DateTimeFormat(T.dateLocale || "vi-VN", { month: "2-digit", year: "numeric" }).format(new Date(value));
  const artClass = r => `resource-cover cover-${r.category} type-${r.type}`;
  const card = (r, featuredCard = false) => `
    <article class="resource-card${featuredCard ? " is-featured" : ""}" data-resource-id="${r.id}">
      <a class="${artClass(r)}" href="${resourceHref(r.slug)}" aria-label="${T.viewResource || "Xem"} ${r.title}">
        <span>${labels[r.type] || r.type}</span><i></i><b>VSC<br>KNOWLEDGE</b>
      </a>
      <div class="resource-copy">
        <div class="resource-kicker"><span>${labels[r.type] || r.type}</span><span>${r.tags[0]}</span></div>
        <h3><a href="${resourceHref(r.slug)}">${r.title}</a></h3>
        <p>${r.excerpt}</p>
        <div class="resource-meta"><span>${r.pageCount ? `${r.pageCount} ${T.pages || "trang"}` : T.readingTime ? T.readingTime(r.readingTime) : `${r.readingTime} phút đọc`}</span><span>${T.updated || "Cập nhật"} ${date(r.updatedAt)}</span></div>
        <div class="resource-tags">${r.tags.slice(0,2).map(t => `<small>${t}</small>`).join("")}</div>
        <a class="resource-link" href="${resourceHref(r.slug)}">${r.downloadable ? (T.viewResource || "Xem tài liệu") : (T.readResource || "Đọc tài liệu")} <b>→</b></a>
      </div>
    </article>`;

  function renderFeatured() {
    featured.innerHTML = resources.filter(r => r.featured).slice(0, 3).map((r, i) => card(r, i === 0)).join("");
  }
  function render() {
    const q = (search.value || "").trim().toLocaleLowerCase("vi");
    let rows = resources.filter(r => {
      const text = [r.title, r.excerpt, ...r.tags].join(" ").toLocaleLowerCase("vi");
      return (!q || text.includes(q)) && (topic === "all" || r.category === topic) && (type === "all" || r.type === type);
    });
    if (sort.value === "popular") rows.sort((a,b) => b.viewCount - a.viewCount);
    else if (sort.value === "featured") rows.sort((a,b) => Number(b.featured) - Number(a.featured) || new Date(b.updatedAt) - new Date(a.updatedAt));
    else rows.sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    grid.innerHTML = rows.map(r => card(r)).join("");
    count.textContent = `${String(rows.length).padStart(2,"0")} ${(T.resources || "TÀI LIỆU").toUpperCase()}`;
    empty.hidden = rows.length > 0;
  }
  document.querySelectorAll("[data-filter-group]").forEach(group => group.addEventListener("click", e => {
    const btn = e.target.closest("button[data-value]"); if (!btn) return;
    group.querySelectorAll("button").forEach(x => x.classList.toggle("active", x === btn));
    if (group.dataset.filterGroup === "topic") topic = btn.dataset.value; else type = btn.dataset.value;
    render();
  }));
  search.addEventListener("input", render); sort.addEventListener("change", render);
  document.querySelector("#resetResources")?.addEventListener("click", () => {
    search.value = ""; topic = type = "all";
    document.querySelectorAll("[data-filter-group]").forEach(g => g.querySelectorAll("button").forEach((b,i) => b.classList.toggle("active", i===0)));
    render();
  });
  document.querySelector(".menu-toggle")?.addEventListener("click", e => {
    const nav = document.querySelector(".mobile-nav"), open = nav.classList.toggle("open");
    e.currentTarget.setAttribute("aria-expanded", String(open));
  });
  const observer = new IntersectionObserver(es => es.forEach(e => { if(e.isIntersecting){ e.target.classList.add("visible"); observer.unobserve(e.target); } }), { threshold:.08 });
  document.querySelectorAll(".reveal").forEach(e => observer.observe(e));
  renderFeatured(); render();
})();
