import {
  auth,
  collection,
  db,
  doc,
  runTransaction,
  serverTimestamp,
} from "./firebase-client.js";
import { getRoomById, getRooms } from "./room-catalog.js?v=20260423a";
import { initLayout } from "./layout.js?v=20260423f";
import { applyPublicSiteSettings } from "./site-settings.js";
import { applyI18n, t } from "./i18n.js?v=20260423f";

initLayout();
void applyPublicSiteSettings();

const roomsGrid = document.getElementById("rooms-grid");
const roomSelect = document.getElementById("room-id");
const bookingForm = document.getElementById("booking-form");
const summaryBox = document.getElementById("booking-summary");
const formMessage = document.getElementById("form-message");
const successModal = document.getElementById("success-modal");
const modalText = document.getElementById("modal-text");
const closeModal = document.getElementById("close-modal");
const submitButton = document.getElementById("submit-booking");
const BOOKING_COUNTER_DOC = doc(db, "meta", "bookingCounter");

function buildDateRange(checkIn, checkOut) {
  const dates = [];
  const start = new Date(`${checkIn}T00:00:00Z`);
  const end = new Date(`${checkOut}T00:00:00Z`);
  for (let day = new Date(start); day < end; day.setUTCDate(day.getUTCDate() + 1)) {
    dates.push(day.toISOString().slice(0, 10));
  }
  return dates;
}

function renderRooms() {
  const rooms = getRooms();
  roomsGrid.innerHTML = rooms
    .map(
      (room) => `
      <article class="room-card">
        <div class="room-card-visual" aria-hidden="true"></div>
        <div class="room-card-content">
          <span class="badge">${room.badge}</span>
          <h3>${room.name}</h3>
          <p class="muted">${room.description}</p>
          <div class="price">$${room.price} <span class="price-unit">${t("booking.perNight")}</span></div>
          <div class="muted room-capacity">${t("booking.capacity")}: ${room.capacity} ${t("booking.person")}</div>
          <div class="amenities">
            ${room.amenities.map((item) => `<span class="amenity">${item}</span>`).join("")}
          </div>
          <button class="btn btn-block" type="button" data-room="${room.id}">${t("booking.selectRoomBtn")}</button>
        </div>
      </article>
    `,
    )
    .join("");

  roomsGrid.querySelectorAll("[data-room]").forEach((button) => {
    button.addEventListener("click", () => {
      roomSelect.value = button.dataset.room;
      updateSummary();
      document.getElementById("booking").scrollIntoView({ behavior: "smooth" });
    });
  });
}

function renderRoomOptions() {
  const rooms = getRooms();
  roomSelect.innerHTML =
    `<option value="">${t("booking.roomTypePlaceholder")}</option>` +
    rooms
      .map(
        (room) =>
          `<option value="${room.id}">${room.name} — $${room.price}${t("booking.perNightShort")} — ${room.capacity} ${t("booking.person")}</option>`,
      )
      .join("");
}

function setMinDates() {
  const today = new Date();
  const isoToday = today.toISOString().slice(0, 10);
  const checkIn = document.getElementById("check-in");
  const checkOut = document.getElementById("check-out");
  checkIn.min = isoToday;
  checkOut.min = isoToday;

  checkIn.addEventListener("change", () => {
    checkOut.min = checkIn.value || isoToday;
    if (checkOut.value && checkOut.value <= checkIn.value) {
      checkOut.value = "";
    }
    updateSummary();
  });
  checkOut.addEventListener("change", updateSummary);
}

function updateSummary() {
  const room = getRoomById(roomSelect.value);
  const checkIn = document.getElementById("check-in").value;
  const checkOut = document.getElementById("check-out").value;
  const guestCount = Number(document.getElementById("guest-count").value || 0);

  if (!room || !checkIn || !checkOut) {
    summaryBox.textContent = t("booking.summary.default");
    return;
  }

  const nights = Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000);
  if (nights <= 0) {
    summaryBox.textContent = t("booking.summary.invalidDates");
    return;
  }

  const total = room.price * nights;
  const capacityHint = guestCount > room.capacity ? ` ${t("booking.summary.capacityExceeded")}` : "";
  summaryBox.innerHTML = `
    <strong>${room.name}</strong><br>
    ${nights} ${t("booking.nights")}, ${guestCount || 0} ${t("booking.guests")}<br>
    ${t("booking.summary.total")}: <strong>$${total}</strong>.${capacityHint}
  `;
}

function clearErrors() {
  document.querySelectorAll("[data-error-for]").forEach((node) => {
    node.textContent = "";
  });
  formMessage.classList.add("hidden");
}

function setError(field, text) {
  const el = document.querySelector(`[data-error-for="${field}"]`);
  if (el) el.textContent = text;
}

function showMessage(type, text) {
  formMessage.className = `status-strip ${type}`;
  formMessage.textContent = text;
  formMessage.classList.remove("hidden");
}

