'use strict';

/* ═══════════════════════════════════════════ NAV */
const nav      = document.getElementById('nav');
const navBurger  = document.getElementById('navBurger');
const navMobile  = document.getElementById('navMobile');

window.addEventListener('scroll', () => {
  nav.style.background = window.scrollY > 40
    ? 'rgba(10,10,10,0.99)'
    : 'rgba(10,10,10,0.94)';
}, { passive: true });

navBurger.addEventListener('click', () => navMobile.classList.toggle('open'));
function closeMobileNav() { navMobile.classList.remove('open'); }
document.querySelectorAll('.nav__mobile-link').forEach(l => l.addEventListener('click', closeMobileNav));

/* ═══════════════════════════════════════════ SCROLL ANIMATIONS */
const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.fade-up').forEach(el => fadeObserver.observe(el));

/* ═══════════════════════════════════════════ COUNTER ANIMATION */
function animateCounter(el, target, duration = 1600) {
  const isLarge = target >= 1000;
  const startTime = performance.now();
  function step(now) {
    const t = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const val = Math.floor(eased * target);
    el.textContent = isLarge ? val.toLocaleString('en-GB') : val;
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = isLarge ? target.toLocaleString('en-GB') : target;
  }
  requestAnimationFrame(step);
}

const countObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const el = e.target;
      animateCounter(el, parseInt(el.dataset.count, 10));
      countObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });
document.querySelectorAll('[data-count]').forEach(el => countObserver.observe(el));

/* ═══════════════════════════════════════════ SMOOTH SCROLL */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 76, behavior: 'smooth' });
    }
  });
});

/* ═══════════════════════════════════════════ SLOT GENERATION (seeded) */
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_ABBR    = ['Mo','Tu','We','Th','Fr','Sa','Su'];
const ALL_SLOTS   = ['09:00','09:30','10:00','10:30','11:00','11:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30'];

function seededRNG(seed) {
  let s = Math.abs(seed) || 1;
  return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
}
function strSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function getSlotsForDate(dateStr) {
  const rng  = seededRNG(strSeed(dateStr));
  const pool = [...ALL_SLOTS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3).sort();
}
function getAvailableDates() {
  const set = new Set();
  const today = new Date(); today.setHours(0,0,0,0);
  const end   = new Date(today); end.setDate(today.getDate() + 21);
  const cur   = new Date(today); cur.setDate(today.getDate() + 1);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow >= 1 && dow <= 5) set.add(toDateStr(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return set;
}

/* ═══════════════════════════════════════════ CALENDAR STATE */
let calYear    = null;
let calMonth   = null;
let selectedDate = null;
let selectedTime = null;

function initCalendar() {
  const today = new Date();
  calYear  = today.getFullYear();
  calMonth = today.getMonth();
  renderCalendar();
}

function renderCalendar() {
  const available = getAvailableDates();
  const today = new Date(); today.setHours(0,0,0,0);
  const firstDOW  = new Date(calYear, calMonth, 1).getDay(); // 0=Sun
  const daysInMon = new Date(calYear, calMonth + 1, 0).getDate();
  const startOff  = firstDOW === 0 ? 6 : firstDOW - 1; // convert Sun=0 → offset for Mon-start grid

  // Can we go back?
  const prevOK = calMonth > today.getMonth() || calYear > today.getFullYear();
  // Can we go forward? Only allow this month + 1 (covers the 3-week window)
  const nextOK = !(calYear === today.getFullYear() && calMonth === today.getMonth() + 1);

  let html = `
    <div class="cal-header">
      <button class="cal-nav" onclick="calNav(-1)" ${prevOK ? '' : 'disabled style="opacity:0.3;cursor:default"'}>‹</button>
      <span class="cal-month">${MONTH_FULL[calMonth]} ${calYear}</span>
      <button class="cal-nav" onclick="calNav(1)" ${nextOK ? '' : 'disabled style="opacity:0.3;cursor:default"'}>›</button>
    </div>
    <div class="cal-grid">
      ${DAY_ABBR.map(d => `<span class="cal-dow">${d}</span>`).join('')}
      ${Array(startOff).fill('<span class="cal-day cal-day--empty"></span>').join('')}
  `;

  for (let d = 1; d <= daysInMon; d++) {
    const date    = new Date(calYear, calMonth, d);
    const dateStr = toDateStr(date);
    const isPast  = date <= today;
    const isWknd  = date.getDay() === 0 || date.getDay() === 6;
    const isAvail = available.has(dateStr);
    const isSel   = dateStr === selectedDate;

    let cls = 'cal-day';
    if (isPast || isWknd || !isAvail) cls += ' cal-day--disabled';
    else cls += ' cal-day--available';
    if (isSel) cls += ' cal-day--selected';

    const clickable = !isPast && !isWknd && isAvail;
    html += `<span class="${cls}"${clickable ? ` onclick="selectDate('${dateStr}')"` : ''}>${d}</span>`;
  }

  html += '</div>';
  document.getElementById('calendarWrap').innerHTML = html;
}

function calNav(dir) {
  calMonth += dir;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  if (calMonth < 0)  { calMonth = 11; calYear--; }
  renderCalendar();
}

function selectDate(dateStr) {
  selectedDate = dateStr;
  selectedTime = null;
  renderCalendar();
  renderTimeSlots();
  updatePill();
}

function renderTimeSlots() {
  const wrap = document.getElementById('timesWrap');
  if (!selectedDate) {
    wrap.innerHTML = '<p class="times-hint">Select a date to see available time slots.</p>';
    return;
  }
  const slots = getSlotsForDate(selectedDate);
  wrap.innerHTML = `<div class="times-grid">
    ${slots.map(t => `
      <button class="time-slot${t === selectedTime ? ' time-slot--selected' : ''}"
              onclick="selectTime('${t}')">${t}</button>
    `).join('')}
  </div>`;
}

function selectTime(t) {
  selectedTime = t;
  renderTimeSlots();
  updatePill();
}

function updatePill() {
  const pill = document.getElementById('bookPill');
  if (selectedDate && selectedTime) {
    const d = new Date(selectedDate + 'T00:00:00');
    const label = `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()} · ${selectedTime}`;
    pill.textContent = label;
    pill.classList.remove('empty');
  } else {
    pill.textContent = selectedDate ? 'Pick a time slot →' : 'No time selected';
    pill.classList.add('empty');
  }
}

/* ═══════════════════════════════════════════ MODALS */
function openModal(id) {
  const overlay = document.getElementById(id);
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  if (id === 'bookModal') {
    // Reset booking state
    document.getElementById('bookMain').style.display = 'block';
    document.getElementById('bookSuccess').style.display = 'none';
    document.getElementById('bName').value    = '';
    document.getElementById('bCompany').value = '';
    document.getElementById('bPhone').value   = '';
    document.getElementById('bEmail').value   = '';
    document.getElementById('bMessage').value = '';
    selectedDate = null;
    selectedTime = null;
    initCalendar();
    renderTimeSlots();
    updatePill();
  }

  if (id === 'brochureModal') {
    // Always reset brochure modal — fix the "Processing..." bug
    document.getElementById('brochureStep1').style.display = 'block';
    document.getElementById('brochureStep2').style.display = 'none';
    const form = document.getElementById('brochureForm');
    form.reset();
    const btn = document.getElementById('brochureSubmitBtn');
    btn.disabled    = false;
    btn.textContent = 'Download PDF';
  }
}

function closeModal(id) {
  const overlay = document.getElementById(id);
  overlay.style.display = 'none';
  document.body.style.overflow = '';
}

function handleOverlayClick(e, id) {
  if (e.target === document.getElementById(id)) closeModal(id);
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    ['bookModal','brochureModal'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.style.display === 'flex') closeModal(id);
    });
  }
});

