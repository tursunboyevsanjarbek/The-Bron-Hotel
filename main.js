/* ============================================================
   GRAND LUXE HOTEL — main.js
   Firebase Firestore baza + barcha interaktivlik
   ============================================================

   FIREBASE SOZLASH:
   1. https://console.firebase.google.com/ ga kiring
   2. Yangi loyiha yarating (yoki mavjudini oching)
   3. "Web app" qo'shing (</> belgisi)
   4. Quyidagi FIREBASE_CONFIG obyektini o'z ma'lumotlaringiz bilan to'ldiring
   5. Firestore Database yarating → "Start in test mode" tanlang
   ============================================================ */

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCfc1OvXVT2bFLsnnbSrlNI3wmUFHSf7eQ",
  authDomain:        "grand-hotel-sanjazbek.firebaseapp.com",
  projectId:         "grand-hotel-sanjazbek",
  storageBucket:     "grand-hotel-sanjazbek.firebasestorage.app",
  messagingSenderId: "1038620578598",
  appId:             "1:1038620578598:web:24b1bcf1256a585a85e7e7",
  measurementId:     "G-7G1SXPjPBK"
};

/* ─── Firebase ulanish ─────────────────────────────────────── */
let db = null;
let firebaseReady = false;

function initFirebase() {
  const statusDot  = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const setupBanner = document.getElementById('setup-banner');

  // Sozlanmagan bo'lsa ogohlantir
  if (FIREBASE_CONFIG.apiKey === "YOUR_API_KEY") {
    statusDot.className  = 'status-dot error';
    statusText.textContent = '⚠️ Firebase sozlanmagan — main.js faylida FIREBASE_CONFIG ni to\'ldiring';
    if (setupBanner) setupBanner.style.display = 'flex';
    firebaseReady = false;
    return;
  }

  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.firestore();

    // Ulanishni test qilish
    db.collection('_ping').limit(1).get()
      .then(() => {
        statusDot.className  = 'status-dot';
        statusText.textContent = '✅ Firebase Firestore ulangan — bronlar real bazaga saqlanadi';
        firebaseReady = true;
      })
      .catch(() => {
        statusDot.className  = 'status-dot error';
        statusText.textContent = '❌ Firestore ulanishda xatolik — Firebase console-ni tekshiring';
        firebaseReady = false;
      });
  } catch (err) {
    statusDot.className  = 'status-dot error';
    statusText.textContent = '❌ Firebase xatosi: ' + err.message;
    firebaseReady = false;
    console.error('Firebase init error:', err);
  }
}

/* ─── Bron saqlash ─────────────────────────────────────────── */
async function saveBooking(data) {
  if (!firebaseReady || !db) {
    // Firebase ulangan bo'lmasa fallback: consol'ga yoz
    console.log('Bron ma\'lumotlari (Firebase ulangan emas):', data);
    return { id: 'LOCAL-' + Date.now(), fallback: true };
  }
  const docRef = await db.collection('bronlar').add({
    ...data,
    holat: 'kutilmoqda',
    yaratilgan: firebase.firestore.FieldValue.serverTimestamp()
  });
  return { id: docRef.id, fallback: false };
}

/* ─── Bron raqami generatsiya ──────────────────────────────── */
function generateRef() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = 'GLH-';
  for (let i = 0; i < 6; i++) ref += chars[Math.floor(Math.random() * chars.length)];
  return ref;
}

/* ─── Navbar scroll effekti ────────────────────────────────── */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
});

/* ─── Hamburger menyu ──────────────────────────────────────── */
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('nav-links');

hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});
hamburger.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') navLinks.classList.toggle('open');
});

// Nav link bosimida yopilsin
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => navLinks.classList.remove('open'));
});

