import {
  auth,
  bookingsQuery,
  getAdminRole,
  onAuthStateChanged,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  db,
} from "./firebase-client.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const authWarning = document.getElementById("auth-warning");
const tbody = document.getElementById("bookings-body");
const searchInput = document.getElementById("search-input");
const logoutButton = document.getElementById("logout-button");

let allBookings = [];
let statusFilter = "all";
let paymentFilter = "all";

function showAuthMessage(type, text) {
  authWarning.className = `status-strip ${type}`;
  authWarning.textContent = text;
}

function formatDate(value) {
  if (!value) return "-";
  if (typeof value === "string") return value;
  if (value.toDate) return value.toDate().toLocaleString("uz-UZ");
  return "-";
}

function updateStats(rows) {
  const total = rows.length;
  const pending = rows.filter((row) => row.status === "pending").length;
  const revenue = rows
    .filter((row) => row.paymentStatus === "paid")
    .reduce((sum, row) => sum + Number(row.totalPrice || 0), 0);

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-pending").textContent = pending;
  document.getElementById("stat-revenue").textContent = `$${revenue}`;
}

function renderRows(rows) {
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Mos bron topilmadi.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows
    .map(
      (row) => `
      <tr>
        <td>
          <strong>${row.bookingRef}</strong><br>
          <span class="muted">${row.roomName}</span><br>
          <span class="muted">$${row.totalPrice} / ${row.nights} kecha</span>
        </td>
        <td>
          <strong>${row.guestName}</strong><br>
          <span class="muted">${row.email}</span><br>
          <span class="muted">${row.phone}</span>
        </td>
        <td>
          ${row.checkIn} → ${row.checkOut}<br>
          <span class="muted">${formatDate(row.createdAt)}</span>
        </td>
        <td><span class="booking-status status-${row.status}">${row.status}</span></td>
        <td><span class="payment-status payment-${row.paymentStatus}">${row.paymentStatus}</span></td>
        <td>
          <div class="action-stack">
            <button class="btn-outline" type="button" data-action="status" data-id="${row.id}" data-value="confirmed">Tasdiqlash</button>
            <button class="btn-outline" type="button" data-action="status" data-id="${row.id}" data-value="cancelled">Bekor qilish</button>
            <button class="btn-outline" type="button" data-action="payment" data-id="${row.id}" data-value="paid">To'landi</button>
            <button class="btn-danger" type="button" data-action="delete" data-id="${row.id}">O'chirish</button>
          </div>
        </td>
      </tr>
    `,
    )
    .join("");
}

function applyFilters() {
  const term = searchInput.value.trim().toLowerCase();

  const filtered = allBookings.filter((row) => {
    const textMatch =
      !term ||
      row.guestName.toLowerCase().includes(term) ||
      row.email.toLowerCase().includes(term) ||
      row.phone.toLowerCase().includes(term) ||
      row.bookingRef.toLowerCase().includes(term);

    const statusMatch = statusFilter === "all" || row.status === statusFilter;
    const paymentMatch = paymentFilter === "all" || row.paymentStatus === paymentFilter;
    return textMatch && statusMatch && paymentMatch;
  });

  updateStats(filtered);
  renderRows(filtered);
}

function bindFilterGroup(containerId, attribute, setter) {
  document.getElementById(containerId).addEventListener("click", (event) => {
    const button = event.target.closest(`[${attribute}]`);
    if (!button) return;

    document
      .querySelectorAll(`#${containerId} .filter-chip`)
      .forEach((chip) => chip.classList.remove("active"));
    button.classList.add("active");
    setter(button.getAttribute(attribute));
    applyFilters();
  });
}

async function guardAdmin(user) {
  if (!user) {
    window.location.href = "./login.html";
    return;
  }

  const allowed = await getAdminRole(user);
  if (!allowed) {
    await signOut(auth);
    window.location.href = "./login.html";
    return;
  }

  showAuthMessage("status-ok", `Admin sessiya faol: ${user.email}`);

  onSnapshot(bookingsQuery(), (snapshot) => {
    allBookings = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    applyFilters();
  });
}

async function updateStatusAndLocks(booking, status) {
  const bookingRef = doc(db, "bookings", booking.id);
  await updateDoc(bookingRef, {
    status,
    isActive: status !== "cancelled",
  });

  if (Array.isArray(booking.lockDates)) {
    for (const date of booking.lockDates) {
      const lockRef = doc(db, "bookingLocks", `${booking.roomId}_${date}`);
      if (status === "cancelled") {
        await deleteDoc(lockRef);
      } else {
        await updateDoc(lockRef, { status });
      }
    }
  }
}

tbody.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;
  const value = button.dataset.value;
  const booking = allBookings.find((item) => item.id === id);
  if (!booking) {
    showAuthMessage("status-error", "Booking topilmadi.");
    return;
  }

  button.disabled = true;

  try {
    if (action === "status") {
      await updateStatusAndLocks(booking, value);
    } else if (action === "payment") {
      await updateDoc(doc(db, "bookings", id), { paymentStatus: value });
    } else if (action === "delete") {
      if (Array.isArray(booking?.lockDates)) {
        for (const date of booking.lockDates) {
          await deleteDoc(doc(db, "bookingLocks", `${booking.roomId}_${date}`));
        }
      }
      await deleteDoc(doc(db, "bookings", id));
    }
  } catch (error) {
    showAuthMessage("status-error", error.message || "Admin amali bajarilmadi.");
  } finally {
    button.disabled = false;
  }
});

bindFilterGroup("status-filters", "data-filter", (value) => {
  statusFilter = value;
});
bindFilterGroup("payment-filters", "data-payment", (value) => {
  paymentFilter = value;
});

searchInput.addEventListener("input", applyFilters);
logoutButton.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "./login.html";
});

onAuthStateChanged(auth, guardAdmin);
