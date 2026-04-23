import { auth, getAdminRole, myBookingsQuery, onAuthStateChanged, onSnapshot } from "./firebase-client.js";
import { initLayout } from "./layout.js";
import { t } from "./i18n.js";

initLayout();

const gate = document.getElementById("bookings-gate");
const list = document.getElementById("bookings-list");

function showGate(type, text) {
  gate.className = `status-strip ${type}`;
  gate.textContent = text;
  gate.classList.remove("hidden");
  list.innerHTML = "";
}

function renderBookings(rows) {
  gate.classList.add("hidden");
  if (!rows.length) {
    list.innerHTML = `
      <div class="empty-panel">
        <p class="muted" data-i18n="bookings.empty">${t("bookings.empty")}</p>
        <div class="action-stack" style="justify-content:center;margin-top:16px;">
          <a class="btn" href="./hotels.html" data-i18n="bookings.searchCta">${t("bookings.searchCta")}</a>
          <a class="btn-outline" href="./account.html" data-i18n="bookings.loginCta">${t("bookings.loginCta")}</a>
        </div>
      </div>
    `;
    return;
  }

  list.innerHTML = rows
    .map(
      (b) => `
      <article class="booking-card-user">
        <div>
          <strong>${b.bookingRef}</strong>
          <div class="muted">${b.roomName}</div>
        </div>
        <div>
          <span class="muted">${t("bookings.dates")}</span><br>
          ${b.checkIn} → ${b.checkOut}
        </div>
        <div>
          <span class="booking-status status-${b.status}">${b.status}</span>
          <span class="payment-status payment-${b.paymentStatus}">${b.paymentStatus}</span>
        </div>
        <div><strong>$${b.totalPrice}</strong></div>
      </article>
    `,
    )
    .join("");
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    showGate("status-warn", `${t("bookings.loginCta")}: akkaunt kerak.`);
    list.innerHTML = `<p class="empty-state"><a href="./account.html">${t("bookings.loginCta")}</a></p>`;
    return;
  }
  if (await getAdminRole(user)) {
    window.location.replace("./admin.html");
    return;
  }

  onSnapshot(
    myBookingsQuery(user.uid),
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderBookings(rows);
    },
    (err) => {
      showGate("status-error", err.message || "Firestore xatosi.");
    },
  );
});
