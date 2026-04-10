/* ============================================================
   GRAND LUXE HOTEL — admin.js (Premium Features)
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

let db;
let allBookings = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('adminLoggedIn');
      window.location.href = 'login.html';
    });
  }

  // Firebase Init
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.firestore();
    fetchBookings();
  } catch (err) {
    console.error("Firebase ulanishda xatolik:", err);
    showToast("Firebase'ga ulanilmadi! Internetni tekshiring.", 'error');
  }

  // Search event
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      applyFilters();
    });
  }

  // Filter tabs
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.filter;
      applyFilters();
    });
  });
});

function fetchBookings() {
  db.collection('bronlar').orderBy('yaratilgan', 'desc').onSnapshot(snapshot => {
    allBookings = [];
    snapshot.forEach(doc => {
      allBookings.push({ id: doc.id, ...doc.data() });
    });
    applyFilters();
    updateStats(allBookings);
  }, error => {
    console.error("Bronlarni pull qilishda xatolik:", error);
    showToast("Ma'lumotlarni tortishda xatolik", 'error');
  });
}

function applyFilters() {
  const term = (document.getElementById('search-input')?.value || '').toLowerCase();
  
  const filtered = allBookings.filter(b => {
    // 1. Matnli qidiruv
    const matchText = (b.name && b.name.toLowerCase().includes(term)) ||
                      (b.phone && b.phone.includes(term)) ||
                      (b.email && b.email.toLowerCase().includes(term));
                      
    // 2. Holat bo'yicha filter
    let matchStatus = true;
    if (currentFilter !== 'all') {
       const status = b.holat || 'kutilmoqda';
       matchStatus = (status === currentFilter);
    }
    
    return matchText && matchStatus;
  });
  
  renderTable(filtered);
}

function renderTable(data) {
  const tbody = document.getElementById('table-body');
  if (!tbody) return;

  if (data.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="6" style="padding: 60px; text-align: center; color: var(--text-muted);">
        <div style="font-size: 40px; margin-bottom: 15px; opacity: 0.5;">🗂️</div>
        Bu bo'limda hozircha ma'lumot yo'q.
      </td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  data.forEach(booking => {
    const createdDate = booking.yaratilgan ? new Date(booking.yaratilgan.toDate()).toLocaleString('uz-UZ') : 'Noma\'lum';
    
    let statusClass = 'kutilmoqda';
    if (booking.holat === 'tasdiqlandi') statusClass = 'tasdiqlandi';
    if (booking.holat === 'bekor_qilindi') statusClass = 'bekor_qilindi';
    let statusText = booking.holat || 'kutilmoqda';

    // Avatar harfi
    const avatarLetter = booking.name ? booking.name.charAt(0).toUpperCase() : '?';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="guest-info">
          <div class="guest-avatar">${avatarLetter}</div>
          <div class="guest-details">
            <div class="name">${booking.name || 'Nomsiz'}</div>
            <div class="contact">📞 ${(booking.phone && booking.phone.length > 5) ? booking.phone : 'Kiritilmagan'} <br>📧 ${(booking.email && booking.email.length > 5) ? booking.email : 'Kiritilmagan'}</div>
          </div>
        </div>
      </td>
      <td>
        <strong style="color: var(--primary-color);">${booking.room?.split('—')[0] || booking.room}</strong><br>
        <span style="font-size: 12px; color: var(--text-muted);">👥 ${booking.guests || 1} kishi</span>
      </td>
      <td>
        <span style="color: var(--status-confirmed-color);">Kel:</span> ${booking.checkin || '-'}<br>
        <span style="color: var(--status-cancelled-color);">Ket:</span> ${booking.checkout || '-'}
      </td>
      <td style="font-size: 12px; color: var(--text-muted); opacity: 0.8;">${createdDate}</td>
      <td>
        <span class="status-badge ${statusClass}">${statusText.replace('_', ' ')}</span>
      </td>
      <td>
        <div class="action-btns">
          <button class="btn-action confirm" title="Tasdiqlash" onclick="changeStatus('${booking.id}', 'tasdiqlandi')">✔️</button>
          <button class="btn-action warning" title="Kutishga o'tkazish" onclick="changeStatus('${booking.id}', 'kutilmoqda')">⏳</button>
          <button class="btn-action delete" title="Bekor qilish" onclick="changeStatus('${booking.id}', 'bekor_qilindi')">✖️</button>
          <button class="btn-action" style="color: var(--status-cancelled-color);" title="Baza dan o'chirish" onclick="deleteBooking('${booking.id}')">🗑️</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function updateStats(data) {
  let pending = 0, confirmed = 0, totalIncome = 0;

  data.forEach(b => {
    if (b.holat === 'tasdiqlandi') {
      confirmed++;
      if (b.room) {
        const match = b.room.match(/\$(\d+)/);
        if (match && match[1]) totalIncome += parseInt(match[1], 10);
      }
    }
    else if (!b.holat || b.holat === 'kutilmoqda') pending++;
  });

  animateNum('stat-total', data.length);
  animateNum('stat-pending', pending);
  animateNum('stat-confirmed', confirmed);
  animateNum('stat-income', totalIncome, '$');
}

function animateNum(id, endValue, prefix = '') {
  const el = document.getElementById(id);
  if (!el) return;
  const startObj = { val: parseInt(el.dataset.val || 0) };
  el.dataset.val = endValue;
  
  if (startObj.val === endValue) {
    el.textContent = prefix + endValue;
    return;
  }

  const duration = 1000;
  const startTime = performance.now();
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease out quad
    const easeProgress = progress * (2 - progress);
    const currentVal = Math.floor(startObj.val + (endValue - startObj.val) * easeProgress);
    
    el.textContent = prefix + currentVal;
    
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      el.textContent = prefix + endValue;
    }
  }
  requestAnimationFrame(update);
}

// Global actions
window.changeStatus = async function(id, newStatus) {
  try {
    await db.collection('bronlar').doc(id).update({ holat: newStatus });
    showToast(`Holat muvaffaqiyatli "${newStatus}" ga o'zgartirildi`, 'success');
  } catch (error) {
    showToast("Xatolik yuz berdi: " + error.message, 'error');
  }
}

window.deleteBooking = async function(id) {
  if (!confirm("Diqqat! Bu bronni butunlay bazadan o'chirib tashlamoqchimisiz? Ayni jarayon orqaga qaytarilmaydi!")) return;
  try {
    await db.collection('bronlar').doc(id).delete();
    showToast("Bron bazadan butunlay o'chirildi", 'success');
  } catch (error) {
    showToast("O'chirishda xatolik: " + error.message, 'error');
  }
}

// Toast System
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = \`toast \${type}\`;
  
  const icons = { success: '✅', error: '❌', warning: '⚠️' };
  toast.innerHTML = \`<span style="font-size: 18px;">\${icons[type]}</span> <span>\${message}</span>\`;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.4s forwards';
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}