/* ═══════════════════════════════════════════ BOOKING SUBMIT */
async function submitBooking() {
  const name  = document.getElementById('bName').value.trim();
  const email = document.getElementById('bEmail').value.trim();

  if (!name)  { document.getElementById('bName').focus();  alert('Please enter your name.'); return; }
  if (!email) { document.getElementById('bEmail').focus(); alert('Please enter your email.'); return; }
  if (!selectedDate || !selectedTime) { alert('Please select a date and time slot.'); return; }

  const payload = {
    name,
    email,
    company: document.getElementById('bCompany').value.trim(),
    phone:   document.getElementById('bPhone').value.trim(),
    message: document.getElementById('bMessage').value.trim(),
    date:    selectedDate,
    time:    selectedTime
  };

  const btn = document.querySelector('#bookMain .btn--orange');
  btn.disabled    = true;
  btn.textContent = 'Sending…';

  try {
    const res = await fetch('/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Server error');
    document.getElementById('bookMain').style.display    = 'none';
    document.getElementById('bookSuccess').style.display = 'flex';
  } catch (err) {
    console.error(err);
    alert('Something went wrong. Please email us at info@ptcgr.com');
    btn.disabled    = false;
    btn.textContent = 'Send Request';
  }
}

/* ═══════════════════════════════════════════ BROCHURE FORM */
document.getElementById('brochureForm').addEventListener('submit', async e => {
  e.preventDefault();
  const fd  = new FormData(e.target);
  const btn = document.getElementById('brochureSubmitBtn');
  btn.disabled    = true;
  btn.textContent = 'Processing…';

  try {
    const res = await fetch('/api/download-brochure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:    fd.get('name'),
        email:   fd.get('email'),
        company: fd.get('company') || '',
        phone:   fd.get('phone')   || ''
      })
    });
    if (!res.ok) throw new Error('Server error');

    // Trigger download
    const a    = document.createElement('a');
    a.href     = '/assets/brochure.pdf';
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

/* ═══════════════════════════════════════════ CONTACT FORM */
document.getElementById('contactForm').addEventListener('submit', async e => {
  e.preventDefault();
  const fd  = new FormData(e.target);
  const btn = e.target.querySelector('[type="submit"]');
  btn.disabled    = true;
  btn.textContent = 'Sending…';

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:    fd.get('name'),
        email:   fd.get('email'),
        company: fd.get('company') || '',
        phone:   fd.get('phone')   || '',
        message: fd.get('message')
      })
    });
    if (!res.ok) throw new Error('Server error');
    document.getElementById('contactForm').style.display    = 'none';
    document.getElementById('contactSuccess').classList.add('show');
  } catch (err) {
    console.error(err);
    alert('Something went wrong. Please email us at info@ptcgr.com');
    btn.disabled    = false;
    btn.textContent = 'Send Message';
  }
});