/* ─── Xona tanlash (Rooms → Booking) ──────────────────────── */
function selectRoom(roomName, price) {
  const roomSelect = document.getElementById('field-room');
  if (roomSelect) {
    // Option qidiramiz
    for (const opt of roomSelect.options) {
      if (opt.value.startsWith(roomName)) {
        roomSelect.value = opt.value;
        break;
      }
    }
  }
  // Booking bo'limiga scroll
  const bookingSection = document.getElementById('booking');
  if (bookingSection) {
    bookingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/* ─── Sana minimumi (bugun) ────────────────────────────────── */
function setupDateFields() {
  const today = new Date();
  const yyyy  = today.getFullYear();
  const mm    = String(today.getMonth() + 1).padStart(2, '0');
  const dd    = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const checkinField  = document.getElementById('field-checkin');
  const checkoutField = document.getElementById('field-checkout');
  if (!checkinField || !checkoutField) return;

  checkinField.min  = todayStr;
  checkoutField.min = todayStr;

  checkinField.addEventListener('change', () => {
    const checkinVal = checkinField.value;
    if (checkinVal) {
      const nextDay = new Date(checkinVal);
      nextDay.setDate(nextDay.getDate() + 1);
      const nd = String(nextDay.getDate()).padStart(2, '0');
      const nm = String(nextDay.getMonth() + 1).padStart(2, '0');
      checkoutField.min = `${nextDay.getFullYear()}-${nm}-${nd}`;
      if (checkoutField.value && checkoutField.value <= checkinVal) {
        checkoutField.value = `${nextDay.getFullYear()}-${nm}-${nd}`;
      }
    }
  });
}

/* ─── Forma validatsiyasi ──────────────────────────────────── */
function validateForm(data) {
  const errors = [];
  if (!data.name || data.name.trim().length < 3)
    errors.push('Ism kamida 3 harf bo\'lishi kerak');
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    errors.push('Email manzil noto\'g\'ri');
  if (!data.phone || data.phone.trim().length < 7)
    errors.push('Telefon raqam noto\'g\'ri');
  if (!data.room)
    errors.push('Xona turini tanlang');
  if (!data.checkin)
    errors.push('Kelish sanasini tanlang');
  if (!data.checkout)
    errors.push('Ketish sanasini tanlang');
  if (data.checkin && data.checkout && data.checkout <= data.checkin)
    errors.push('Ketish sanasi kelish sanasidan keyin bo\'lishi kerak');
  if (!data.guests)
    errors.push('Mehmonlar sonini tanlang');
  return errors;
}

/* ─── Shaklni inline xatoliklar bilan ko'rsatish ──────────── */
function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  field.style.borderColor = '#f44336';
  field.style.boxShadow = '0 0 0 3px rgba(244,67,54,0.15)';
  let errEl = field.parentNode.querySelector('.field-err');
  if (!errEl) {
    errEl = document.createElement('span');
    errEl.className = 'field-err';
    errEl.style.cssText = 'color:#f44336;font-size:11px;margin-top:4px;display:block';
    field.parentNode.appendChild(errEl);
  }
  errEl.textContent = message;
}

function clearFieldErrors() {
  document.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(f => {
    f.style.borderColor = '';
    f.style.boxShadow = '';
  });
  document.querySelectorAll('.field-err').forEach(e => e.remove());
}

/* ─── Bron forma submit ────────────────────────────────────── */
const bookingForm = document.getElementById('booking-form');
const submitBtn   = document.getElementById('submit-btn');
const submitText  = document.getElementById('submit-text');

if (bookingForm) {
  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors();

    const data = {
      name:     document.getElementById('field-name').value.trim(),
      email:    document.getElementById('field-email').value.trim(),
      phone:    document.getElementById('field-phone').value.trim(),
      room:     document.getElementById('field-room').value,
      checkin:  document.getElementById('field-checkin').value,
      checkout: document.getElementById('field-checkout').value,
      guests:   document.getElementById('field-guests').value,
      source:   document.getElementById('field-source').value,
      notes:    document.getElementById('field-notes').value.trim(),
    };

    const errors = validateForm(data);

    if (errors.length > 0) {
      // Xatoliklarni maydonlarga ko'rsat
      if (!data.name || data.name.length < 3) showFieldError('field-name', 'Kamida 3 harf kiriting');
      if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) showFieldError('field-email', 'Email noto\'g\'ri');
      if (!data.phone || data.phone.trim().length < 7) showFieldError('field-phone', 'Telefon noto\'g\'ri');
      if (!data.room) showFieldError('field-room', 'Xona turini tanlang');
      if (!data.checkin) showFieldError('field-checkin', 'Sanani tanlang');
      if (!data.checkout) showFieldError('field-checkout', 'Sanani tanlang');
      if (data.checkin && data.checkout && data.checkout <= data.checkin)
        showFieldError('field-checkout', 'Ketish sanasi kelishdan keyin bo\'lishi kerak');
      if (!data.guests) showFieldError('field-guests', 'Tanlang');
      return;
    }

    // Loading holati
    submitBtn.classList.add('loading');
    submitText.textContent = '⏳ Saqlanmoqda...';

    try {
      const result = await saveBooking(data);
      const refCode = generateRef();

      // Modal
      document.getElementById('modal-icon').textContent   = result.fallback ? '📋' : '✅';
      document.getElementById('modal-title').textContent  = 'Bron Qabul Qilindi!';
      document.getElementById('modal-ref').textContent    = refCode;
      document.getElementById('modal-desc').innerHTML     = result.fallback
        ? `<strong>${data.name}</strong>, broningiz qabul qilindi.<br>Firebase sozlanmaganligi sababli ma'lumot konsoldadir.<br>Tez orada siz bilan bog'lanamiz: <strong>${data.phone}</strong>`
        : `<strong>${data.name}</strong>, broningiz Firebase Firestore'ga saqlandi!<br>Tez orada <strong>${data.email}</strong> yoki <strong>${data.phone}</strong> orqali siz bilan bog'lanamiz.`;
      openModal();

      // Formani tozalash
      bookingForm.reset();
      clearFieldErrors();

    } catch (err) {
      console.error('Saqlash xatosi:', err);
      document.getElementById('modal-icon').textContent  = '❌';
      document.getElementById('modal-title').textContent = 'Xatolik Yuz Berdi';
      document.getElementById('modal-desc').textContent  = 'Bron saqlanmadi. Iltimos qayta urinib ko\'ring yoki bizga qo\'ng\'iroq qiling.';
      document.getElementById('modal-ref').textContent   = '';
      openModal();
    } finally {
      submitBtn.classList.remove('loading');
      submitText.textContent = '🏨 Bronni Tasdiqlash';
    }
  });
}

