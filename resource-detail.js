(() => {
  const I=window.VSC_I18N||{locale:"vi",root:""}; const T=window.VSC_T||window.VSC_UI?.vi||{};
  const resourceHref=slug=>I.href?I.href("resource-detail",`?resource=${slug}`):`/tai-lieu?resource=${slug}`;
  const rows=(window.VSC_RESOURCES||[]).filter(r=>r.status==="published"), labels=window.VSC_RESOURCE_LABELS||{};
  const slug=new URLSearchParams(location.search).get("resource"), item=rows.find(r=>r.slug===slug)||rows[0];
  const $=s=>document.querySelector(s), fmt=v=>new Intl.DateTimeFormat(T.dateLocale||"vi-VN").format(new Date(v));
  document.title=`${item.title} | VSC Academy`;
  $("#detailType").textContent=labels[item.type]||item.type; $("#detailTitle").textContent=item.title;
  $("#detailExcerpt").textContent=item.excerpt; $("#detailAuthor").textContent=item.author;
  $("#detailDate").textContent=`${T.updated||"Cập nhật"} ${fmt(item.updatedAt)}`; $("#detailLength").textContent=item.pageCount?`${item.pageCount} ${T.pages||"trang"}`: (T.readingTime?T.readingTime(item.readingTime):`${item.readingTime} phút đọc`);
  $("#detailCover").className=`resource-cover resource-detail-cover cover-${item.category} type-${item.type}`;
  $("#detailCover").innerHTML=`<span>${labels[item.type]||item.type}</span><i></i><b>VSC<br>KNOWLEDGE</b>`;
  $("#detailIntro").textContent=item.excerpt+(I.locale==="en"?" The resource is structured to move from understanding the idea to choosing a practical next step in a real context.":" Tài liệu được cấu trúc để người đọc có thể chuyển từ việc hiểu khái niệm sang xác định bước ứng dụng phù hợp trong bối cảnh thực tế.");
  $("#detailCta").textContent=item.downloadable?(item.gated?(I.locale==="en"?"REQUEST THIS RESOURCE →":"NHẬN TÀI LIỆU →"):(I.locale==="en"?"DOWNLOAD →":"TẢI TÀI LIỆU →")):(I.locale==="en"?"VIEW RESOURCE →":"XEM TÀI LIỆU →");
  $("#relatedResources").innerHTML=rows.filter(r=>r.id!==item.id&&(r.category===item.category||r.tags.some(tag=>item.tags.includes(tag)))).slice(0,3).map(r=>`<a class="resource-card" href="${resourceHref(r.slug)}"><div class="resource-copy"><small>${labels[r.type]||r.type}</small><h3>${r.title}</h3><p>${r.excerpt}</p><span class="resource-link">${T.viewResource||"Xem tài liệu"} <b>→</b></span></div></a>`).join("");
  document.querySelector(".menu-toggle")?.addEventListener("click",e=>{const n=document.querySelector(".mobile-nav"),o=n.classList.toggle("open");e.currentTarget.setAttribute("aria-expanded",String(o))});
})();
