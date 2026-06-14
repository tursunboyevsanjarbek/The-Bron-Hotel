import {
  auth,
  adminLogsQuery,
  arrayUnion,
  bookingsQuery,
  getAdminAccess,
  onAuthStateChanged,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  db,
  getDoc,
  setDoc,
  serverTimestamp,
} from "./firebase-client.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initLayout } from "./layout.js?v=20260423f";

initLayout();

const authWarning = document.getElementById("auth-warning");
const tbody = document.getElementById("bookings-body");
const searchInput = document.getElementById("search-input");
const logoutButton = document.getElementById("logout-button");
const exportButton = document.getElementById("export-csv");
const exportLogsButton = document.getElementById("export-logs-csv");
const siteSettingsForm = document.getElementById("site-settings-form");
const siteSettingsMsg = document.getElementById("site-settings-msg");
const rolePill = document.getElementById("admin-role-pill");
const permissionNote = document.getElementById("admin-permission-note");

let allBookings = [];
let statusFilter = "all";
let paymentFilter = "all";
let allLogs = [];
let logFilter = "all";
let filteredLogs = [];
let currentAdminUser = null;
let currentAdminAccess = { isAdmin: false, isSuperAdmin: false, role: null };
const logsTbody = document.getElementById("admin-logs-body");
const logSearchInput = document.getElementById("log-search");
const logModal = document.getElementById("log-modal");
const logModalContent = document.getElementById("log-modal-content");
const logModalClose = document.getElementById("log-modal-close");

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
  const confirmed = rows.filter((row) => row.status === "confirmed").length;
  const paid = rows.filter((row) => row.paymentStatus === "paid").length;
  const revenue = rows
    .filter((row) => row.paymentStatus === "paid")
    .reduce((sum, row) => sum + Number(row.totalPrice || 0), 0);

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-pending").textContent = pending;
  document.getElementById("stat-confirmed").textContent = confirmed;
  document.getElementById("stat-paid").textContent = paid;
  document.getElementById("stat-revenue").textContent = `$${revenue}`;
}

