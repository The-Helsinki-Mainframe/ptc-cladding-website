'use strict';

/* ═══════════════════════════════════════════ NAV */
const nav        = document.getElementById('nav');
const navBurger  = document.getElementById('navBurger');
const navMobile  = document.getElementById('navMobile');

window.addEventListener('scroll', () => {
  nav.style.background = window.scrollY > 40
    ? 'rgba(10,10,10,0.75)'
    : 'rgba(10,10,10,0.45)';
}, { passive: true });

navBurger.addEventListener('click', () => {
  navMobile.classList.toggle('open');
});

function closeMobileNav() {
  navMobile.classList.remove('open');
}

document.querySelectorAll('.nav__mobile-link').forEach(link => {
  link.addEventListener('click', closeMobileNav);
});

/* ═══════════════════════════════════════════ SCROLL ANIMATIONS */
const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.fade-up').forEach(el => fadeObserver.observe(el));

/* ═══════════════════════════════════════════ COUNTER ANIMATION */
function animateCounter(el, target, hasPlus, duration = 3500) {
  const isLarge = target > 9999;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 4); // ease-out quart
    const current  = Math.floor(eased * target);

    el.textContent = isLarge ? current.toLocaleString('en-GB') : current;
    if (hasPlus && progress >= 1) el.textContent += '+';

    if (progress < 1) requestAnimationFrame(step);
    else {
      el.textContent = isLarge ? target.toLocaleString('en-GB') : String(target);
      if (hasPlus) el.textContent += '+';
    }
  }
  requestAnimationFrame(step);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el     = entry.target;
      const target = parseInt(el.dataset.count, 10);
      const hasPlus = el.dataset.plus === 'true';
      animateCounter(el, target, hasPlus);
      counterObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('[data-count]').forEach(el => counterObserver.observe(el));

/* ═══════════════════════════════════════════ CALENDAR BOOKING */
// Seeded PRNG for deterministic slot generation per date
function seededRNG(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}
function strToSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const ALL_TIMES = ['09:00','09:30','10:00','10:30','11:00','11:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30'];
const MONTHS    = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getSlotsForDate(isoDate) {
  const rng  = seededRNG(strToSeed(isoDate));
  const pool = [...ALL_TIMES];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 4).sort();
}

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Calendar state
let calYear    = 0;
let calMonth   = 0;
let selectedDate = null;  // ISO string
let selectedTime = null;

function initCalMonth() {
  const now = new Date();
  calYear  = now.getFullYear();
  calMonth = now.getMonth();
}

function renderCalendar() {
  const label   = document.getElementById('calMonthLabel');
  const grid    = document.getElementById('calDaysGrid');
  const today   = new Date();
  today.setHours(0,0,0,0);

  label.textContent = `${MONTHS[calMonth]} ${calYear}`;
  grid.innerHTML    = '';

  // First day of month (0=Sun)
  const firstDow = new Date(calYear, calMonth, 1).getDay();
  // Convert to Mon-based: Mon=0 … Sun=6
  const startOffset = (firstDow + 6) % 7;
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  // Empty cells before first day
  for (let i = 0; i < startOffset; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-day cal-day--empty';
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date    = new Date(calYear, calMonth, d);
    const isoDate = toISO(date);
    const dow     = date.getDay(); // 0=Sun, 6=Sat
    const isWeekend  = dow === 0 || dow === 6;
    const isPast     = date < today;
    const isToday    = date.getTime() === today.getTime();
    const isSelected = isoDate === selectedDate;

    const cell = document.createElement('div');
    cell.textContent = d;

    let cls = 'cal-day';
    if (isWeekend)      cls += ' cal-day--weekend';
    else if (isPast)    cls += ' cal-day--disabled';
    if (isToday)        cls += ' cal-day--today';
    if (isSelected)     cls += ' cal-day--selected';
    cell.className = cls;

    if (!isWeekend && !isPast) {
      cell.addEventListener('click', () => selectCalDate(isoDate, date));
    }

    grid.appendChild(cell);
  }
}

function selectCalDate(isoDate, dateObj) {
  selectedDate = isoDate;
  selectedTime = null;
  updateSelectedSlotDisplay();
  renderCalendar();
  renderTimeSlots(isoDate, dateObj);
}