function validateForm(payload) {
  clearErrors();

  let valid = true;
  if (!payload.guestName || payload.guestName.trim().length < 3) {
    setError("guestName", t("booking.error.guestName"));
    valid = false;
  }
  if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    setError("email", t("booking.error.email"));
    valid = false;
  }
  if (!payload.phone || payload.phone.trim().length < 7) {
    setError("phone", t("booking.error.phone"));
    valid = false;
  }
  if (!getRoomById(payload.roomId)) {
    setError("roomId", t("booking.error.roomId"));
    valid = false;
  }
  if (!payload.checkIn) {
    setError("checkIn", t("booking.error.checkIn"));
    valid = false;
  }
  if (!payload.checkOut) {
    setError("checkOut", t("booking.error.checkOut"));
    valid = false;
  }
  if (!payload.guestCount) {
    setError("guestCount", t("booking.error.guestCount"));
    valid = false;
  }
  if (!payload.paymentMethod) {
    setError("paymentMethod", t("booking.error.paymentMethod"));
    valid = false;
  }
  return valid;
}

async function handleSubmit(event) {
  event.preventDefault();

  const payload = {
    guestName: document.getElementById("guest-name").value.trim(),
    email: document.getElementById("guest-email").value.trim(),
    phone: document.getElementById("guest-phone").value.trim(),
    roomId: roomSelect.value,
    checkIn: document.getElementById("check-in").value,
    checkOut: document.getElementById("check-out").value,
    guestCount: Number(document.getElementById("guest-count").value),
    paymentMethod: document.getElementById("payment-method").value,
    source: document.getElementById("lead-source").value,
    notes: document.getElementById("guest-notes").value.trim(),
    requestedByUid: auth.currentUser?.uid || null,
  };

  if (!validateForm(payload)) {
    showMessage("status-error", t("booking.error.form"));
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = t("booking.saving");

  try {
    const room = getRoomById(payload.roomId);
    const nights = Math.round(
      (new Date(payload.checkOut) - new Date(payload.checkIn)) / 86400000,
    );
    if (!room || nights <= 0) throw new Error(t("booking.error.invalidDateOrRoom"));
    if (payload.guestCount > room.capacity) {
      throw new Error(t("booking.error.capacity"));
    }

    const lockDates = buildDateRange(payload.checkIn, payload.checkOut);
    const result = await runTransaction(db, async (transaction) => {
      for (const date of lockDates) {
        const lockRef = doc(db, "bookingLocks", `${payload.roomId}_${date}`);
        const lockSnap = await transaction.get(lockRef);
        if (lockSnap.exists()) {
          throw new Error(t("booking.error.locked"));
        }
      }

      const counterSnap = await transaction.get(BOOKING_COUNTER_DOC);
      const currentCounter = counterSnap.exists() ? Number(counterSnap.data().value || 0) : 0;
      const nextCounter = currentCounter + 1;
      const bookingRefCode = `GLH-${String(nextCounter).padStart(6, "0")}`;
      const bookingRef = doc(collection(db, "bookings"));

      const bookingPayload = {
        bookingRef: bookingRefCode,
        guestName: payload.guestName,
        email: payload.email.toLowerCase(),
        phone: payload.phone,
        roomId: payload.roomId,
        roomName: room.name,
        nightlyPrice: room.price,
        totalPrice: room.price * nights,
        guestCount: payload.guestCount,
        checkIn: payload.checkIn,
        checkOut: payload.checkOut,
        nights,
        source: payload.source,
        notes: payload.notes,
        status: "pending",
        paymentStatus: "unpaid",
        paymentMethod: payload.paymentMethod,
        isActive: true,
        lockDates,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        userId: auth.currentUser?.uid ?? null,
      };

      transaction.set(BOOKING_COUNTER_DOC, { value: nextCounter }, { merge: true });
      transaction.set(bookingRef, bookingPayload);

      for (const date of lockDates) {
        const lockRef = doc(db, "bookingLocks", `${payload.roomId}_${date}`);
        transaction.set(lockRef, {
          bookingId: bookingRef.id,
          bookingRef: bookingRefCode,
          roomId: payload.roomId,
          date,
          status: "pending",
          createdAt: serverTimestamp(),
        });
      }

      return { bookingRef: bookingRefCode, status: "pending" };
    });

    modalText.textContent = `${t("booking.success.saved")} ${t("booking.success.ref")}: ${result.bookingRef}. ${t("booking.success.status")}: ${result.status}.`;
    successModal.classList.add("open");
    bookingForm.reset();
    updateSummary();
    showMessage("status-ok", t("booking.success.saved"));
  } catch (error) {
    showMessage("status-error", error.message || t("booking.error.saveFailed"));
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = t("booking.submit");
  }
}

renderRooms();
renderRoomOptions();
setMinDates();
applyI18n(document.body);

roomSelect.addEventListener("change", updateSummary);
document.getElementById("guest-count").addEventListener("change", updateSummary);
bookingForm.addEventListener("submit", handleSubmit);
closeModal.addEventListener("click", () => successModal.classList.remove("open"));
successModal.addEventListener("click", (event) => {
  if (event.target === successModal) successModal.classList.remove("open");
});