function renderRows(rows) {
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Mos bron topilmadi.</td></tr>`;
    return;
  }

  const canDelete = currentAdminAccess.isSuperAdmin;
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
          <div class="action-stack admin-action-group">
            <button class="btn-outline action-btn action-confirm" type="button" data-action="status" data-id="${row.id}" data-value="confirmed">Tasdiqlash</button>
            <button class="btn-outline action-btn action-cancel" type="button" data-action="status" data-id="${row.id}" data-value="cancelled">Bekor qilish</button>
            <button class="btn-outline action-btn action-paid" type="button" data-action="payment" data-id="${row.id}" data-value="paid">To'landi</button>
            ${canDelete ? `<button class="btn-danger action-btn action-delete" type="button" data-action="delete" data-id="${row.id}">O'chirish</button>` : ""}
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

function renderLogs(rows) {
  if (!logsTbody) return;
  if (!rows.length) {
    logsTbody.innerHTML = `<tr><td colspan="5" class="empty-state">Mos log topilmadi.</td></tr>`;
    return;
  }

  logsTbody.innerHTML = rows
    .map((log) => {
      const labelMap = {
        booking_status_update: "Status update",
        booking_payment_update: "Payment update",
        booking_delete: "Delete",
      };
      const actionLabel = labelMap[log.action] || log.action || "-";
      const detail = [];
      if (log?.details?.from || log?.details?.to) {
        detail.push(`${log.details.from || "-"} → ${log.details.to || "-"}`);
      }
      if (log?.details?.reason) {
        detail.push(`sabab: ${log.details.reason}`);
      }
      return `
      <tr>
        <td>${formatDate(log.createdAt)}</td>
        <td><span class="booking-status status-pending">${actionLabel}</span></td>
        <td>${log.adminEmail || log.adminUid || "-"}</td>
        <td>${log.bookingRef || "-"}</td>
        <td>
          ${detail.join(" | ") || "-"}
          <br>
          <button class="btn-outline" type="button" data-log-view="${log.id}">Ko‘rish</button>
        </td>
      </tr>`;
    })
    .join("");
}

function applyLogFilters() {
  const term = (logSearchInput?.value || "").trim().toLowerCase();
  const filtered = allLogs.filter((row) => {
    const actionMatch = logFilter === "all" || row.action === logFilter;
    const text = `${row.adminEmail || ""} ${row.bookingRef || ""} ${row.action || ""}`.toLowerCase();
    const textMatch = !term || text.includes(term);
    return actionMatch && textMatch;
  });
  filteredLogs = filtered;
  renderLogs(filtered);
}

function openLogModal(log) {
  if (!logModal || !logModalContent) return;
  logModalContent.textContent = JSON.stringify(log, null, 2);
  logModal.classList.add("open");
}

function exportLogsCsv() {
  const rows = filteredLogs.length ? filteredLogs : allLogs;
  const headers = [
    "createdAt",
    "action",
    "adminEmail",
    "adminUid",
    "bookingRef",
    "bookingId",
    "roomId",
    "targetUserId",
    "details",
  ];
  const esc = (v) => {
    const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      headers
        .map((h) => {
          if (h === "createdAt") {
            if (r.createdAt?.toDate) return esc(r.createdAt.toDate().toISOString());
            return esc(r.createdAt || "");
          }
          return esc(r[h]);
        })
        .join(","),
    ),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `admin-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
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

  currentAdminAccess = await getAdminAccess(user);
  if (!currentAdminAccess.isAdmin) {
    await signOut(auth);
    window.location.href = "./login.html";
    return;
  }

  const roleText = currentAdminAccess.isSuperAdmin ? "superadmin" : "admin";
  showAuthMessage("status-ok", `Admin sessiya faol: ${user.email} (${roleText})`);
  currentAdminUser = user;
  document.body.setAttribute("data-admin-role", roleText);

  if (rolePill) {
    rolePill.textContent = currentAdminAccess.isSuperAdmin ? "Superadmin" : "Admin";
    rolePill.classList.toggle("role-superadmin", currentAdminAccess.isSuperAdmin);
    rolePill.classList.toggle("role-admin", !currentAdminAccess.isSuperAdmin);
  }

  if (permissionNote) {
    permissionNote.textContent = currentAdminAccess.isSuperAdmin
      ? "Superadmin rejimi: booking delete va bosh sahifa matnlarini o'zgartirish yoqilgan."
      : "Standart admin rejimi: status/to'lov yangilash va loglarni ko'rish.";
  }

  const settingsPanel = document.getElementById("site-settings-panel");
  if (currentAdminAccess.isSuperAdmin) {
    await loadSiteSettingsForm();
    if (settingsPanel) settingsPanel.classList.remove("hidden");
  } else if (settingsPanel) {
    settingsPanel.classList.add("hidden");
  }

  onSnapshot(bookingsQuery(), (snapshot) => {
    allBookings = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    applyFilters();
  });

  onSnapshot(adminLogsQuery(), (snapshot) => {
    allLogs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    applyLogFilters();
  });
}

async function logAdminAction(action, booking, details = {}) {
  if (!currentAdminUser) return;
  await setDoc(
    doc(db, "adminLogs", `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
    {
      action,
      bookingId: booking?.id || null,
      bookingRef: booking?.bookingRef || null,
      roomId: booking?.roomId || null,
      targetUserId: booking?.userId || null,
      adminUid: currentAdminUser.uid,
      adminEmail: currentAdminUser.email || null,
      details,
      createdAt: serverTimestamp(),
    },
  );
}

