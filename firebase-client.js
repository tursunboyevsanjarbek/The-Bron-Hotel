import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCTciOvXVT3bFLsenbSzlnI3wmUFMSf7eQ",
  authDomain: "grand-hotel-sanjarbek.firebaseapp.com",
  projectId: "grand-hotel-sanjarbek",
  storageBucket: "grand-hotel-sanjarbek.firebasestorage.app",
  messagingSenderId: "1038620578598",
  appId: "1:1038620578598:web:24b1bcf1256a585a85e7e7",
  measurementId: "G-7G1SXPJP0X",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

await setPersistence(auth, browserLocalPersistence);

async function getAdminRole(user) {
  if (!user) return false;
  const roleRef = doc(db, "roles", "admins", "users", user.uid);
  const roleSnap = await getDoc(roleRef);
  return roleSnap.exists() && roleSnap.data().enabled === true;
}

function bookingsQuery() {
  return query(collection(db, "bookings"), orderBy("createdAt", "desc"));
}

export {
  auth,
  addDoc,
  bookingsQuery,
  db,
  deleteDoc,
  doc,
  getAdminRole,
  getDoc,
  onAuthStateChanged,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  updateDoc,
  collection,
};
