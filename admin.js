/* ============================================================
   GRAND LUXE HOTEL — admin.js
   Admin paneli uchun Firebase mantig'i
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
    document.getElementById('table-body').innerHTML = `
      <tr><td colspan="6" class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        Firebase ulanmadi yoki xatolik yuz berdi.
      </td></tr>`;
  }

  // Search event
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const filtered = allBookings.filter(b => 
        (b.name && b.name.toLowerCase().includes(term)) ||
        (b.phone && b.phone.includes(term)) ||
        (b.email && b.email.toLowerCase().includes(term))
      );
      renderTable(filtered);
    });
  }
});

function fetchBookings() {
  db.collection('bronlar').orderBy('yaratilgan', 'desc').onSnapshot(snapshot => {
    allBookings = [];
    snapshot.forEach(doc => {
      allBookings.push({ id: doc.id, ...doc.data() });
    });
    renderTable(allBookings);
    updateStats(allBookings);
  }, error => {
    console.error("Bronlarni tortib olishda xatolik:", error);
  });
}

function renderTable(data) {
  const tbody = document.getElementById('table-body');
  if (!tbody) return;

  if (data.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="6" class="empty-state">
        <div class="empty-state-icon">📋</div>
        Hech qanday bron topilmadi.
      </td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  data.forEach(booking => {
    // Sanalarni formatlash
    const createdDate = booking.yaratilgan ? new Date(booking.yaratilgan.toDate()).toLocaleString('uz-UZ') : 'Noma\'lum';
    
    // Holat klassi
    let statusClass = 'kutilmoqda';
    if (booking.holat === 'tasdiqlandi') statusClass = 'tasdiqlandi';
    if (booking.holat === 'bekor_qilindi') statusClass = 'bekor_qilindi';
    
    // Status text
    let statusText = booking.holat || 'kutilmoqda';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="guest-info">
          <div class="name">${booking.name || 'Nomsiz'}</div>
          <div class="contact">📞 ${booking.phone || '-'} <br>📧 ${booking.email || '-'}</div>
        </div>
      </td>
      <td>
        <strong>${booking.room?.split('—')[0] || booking.room}</strong><br>
        <span style="font-size: 12px; color: #777;">👥 ${booking.guests || 1} kishi</span>
      </td>
      <td>
        <span style="color: #28a745;">KEL:</span> ${booking.checkin || '-'}<br>
        <span style="color: #dc3545;">KET:</span> ${booking.checkout || '-'}
      </td>
      <td style="font-size: 12px; color: #666;">${createdDate}</td>
      <td>
        <span class="status-badge ${statusClass}">${statusText.replace('_', ' ')}</span>
      </td>
      <td>
        <div class="action-btns">
          <button class="btn-action confirm" title="Tasdiqlash" onclick="changeStatus('${booking.id}', 'tasdiqlandi')">✅</button>
          <button class="btn-action" title="Kutilmoqda" onclick="changeStatus('${booking.id}', 'kutilmoqda')">⏳</button>
          <button class="btn-action delete" title="Bekor qilish" onclick="changeStatus('${booking.id}', 'bekor_qilindi')">🛑</button>
          <button class="btn-action" style="color: #dc3545;" title="O'chirish" onclick="deleteBooking('${booking.id}')">🗑️</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function updateStats(data) {
  const elTotal = document.getElementById('stat-total');
  const elPending = document.getElementById('stat-pending');
  const elConfirmed = document.getElementById('stat-confirmed');
  const elIncome = document.getElementById('stat-income');

  let pending = 0, confirmed = 0, totalIncome = 0;

  data.forEach(b => {
    if (b.holat === 'tasdiqlandi') {
      confirmed++;
      // Agar narxi bo'lsa daromadga qo'shamiz (oddiy hisob)
      // "$89/kecha" degan yozuvdan raqamni ajratib olish:
      if (b.room) {
        const match = b.room.match(/\$(\d+)/);
        if (match && match[1]) {
           totalIncome += parseInt(match[1], 10);
        }
      }
    }
    else if (!b.holat || b.holat === 'kutilmoqda') pending++;
  });

  if (elTotal) elTotal.textContent = data.length;
  if (elPending) elPending.textContent = pending;
  if (elConfirmed) elConfirmed.textContent = confirmed;
  if (elIncome) elIncome.textContent = "$" + totalIncome;
}

window.changeStatus = async function(id, newStatus) {
  if (!confirm(`Holatni "${newStatus}" ga o'zgartirishni xohlaysizmi?`)) return;
  try {
    await db.collection('bronlar').doc(id).update({
      holat: newStatus
    });
  } catch (error) {
    alert("Xatolik yuz berdi: " + error.message);
  }
}

window.deleteBooking = async function(id) {
  if (!confirm("Haqiqatan ham bu bronni butunlay o'chirib tashlamoqchimisiz?")) return;
  try {
    await db.collection('bronlar').doc(id).delete();
  } catch (error) {
    alert("O'chirishda xatolik: " + error.message);
  }
}
