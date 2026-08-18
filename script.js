const header = document.querySelector('#header');
const I = window.VSC_I18N || { locale: 'vi', root: '' };
const T = window.VSC_T || window.VSC_UI?.vi || {};
const siteRoot = I.root || '';
const toggle = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('.mobile-nav');

const updateHeader = () => header?.classList.toggle('scrolled', window.scrollY > 24);
updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

toggle?.addEventListener('click', () => {
  if (!mobileNav) return;
  const open = mobileNav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
  const labels = window.VSC_T || {};
  toggle.setAttribute('aria-label', open ? (labels.closeMenu || 'Đóng menu') : (labels.openMenu || 'Mở menu'));
});

mobileNav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  mobileNav.classList.remove('open');
  toggle?.setAttribute('aria-expanded', 'false');
}));

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px' });

document.querySelectorAll('.reveal').forEach((element, index) => {
  element.style.transitionDelay = `${Math.min(index % 4, 3) * 70}ms`;
  observer.observe(element);
});

const learningPath = document.querySelector('.learning-path');
if (learningPath) {
  const pathObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-active');
        pathObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -8%' });
  pathObserver.observe(learningPath);
}

const courseSchedules = (window.VSC_SCHEDULES || []).map(item => ({
  ...item,
  category:item.category || item.type,
  mode:item.mode || item.format,
  type:item.type?.includes('·') ? item.type : `${item.type === 'workshop' ? 'WORKSHOP' : (T.course || 'KHÓA HỌC').toUpperCase()} · ${(item.format || '').toUpperCase()}`,
  time:item.time || `${item.startTime} — ${item.endTime}`,
  format:item.formatLabel || (item.format?.charAt(0).toUpperCase() + item.format?.slice(1)),
  fee:item.fee || item.price,
  seats:item.seats || item.classSizeLabel || (item.remainingSeats ? `${String(item.remainingSeats).padStart(2,'0')} / ${item.capacity} ${T.remaining || 'chỗ còn lại'}` : item.status === 'full' ? (T.fullSeats || 'Đã đủ chỗ') : (T.receiving || 'Đang nhận đăng ký')),
  registrationUrl: item.registrationUrl ? `${siteRoot}${item.registrationUrl}` : item.registrationUrl
}));

const calendarDays = document.querySelector('#calendarDays');

// Keep the course diagnostic focused: one journey state open at a time.
const finderPaths = document.querySelectorAll('.finder-path');
finderPaths.forEach(path => path.addEventListener('toggle', () => {
  if (!path.open) return;
  finderPaths.forEach(other => {
    if (other !== path) other.open = false;
  });
}));

const methodSection = document.querySelector('.vsc-method');
if (methodSection) {
  const methodSteps = [...methodSection.querySelectorAll('.method-progression article')];
  const methodRatios = [...methodSection.querySelectorAll('.method-ratio > span')];
  const methodScale = [...methodSection.querySelectorAll('.method-scale > i')];
  const progression = methodSection.querySelector('.method-progression');
  const hoverLine = document.createElement('span');
  hoverLine.className = 'method-hover-line';
  hoverLine.setAttribute('aria-hidden', 'true');
  progression?.appendChild(hoverLine);

  const setMethodStep = index => {
    methodSection.style.setProperty('--method-step', index + 1);
    methodSection.classList.add('has-method-hover');
    [...methodSteps, ...methodRatios, ...methodScale].forEach((item, itemIndex) => {
      item.classList.toggle('is-method-active', itemIndex % 4 === index);
    });
  };
  const clearMethodStep = () => {
    methodSection.classList.remove('has-method-hover');
    [...methodSteps, ...methodRatios, ...methodScale].forEach(item => item.classList.remove('is-method-active'));
  };

  methodSteps.forEach((item, index) => {
    item.tabIndex = 0;
    item.addEventListener('mouseenter', () => setMethodStep(index));
    item.addEventListener('focus', () => setMethodStep(index));
    item.addEventListener('mouseleave', clearMethodStep);
    item.addEventListener('blur', clearMethodStep);
  });
  methodRatios.forEach((item, index) => {
    item.tabIndex = 0;
    item.addEventListener('mouseenter', () => setMethodStep(index));
    item.addEventListener('focus', () => setMethodStep(index));
    item.addEventListener('mouseleave', clearMethodStep);
    item.addEventListener('blur', clearMethodStep);
  });

  const methodObserver = new IntersectionObserver(([entry], observer) => {
    if (!entry.isIntersecting) return;
    methodSection.classList.add('is-active');
    observer.disconnect();
  }, { threshold: 0.24 });
  methodObserver.observe(methodSection);
}

