'use strict';

/* ═══════════════════════════════════════════ NAV */
const nav = document.getElementById('nav');
const navBurger = document.getElementById('navBurger');
const navMobile = document.getElementById('navMobile');

window.addEventListener('scroll', () => {
  nav.style.background = window.scrollY > 40
    ? 'rgba(10,10,10,0.98)'
    : 'rgba(10,10,10,0.92)';
}, { passive: true });

navBurger.addEventListener('click', () => {
  navMobile.classList.toggle('open');
});

function closeMobileNav() {
  navMobile.classList.remove('open');
}

// Close mobile nav on link click
document.querySelectorAll('.nav__mobile-link').forEach(link => {
  link.addEventListener('click', closeMobileNav);
});

/* ═══════════════════════════════════════════ SCROLL ANIMATIONS */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.bento-card, .stat, .about__text, .contact__person, .contact__actions').forEach(el => {
  el.classList.add('fade-up');
  observer.observe(el);
});

/* ═══════════════════════════════════════════ COUNTER ANIMATION */
function animateCounter(el, target, duration = 1800) {
  const isLarge = target > 999;
  let start = 0;
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out expo
    const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    const current = Math.floor(eased * target);

    el.textContent = isLarge
      ? current.toLocaleString('en-GB')
      : current;

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      el.textContent = isLarge
        ? target.toLocaleString('en-GB')
        : target;
    }
  }
  requestAnimationFrame(step);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const target = parseInt(el.dataset.count, 10);
      animateCounter(el, target);
      counterObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('[data-count]').forEach(el => {
  counterObserver.observe(el);
});

/* ═══════════════════════════════════════════ MEETING SLOT GENERATION */
// Seeded LCG PRNG — deterministic per date string
function seededRNG(seed) {
  let s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function stringToSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

const ALL_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30'
];

function getSlotsForDate(dateStr) {
  const rng = seededRNG(stringToSeed(dateStr));
  const pool = [...ALL_SLOTS];
  // Fisher-Yates shuffle with seeded RNG
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3).sort();
}

function getWorkdays(startDate, numWeeks) {
  const days = [];
  const current = new Date(startDate);
  current.setDate(current.getDate() + 1); // Start from tomorrow

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + numWeeks * 7);

  while (current <= endDate) {
    const dow = current.getDay();
    if (dow >= 1 && dow <= 5) { // Mon–Fri
      days.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return days;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(d) {
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Build slot picker UI
let selectedDate = null;
let selectedTime = null;

function buildSlotPicker() {
  const container = document.getElementById('slotPicker');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const workdays = getWorkdays(today, 3);

  container.innerHTML = '';

  workdays.forEach((day, idx) => {
    const dateStr = toDateStr(day);
    const slots = getSlotsForDate(dateStr);
    const label = formatDate(day);

    const wrapper = document.createElement('div');
    wrapper.className = 'slot-date';
    wrapper.innerHTML = `
      <div class="slot-date__header" data-date="${dateStr}">
        <strong>${label}</strong>
        <span>${slots.length} slots available</span>
        <svg class="slot-chevron" width="16" height="16" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      <div class="slot-date__times">
        ${slots.map(t => `
          <button class="slot-time" data-date="${dateStr}" data-time="${t}" data-label="${label}">
            ${t}
          </button>
        `).join('')}
      </div>
    `;

    container.appendChild(wrapper);

    // Toggle expand
    wrapper.querySelector('.slot-date__header').addEventListener('click', () => {
      wrapper.classList.toggle('expanded');
    });

    // Slot selection
    wrapper.querySelectorAll('.slot-time').forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Clear all selections
        document.querySelectorAll('.slot-time').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedDate = btn.dataset.date;
        selectedTime = btn.dataset.time;
        const selLabel = btn.dataset.label;

        // Auto-advance to step 2
        setTimeout(() => goToBookStep2(selLabel, selectedTime), 300);
      });
    });

    // Auto-expand first one
    if (idx === 0) wrapper.classList.add('expanded');
  });
}

function goToBookStep2(dateLabel, time) {
  document.getElementById('bookStep1').style.display = 'none';
  document.getElementById('bookStep2').style.display = 'block';
  document.getElementById('selectedSlotDisplay').textContent =
    `📅 ${dateLabel} at ${time}`;
}

function goToBookStep1() {
  document.getElementById('bookStep1').style.display = 'block';
  document.getElementById('bookStep2').style.display = 'none';
}

/* ═══════════════════════════════════════════ MODALS */
function openModal(id) {
  const overlay = document.getElementById(id);
  overlay.style.display = 'flex';
  // Trigger reflow for transition
  requestAnimationFrame(() => overlay.classList.add('open', 'visible'));
  document.body.style.overflow = 'hidden';

  if (id === 'bookModal') {
    // Reset to step 1
    document.getElementById('bookStep1').style.display = 'block';
    document.getElementById('bookStep2').style.display = 'none';
    document.getElementById('bookStep3').style.display = 'none';
    document.getElementById('bookForm').reset();
    selectedDate = null;
    selectedTime = null;
    buildSlotPicker();
  }

  if (id === 'brochureModal') {
    document.getElementById('brochureStep1').style.display = 'block';
    document.getElementById('brochureStep2').style.display = 'none';
    document.getElementById('brochureForm').reset();
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

// Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    ['bookModal', 'brochureModal'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.classList.contains('open')) closeModal(id);
    });
  }
});

/* ═══════════════════════════════════════════ FORM SUBMISSIONS */
document.getElementById('bookForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!selectedDate || !selectedTime) {
    alert('Please select a meeting date and time first.');
    goToBookStep1();
    return;
  }

  const formData = new FormData(e.target);
  const payload = {
    name: formData.get('name'),
    email: formData.get('email'),
    company: formData.get('company') || '',
    phone: formData.get('phone') || '',
    message: formData.get('message') || '',
    date: selectedDate,
    time: selectedTime
  };

  const btn = e.target.querySelector('[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Sending…';

  try {
    const res = await fetch('/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Server error');
    // Show success
    document.getElementById('bookStep2').style.display = 'none';
    document.getElementById('bookStep3').style.display = 'flex';
  } catch (err) {
    console.error(err);
    alert('Something went wrong. Please email us directly at info@ptcgr.com');
    btn.disabled = false;
    btn.textContent = 'Confirm Booking';
  }
});

document.getElementById('brochureForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const payload = {
    name: formData.get('name'),
    email: formData.get('email'),
    company: formData.get('company') || '',
    phone: formData.get('phone') || ''
  };

  const btn = e.target.querySelector('[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Processing…';

  try {
    const res = await fetch('/api/download-brochure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Server error');

    // Trigger download
    const a = document.createElement('a');
    a.href = '/assets/brochure.pdf';
    a.download = 'PTC-Cladding-Company-Profile.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Show success step
    document.getElementById('brochureStep1').style.display = 'none';
    document.getElementById('brochureStep2').style.display = 'flex';
  } catch (err) {
    console.error(err);
    alert('Something went wrong. Please email us at info@ptcgr.com');
    btn.disabled = false;
    btn.textContent = 'Download PDF';
  }
});

/* ═══════════════════════════════════════════ SMOOTH SCROLL OFFSET */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = 76; // nav height
      window.scrollTo({
        top: target.getBoundingClientRect().top + window.scrollY - offset,
        behavior: 'smooth'
      });
    }
  });
});