function renderTimeSlots(isoDate, dateObj) {
  const titleEl  = document.getElementById('calSlotsTitle');
  const listEl   = document.getElementById('calSlotsList');
  const slots    = getSlotsForDate(isoDate);
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const monNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  titleEl.textContent = `${dayNames[dateObj.getDay()]} ${dateObj.getDate()} ${monNames[dateObj.getMonth()]}`;
  listEl.innerHTML    = '';

  slots.forEach(time => {
    const pill = document.createElement('button');
    pill.className   = 'cal-time-pill' + (time === selectedTime ? ' selected' : '');
    pill.textContent = time;
    pill.addEventListener('click', () => {
      selectedTime = time;
      document.querySelectorAll('.cal-time-pill').forEach(p => p.classList.remove('selected'));
      pill.classList.add('selected');
      updateSelectedSlotDisplay();
    });
    listEl.appendChild(pill);
  });
}

function updateSelectedSlotDisplay() {
  const el = document.getElementById('calSelectedSlot');
  if (selectedDate && selectedTime) {
    const d = new Date(selectedDate + 'T00:00:00');
    const dn = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const mn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    el.textContent = `📅 ${dn[d.getDay()]} ${d.getDate()} ${mn[d.getMonth()]} at ${selectedTime}`;
    el.classList.add('active');
  } else if (selectedDate) {
    el.textContent = 'Choose a time on the right →';
    el.classList.remove('active');
  } else {
    el.textContent = 'No date & time selected yet';
    el.classList.remove('active');
  }
}

document.getElementById('calPrev').addEventListener('click', () => {
  calMonth--;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
});

document.getElementById('calNext').addEventListener('click', () => {
  calMonth++;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
});

/* ═══════════════════════════════════════════ MODALS */
function openModal(id) {
  const overlay = document.getElementById(id);
  overlay.style.display = 'flex';
  requestAnimationFrame(() => overlay.classList.add('open', 'visible'));
  document.body.style.overflow = 'hidden';

  if (id === 'bookModal') {
    // Full reset
    document.getElementById('bookFormWrap').style.display = '';
    document.getElementById('bookSuccess').style.display  = 'none';
    document.getElementById('bookForm').reset();
    selectedDate = null;
    selectedTime = null;
    updateSelectedSlotDisplay();
    // Re-enable submit button
    const btn = document.getElementById('bookSubmitBtn');
    btn.disabled    = false;
    btn.textContent = 'Confirm Booking';
    // Init + render calendar
    initCalMonth();
    renderCalendar();
    document.getElementById('calSlotsTitle').textContent = 'Select a date';
    document.getElementById('calSlotsList').innerHTML =
      '<p class="cal-slots__placeholder">Choose a date on the calendar to see available times.</p>';
  }

  if (id === 'brochureModal') {
    document.getElementById('brochureStep1').style.display = 'block';
    document.getElementById('brochureStep2').style.display = 'none';
    document.getElementById('brochureForm').reset();
    // Re-enable submit button
    const btn = document.getElementById('brochureSubmitBtn');
    btn.disabled    = false;
    btn.textContent = 'Download PDF';
  }
}

function closeModal(id) {
  const overlay = document.getElementById(id);
  overlay.classList.remove('open', 'visible');
  setTimeout(() => { overlay.style.display = 'none'; }, 200);
  document.body.style.overflow = '';
}

function handleOverlayClick(e, id) {
  if (e.target === document.getElementById(id)) closeModal(id);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    ['bookModal', 'brochureModal'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.classList.contains('open')) closeModal(id);
    });
  }
});

/* ═══════════════════════════════════════════ BOOKING FORM SUBMIT */
document.getElementById('bookForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!selectedDate || !selectedTime) {
    alert('Please select a date and time from the calendar.');
    return;
  }

  const formData = new FormData(e.target);
  const payload  = {
    name:    formData.get('name'),
    email:   formData.get('email'),
    company: formData.get('company') || '',
    phone:   '',
    message: formData.get('message') || '',
    date:    selectedDate,
    time:    selectedTime
  };

  const btn = document.getElementById('bookSubmitBtn');
  btn.disabled    = true;
  btn.textContent = 'Sending…';

  try {
    const res = await fetch('/api/book', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Server error');

    document.getElementById('bookFormWrap').style.display = 'none';
    document.getElementById('bookSuccess').style.display  = 'flex';
  } catch (err) {
    console.error(err);
    alert('Something went wrong. Please email us directly at info@ptcgr.com');
    btn.disabled    = false;
    btn.textContent = 'Confirm Booking';
  }
});

