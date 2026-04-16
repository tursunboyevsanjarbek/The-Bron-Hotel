const admin = require("firebase-admin");
const { HttpsError, onCall } = require("firebase-functions/v2/https");

admin.initializeApp();

const db = admin.firestore();

const ROOM_CATALOG = {
  "standard-room": { name: "Standart Xona", price: 89, capacity: 2 },
  "deluxe-room": { name: "Deluxe Xona", price: 149, capacity: 3 },
  "lux-suite": { name: "Lyuks Suite", price: 299, capacity: 4 },
};

function requireAdmin(context) {
  if (!context.auth) {
    throw new HttpsError("unauthenticated", "Admin kirishi talab qilinadi.");
  }
  return db
    .doc(`roles/admins/users/${context.auth.uid}`)
    .get()
    .then((snap) => {
      if (!snap.exists || snap.data().enabled !== true) {
        throw new HttpsError("permission-denied", "Admin ruxsati topilmadi.");
      }
      return true;
    });
}

function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function daysBetween(start, end) {
  return Math.round((end - start) / 86400000);
}

function overlaps(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

async function nextBookingRef(transaction) {
  const counterRef = db.doc("meta/bookingCounter");
  const counterSnap = await transaction.get(counterRef);
  const current = counterSnap.exists ? Number(counterSnap.data().value || 0) : 0;
  const next = current + 1;
  transaction.set(counterRef, { value: next }, { merge: true });
  return `GLH-${String(next).padStart(6, "0")}`;
}

exports.createBooking = onCall({ region: "us-central1" }, async (request) => {
  const data = request.data || {};
  const room = ROOM_CATALOG[data.roomId];

  if (!room) throw new HttpsError("invalid-argument", "Xona turi noto'g'ri.");
  if (!data.guestName || data.guestName.trim().length < 3) {
    throw new HttpsError("invalid-argument", "Ism noto'g'ri.");
  }
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    throw new HttpsError("invalid-argument", "Email noto'g'ri.");
  }
  if (!data.phone || String(data.phone).trim().length < 7) {
    throw new HttpsError("invalid-argument", "Telefon noto'g'ri.");
  }

  const checkIn = parseDate(data.checkIn);
  const checkOut = parseDate(data.checkOut);
  if (!checkIn || !checkOut || checkOut <= checkIn) {
    throw new HttpsError("invalid-argument", "Sanalar noto'g'ri.");
  }

  const guestCount = Number(data.guestCount || 0);
  if (!guestCount || guestCount > room.capacity) {
    throw new HttpsError("invalid-argument", "Mehmonlar soni xona sig'imidan oshib ketdi.");
  }

  const nights = daysBetween(checkIn, checkOut);
  if (nights <= 0) throw new HttpsError("invalid-argument", "Booking davomiyligi noto'g'ri.");

  const activeSnap = await db
    .collection("bookings")
    .where("roomId", "==", data.roomId)
    .where("isActive", "==", true)
    .get();

  const hasConflict = activeSnap.docs.some((doc) => {
    const booking = doc.data();
    return overlaps(data.checkIn, data.checkOut, booking.checkIn, booking.checkOut);
  });
  if (hasConflict) {
    throw new HttpsError("already-exists", "Tanlangan sanalarda xona band.");
  }

  const paymentMethod = ["cash", "click", "payme"].includes(data.paymentMethod)
    ? data.paymentMethod
    : "cash";
  const totalPrice = room.price * nights;

  const booking = await db.runTransaction(async (transaction) => {
    const bookingRef = await nextBookingRef(transaction);
    const bookingDoc = db.collection("bookings").doc();
    const payload = {
      bookingRef,
      guestName: data.guestName.trim(),
      email: data.email.trim().toLowerCase(),
      phone: String(data.phone).trim(),
      roomId: data.roomId,
      roomName: room.name,
      nightlyPrice: room.price,
      totalPrice,
      guestCount,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      nights,
      source: data.source || "",
      notes: data.notes || "",
      status: "pending",
      paymentStatus: "unpaid",
      paymentMethod,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      userId: request.auth?.uid || null,
    };
    transaction.set(bookingDoc, payload);
    return { id: bookingDoc.id, bookingRef, status: payload.status };
  });

  return booking;
});

exports.updateBookingStatus = onCall({ region: "us-central1" }, async (request) => {
  await requireAdmin(request);

  const { bookingId, status } = request.data || {};
  if (!bookingId || !["pending", "confirmed", "cancelled"].includes(status)) {
    throw new HttpsError("invalid-argument", "Booking status noto'g'ri.");
  }

  await db.doc(`bookings/${bookingId}`).update({
    status,
    isActive: status !== "cancelled",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true };
});

exports.updatePaymentStatus = onCall({ region: "us-central1" }, async (request) => {
  await requireAdmin(request);

  const { bookingId, paymentStatus } = request.data || {};
  if (!bookingId || !["unpaid", "paid", "refunded"].includes(paymentStatus)) {
    throw new HttpsError("invalid-argument", "Payment status noto'g'ri.");
  }

  await db.doc(`bookings/${bookingId}`).update({
    paymentStatus,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true };
});

exports.deleteBooking = onCall({ region: "us-central1" }, async (request) => {
  await requireAdmin(request);

  const { bookingId } = request.data || {};
  if (!bookingId) throw new HttpsError("invalid-argument", "bookingId talab qilinadi.");

  await db.doc(`bookings/${bookingId}`).delete();
  return { success: true };
});