async function updateStatusAndLocks(booking, status) {
  const bookingRef = doc(db, "bookings", booking.id);
  await updateDoc(bookingRef, {
    status,
    isActive: status !== "cancelled",
    updatedAt: serverTimestamp(),
    updatedBy: currentAdminUser?.uid || null,
    statusHistory: arrayUnion({
      status,
      changedBy: currentAdminUser?.uid || null,
      changedAt: new Date().toISOString(),
    }),
  });

  if (Array.isArray(booking.lockDates)) {
    for (const date of booking.lockDates) {
      const lockRef = doc(db, "bookingLocks", `${booking.roomId}_${date}`);
      if (status === "cancelled") {
        await deleteDoc(lockRef);
      } else {
        await updateDoc(lockRef, {
          status,
          updatedAt: serverTimestamp(),
          updatedBy: currentAdminUser?.uid || null,
        });
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
      await logAdminAction("booking_status_update", booking, {
        from: booking.status,
        to: value,
      });
    } else if (action === "payment") {
      await updateDoc(doc(db, "bookings", id), {
        paymentStatus: value,
        updatedAt: serverTimestamp(),
        updatedBy: currentAdminUser?.uid || null,
        paymentHistory: arrayUnion({
          paymentStatus: value,
          changedBy: currentAdminUser?.uid || null,
          changedAt: new Date().toISOString(),
        }),
      });
      await logAdminAction("booking_payment_update", booking, {
        from: booking.paymentStatus,
        to: value,
      });
    } else if (action === "delete") {
      if (!currentAdminAccess.isSuperAdmin) {
        throw new Error("Bu amal faqat superadmin uchun.");
      }
      const reason = window.prompt("O‘chirish sababi (majburiy):");
      if (!reason || reason.trim().length < 3) {
        throw new Error("O‘chirish bekor qilindi: sabab kamida 3 ta belgi bo‘lishi kerak.");
      }
      const sure = window.confirm(
        `Haqiqatan ham ${booking.bookingRef} bronini o‘chirmoqchimisiz?\nSabab: ${reason.trim()}`,
      );
      if (!sure) {
        throw new Error("O‘chirish bekor qilindi.");
      }
      if (Array.isArray(booking?.lockDates)) {
        for (const date of booking.lockDates) {
          await deleteDoc(doc(db, "bookingLocks", `${booking.roomId}_${date}`));
        }
      }
      await deleteDoc(doc(db, "bookings", id));
      await logAdminAction("booking_delete", booking, {
        reason: reason.trim(),
      });
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

bindFilterGroup("log-filters", "data-log-filter", (value) => {
  logFilter = value;
  applyLogFilters();
});

searchInput.addEventListener("input", applyFilters);
logSearchInput?.addEventListener("input", applyLogFilters);
logsTbody?.addEventListener("click", (event) => {
  const btn = event.target.closest("button[data-log-view]");
  if (!btn) return;
  const log = allLogs.find((l) => l.id === btn.dataset.logView);
  if (log) openLogModal(log);
});
logoutButton.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "./login.html";
});
exportLogsButton?.addEventListener("click", exportLogsCsv);
logModalClose?.addEventListener("click", () => logModal.classList.remove("open"));
logModal?.addEventListener("click", (e) => {
  if (e.target === logModal) logModal.classList.remove("open");
});

function exportBookingsCsv() {
  const headers = [
    "bookingRef",
    "guestName",
    "email",
    "phone",
    "roomName",
    "roomId",
    "checkIn",
    "checkOut",
    "status",
    "paymentStatus",
    "totalPrice",
    "nights",
    "guestCount",
    "paymentMethod",
    "createdAt",
  ];
  const esc = (v) => {
    const s = v == null ? "" : typeof v === "object" && v.toDate ? v.toDate().toISOString() : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [
    headers.join(","),
    ...allBookings.map((r) => headers.map((h) => esc(r[h])).join(",")),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function loadSiteSettingsForm() {
  if (!siteSettingsForm) return;
  try {
    const snap = await getDoc(doc(db, "siteSettings", "public"));
    if (!snap.exists()) return;
    const d = snap.data();
    document.getElementById("set-hero-title").value = d.heroTitle || "";
    document.getElementById("set-hero-lead").value = d.heroLead || "";
    document.getElementById("set-cta-title").value = d.ctaTitle || "";
    document.getElementById("set-cta-lead").value = d.ctaLead || "";
  } catch {
    /* */
  }
}

if (exportButton) {
  exportButton.addEventListener("click", () => exportBookingsCsv());
}

if (siteSettingsForm) {
  siteSettingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentAdminAccess.isSuperAdmin) {
      siteSettingsMsg.textContent = "Faqat superadmin o‘zgartira oladi.";
      siteSettingsMsg.classList.remove("hidden");
      return;
    }
    siteSettingsMsg.classList.add("hidden");
    try {
      await setDoc(
        doc(db, "siteSettings", "public"),
        {
          heroTitle: document.getElementById("set-hero-title").value.trim(),
          heroLead: document.getElementById("set-hero-lead").value.trim(),
          ctaTitle: document.getElementById("set-cta-title").value.trim(),
          ctaLead: document.getElementById("set-cta-lead").value.trim(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      siteSettingsMsg.textContent = "Saqlandi.";
      siteSettingsMsg.classList.remove("hidden");
    } catch (err) {
      siteSettingsMsg.textContent = err.message || "Saqlashda xato.";
      siteSettingsMsg.classList.remove("hidden");
    }
  });
}

onAuthStateChanged(auth, guardAdmin);