/* ═══════════════════════════════════════════ BROCHURE FORM SUBMIT */
document.getElementById('brochureForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const payload  = {
    name:    formData.get('name'),
    email:   formData.get('email'),
    company: formData.get('company') || '',
    phone:   formData.get('phone')   || ''
  };

  const btn = document.getElementById('brochureSubmitBtn');
  btn.disabled    = true;
  btn.textContent = 'Processing…';

  try {
    const res = await fetch('/api/download-brochure', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Server error');

    // Trigger PDF download
    const a = document.createElement('a');
    a.href = '/assets/brochure.pdf';
    a.download = 'PTC-Cladding-Company-Profile.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    document.getElementById('brochureStep1').style.display = 'none';
    document.getElementById('brochureStep2').style.display = 'flex';
  } catch (err) {
    console.error(err);
    alert('Something went wrong. Please email us at info@ptcgr.com');
    btn.disabled    = false;
    btn.textContent = 'Download PDF';
  }
});

/* ═══════════════════════════════════════════ CONTACT FORM SUBMIT */
document.getElementById('contactForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const payload  = {
    name:    formData.get('name'),
    email:   formData.get('email'),
    message: formData.get('message') || ''
  };

  const btn = document.getElementById('contactSubmitBtn');
  btn.disabled    = true;
  btn.textContent = 'Sending…';

  try {
    const res = await fetch('/api/contact', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Server error');

    document.getElementById('contactFormWrap').style.display = 'none';
    document.getElementById('contactSuccess').style.display  = 'flex';
  } catch (err) {
    console.error(err);
    alert('Something went wrong. Please email us at info@ptcgr.com');
    btn.disabled    = false;
    btn.textContent = 'Send Message';
  }
});

/* ═══════════════════════════════════════════ SMOOTH SCROLL OFFSET */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      window.scrollTo({
        top:      target.getBoundingClientRect().top + window.scrollY - 76,
        behavior: 'smooth'
      });
    }
  });
});

/* ═══════════════════════════════════════════ PROJECT PHOTO SLIDERS */
(function () {
  document.querySelectorAll('.project-photo-slider').forEach(slider => {
    const photos = Array.from(slider.querySelectorAll('.project-row__photo'));
    const dots   = Array.from(slider.querySelectorAll('.slider-dot'));
    if (photos.length < 2) return;

    let current  = 0;
    let startX   = 0;
    let startTx  = 0;
    let dragging = false;

    /* Only run carousel logic when mobile CSS is active */
    function isCarousel() {
      return getComputedStyle(slider).display === 'flex';
    }

    /* Move both photos by the same pixel offset — they slide in lockstep */
    function applyTx(tx, animated) {
      const tr = animated ? 'transform 0.3s cubic-bezier(0.4,0,0.2,1)' : 'none';
      photos.forEach(p => {
        p.style.transition = tr;
        p.style.transform  = `translateX(${tx}px)`;
      });
    }

    function updateDots() {
      dots.forEach((d, i) => d.classList.toggle('slider-dot--active', i === current));
    }

    function snapTo(idx) {
      current = Math.max(0, Math.min(photos.length - 1, idx));
      applyTx(-current * slider.clientWidth, true);
      updateDots();
    }

    slider.addEventListener('touchstart', e => {
      if (!isCarousel()) return;
      startX   = e.touches[0].clientX;
      startTx  = -current * slider.clientWidth;
      dragging = true;
      applyTx(startTx, false);
    }, { passive: true });

    slider.addEventListener('touchmove', e => {
      if (!dragging) return;
      applyTx(startTx + (e.touches[0].clientX - startX), false);
    }, { passive: true });

    slider.addEventListener('touchend', e => {
      if (!dragging) return;
      dragging = false;
      const dx = e.changedTouches[0].clientX - startX;
      if      (dx < -slider.clientWidth * 0.25) snapTo(current + 1);
      else if (dx >  slider.clientWidth * 0.25) snapTo(current - 1);
      else                                       snapTo(current);
    }, { passive: true });

    /* Reset transforms when resizing back to desktop */
    window.addEventListener('resize', () => {
      if (!isCarousel()) {
        current = 0;
        photos.forEach(p => { p.style.transform = ''; p.style.transition = ''; });
        updateDots();
      }
    }, { passive: true });
  });
}());