/* ─── Modal boshqaruv ──────────────────────────────────────── */
function openModal() {
  document.getElementById('success-modal').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  document.getElementById('success-modal').classList.remove('active');
  document.body.style.overflow = '';
}

// Fon bosimida yopilsin
document.getElementById('success-modal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// ESC tugmasi
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

/* ─── Sharhlar slider ──────────────────────────────────────── */
let currentReview = 0;
const totalReviews = 4;

function goToReview(idx) {
  document.getElementById('rev-' + currentReview).classList.remove('active');
  document.querySelectorAll('.rev-dot')[currentReview].classList.remove('active');
  currentReview = (idx + totalReviews) % totalReviews;
  document.getElementById('rev-' + currentReview).classList.add('active');
  document.querySelectorAll('.rev-dot')[currentReview].classList.add('active');
}

document.getElementById('rev-prev').addEventListener('click', () => goToReview(currentReview - 1));
document.getElementById('rev-next').addEventListener('click', () => goToReview(currentReview + 1));

document.querySelectorAll('.rev-dot').forEach(dot => {
  dot.addEventListener('click', () => goToReview(parseInt(dot.dataset.idx)));
});

// Auto play
let revInterval = setInterval(() => goToReview(currentReview + 1), 5000);
document.querySelector('.reviews-slider').addEventListener('mouseenter', () => clearInterval(revInterval));
document.querySelector('.reviews-slider').addEventListener('mouseleave', () => {
  revInterval = setInterval(() => goToReview(currentReview + 1), 5000);
});

/* ─── Scroll animatsiyalar (Intersection Observer) ─────────── */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

document.querySelectorAll('.reveal').forEach((el, i) => {
  el.style.transitionDelay = `${(i % 4) * 0.08}s`;
  observer.observe(el);
});

/* ─── Smooth anchor navigation ─────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const navHeight = navbar.offsetHeight + 8;
      const topPos = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
      window.scrollTo({ top: topPos, behavior: 'smooth' });
    }
  });
});

/* ─── Ishga tushirish ──────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initFirebase();
  setupDateFields();
});