if (calendarDays) {
  const monthLabel = document.querySelector('#calendarMonth');
  const scheduleContent = document.querySelector('#scheduleContent');
  const pad = value => String(value).padStart(2, '0');
  const today = new Date();
  let viewDate = new Date(2026, 7, 1);
  let activeFilter = 'all';

  const showSchedule = schedule => {
    const [year, month, day] = schedule.date.split('-');
    scheduleContent.innerHTML = `<p class="schedule-date">${day} · ${month} · ${year}</p><span class="schedule-type">${schedule.type}</span><h3>${schedule.title}</h3><p class="schedule-description">${schedule.description}</p><dl class="schedule-meta"><div><dt>${T.time || 'Thời gian'}</dt><dd>${schedule.time}</dd></div><div><dt>${T.format || 'Hình thức'}</dt><dd>${schedule.format}</dd></div><div><dt>${T.venue || 'Địa điểm'}</dt><dd>${schedule.location}</dd></div><div><dt>${T.tuition || 'Học phí'}</dt><dd>${schedule.fee}</dd></div></dl><p class="schedule-seats">${schedule.seats}</p><a class="button schedule-register" href="${schedule.registrationUrl}">${schedule.status === 'full' ? (T.waitlistContact || 'Liên hệ danh sách chờ') : (T.registerThisClass || 'Đăng ký lớp này')} <span>→</span></a>`;
  };

  const matchesFilter = schedule => activeFilter === 'all' || schedule.category === activeFilter || schedule.mode === activeFilter;

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
    const totalDays = new Date(year, month + 1, 0).getDate();
    monthLabel.textContent = T.monthTitle ? T.monthTitle(month + 1, year) : `THÁNG ${pad(month + 1)} · ${year}`;
    calendarDays.innerHTML = '';

    for (let i = 0; i < firstWeekday; i += 1) {
      const spacer = document.createElement('span');
      spacer.className = 'calendar-day is-empty';
      calendarDays.appendChild(spacer);
    }

    for (let day = 1; day <= totalDays; day += 1) {
      const dateKey = `${year}-${pad(month + 1)}-${pad(day)}`;
      const schedule = courseSchedules.find(item => item.date === dateKey && matchesFilter(item));
      const cell = document.createElement(schedule ? 'button' : 'span');
      cell.className = `calendar-day${schedule ? ' has-course' : ''}${schedule?.status === 'full' ? ' is-full' : ''}`;
      cell.setAttribute('role', 'gridcell');
      cell.innerHTML = `<b>${pad(day)}</b>${schedule ? `<small>${schedule.title}</small><i></i>` : ''}`;
      if (schedule) {
        cell.type = 'button';
        cell.setAttribute('aria-label', `${day} tháng ${month + 1}: ${schedule.title}`);
        cell.addEventListener('click', () => {
          document.querySelectorAll('.calendar-day.is-selected').forEach(item => item.classList.remove('is-selected'));
          cell.classList.add('is-selected');
          showSchedule(schedule);
        });
      }
      calendarDays.appendChild(cell);
    }

    const firstCourse = courseSchedules.find(item => item.date.startsWith(`${year}-${pad(month + 1)}`) && matchesFilter(item));
    if (firstCourse) {
      const firstCell = calendarDays.querySelector('.has-course');
      if (firstCell) firstCell.classList.add('is-selected');
      showSchedule(firstCourse);
    }
  };

  document.querySelector('#calendarPrev').addEventListener('click', () => { viewDate.setMonth(viewDate.getMonth() - 1); renderCalendar(); });
  document.querySelector('#calendarNext').addEventListener('click', () => { viewDate.setMonth(viewDate.getMonth() + 1); renderCalendar(); });
  document.querySelector('#calendarToday').addEventListener('click', () => { viewDate = new Date(today.getFullYear(), today.getMonth(), 1); renderCalendar(); });
  document.querySelectorAll('.calendar-filters button').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.calendar-filters button').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    activeFilter = button.dataset.filter;
    renderCalendar();
  }));
  renderCalendar();
}

const heroSlider = document.querySelector('.hero-course-slider');
if (heroSlider) {
  const slides = [...heroSlider.querySelectorAll('.hero-course-slide')];
  const dots = [...heroSlider.querySelectorAll('.hero-banner-dots button')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = 0;
  let timer = null;

  const showHeroSlide = index => {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      const active = slideIndex === current;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', String(!active));
    });
    dots.forEach((dot, dotIndex) => {
      const active = dotIndex === current;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-selected', String(active));
    });
  };
  const stopAuto = () => {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  };
  const startAuto = () => {
    stopAuto();
    if (reduceMotion || slides.length < 2) return;
    timer = window.setInterval(() => showHeroSlide(current + 1), 5000);
  };
  const selectHeroSlide = index => {
    showHeroSlide(index);
    startAuto();
  };
  showHeroSlide(0);
  startAuto();
  dots.forEach((dot, index) => dot.addEventListener('click', () => selectHeroSlide(index)));
  heroSlider.querySelector('.hero-banner-prev').addEventListener('click', () => selectHeroSlide(current - 1));
  heroSlider.querySelector('.hero-banner-next').addEventListener('click', () => selectHeroSlide(current + 1));
  heroSlider.addEventListener('mouseenter', stopAuto);
  heroSlider.addEventListener('mouseleave', startAuto);
}
