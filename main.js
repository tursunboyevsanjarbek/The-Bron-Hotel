import {
  auth,
  collection,
  db,
  doc,
  runTransaction,
  serverTimestamp,
} from "./firebase-client.js";
import { getRoomById, rooms } from "./room-catalog.js";

const roomsGrid = document.getElementById("rooms-grid");
const roomSelect = document.getElementById("room-id");
const bookingForm = document.getElementById("booking-form");
const summaryBox = document.getElementById("booking-summary");
const formMessage = document.getElementById("form-message");
const firebaseStatus = document.getElementById("firebase-status");
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
  roomsGrid.innerHTML = rooms
    .map(
      (room) => `
      <article class="room-card">
        <span class="badge">${room.badge}</span>
        <h3>${room.name}</h3>
        <p class="muted">${room.description}</p>
        <div class="price">$${room.price} / kecha</div>
        <div class="muted">Sig'im: ${room.capacity} kishi</div>
        <div class="amenities">
          ${room.amenities.map((item) => `<span class="amenity">${item}</span>`).join("")}
        </div>
        <button class="btn" type="button" data-room="${room.id}">Shu xonani tanlash</button>
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
  roomSelect.innerHTML =
    `<option value="">Xona turini tanlang</option>` +
    rooms
      .map(
        (room) =>
          `<option value="${room.id}">${room.name} — $${room.price}/kecha — ${room.capacity} kishi</option>`,
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
    summaryBox.textContent = "Xona va sana tanlang, umumiy narx shu yerda ko'rsatiladi.";
    return;
  }

  const nights = Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000);
  if (nights <= 0) {
    summaryBox.textContent = "Ketish sanasi kelish sanasidan keyin bo'lishi kerak.";
    return;
  }

  const total = room.price * nights;
  const capacityHint = guestCount > room.capacity ? " Sig'imdan oshib ketdi." : "";
  summaryBox.innerHTML = `
    <strong>${room.name}</strong><br>
    ${nights} kecha, ${guestCount || 0} mehmon<br>
    Umumiy narx: <strong>$${total}</strong>.${capacityHint}
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
    setError("guestName", "Ism kamida 3 harf bo'lishi kerak.");
    valid = false;
  }
  if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    setError("email", "Email noto'g'ri.");
    valid = false;
  }
  if (!payload.phone || payload.phone.trim().length < 7) {
    setError("phone", "Telefon raqam noto'g'ri.");
    valid = false;
  }
  if (!getRoomById(payload.roomId)) {
    setError("roomId", "Xona turini tanlang.");
    valid = false;
  }
  if (!payload.checkIn) {
    setError("checkIn", "Kelish sanasini tanlang.");
    valid = false;
  }
  if (!payload.checkOut) {
    setError("checkOut", "Ketish sanasini tanlang.");
    valid = false;
  }
  if (!payload.guestCount) {
    setError("guestCount", "Mehmonlar sonini tanlang.");
    valid = false;
  }
  if (!payload.paymentMethod) {
    setError("paymentMethod", "To'lov usulini tanlang.");
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
    showMessage("status-error", "Formada xatolar bor. Iltimos tuzating.");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Saqlanmoqda...";

  try {
    const room = getRoomById(payload.roomId);
    const nights = Math.round(
      (new Date(payload.checkOut) - new Date(payload.checkIn)) / 86400000,
    );
    if (!room || nights <= 0) throw new Error("Sanalar yoki xona ma'lumoti noto'g'ri.");
    if (payload.guestCount > room.capacity) {
      throw new Error("Mehmonlar soni xona sig'imidan oshib ketdi.");
    }

    const lockDates = buildDateRange(payload.checkIn, payload.checkOut);
    const result = await runTransaction(db, async (transaction) => {
      for (const date of lockDates) {
        const lockRef = doc(db, "bookingLocks", `${payload.roomId}_${date}`);
        const lockSnap = await transaction.get(lockRef);
        if (lockSnap.exists()) {
          throw new Error("Tanlangan sanalarda xona band.");
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
        userId: auth.currentUser?.uid || null,
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

    modalText.textContent = `Bron muvaffaqiyatli saqlandi. Bron raqami: ${result.bookingRef}. Holat: ${result.status}.`;
    successModal.classList.add("open");
    bookingForm.reset();
    updateSummary();
    showMessage("status-ok", "Bron bazaga saqlandi.");
  } catch (error) {
    showMessage("status-error", error.message || "Bronni saqlashda xatolik yuz berdi.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Bronni tasdiqlash";
  }
}

renderRooms();
renderRoomOptions();
setMinDates();

roomSelect.addEventListener("change", updateSummary);
document.getElementById("guest-count").addEventListener("change", updateSummary);
bookingForm.addEventListener("submit", handleSubmit);
closeModal.addEventListener("click", () => successModal.classList.remove("open"));
successModal.addEventListener("click", (event) => {
  if (event.target === successModal) successModal.classList.remove("open");
});

firebaseStatus.className = "status-strip status-ok";
firebaseStatus.textContent =
  "Firebase client tayyor. Spark rejimda bookinglar Firestore transaction orqali yaratiladi.";
