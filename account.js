import { auth, getAdminRole } from "./firebase-client.js";
import { initLayout } from "./layout.js";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

initLayout();

const message = document.getElementById("account-message");
const guestForms = document.getElementById("account-guest-forms");
const sessionBox = document.getElementById("account-session");
const emailSpan = document.getElementById("account-email");

function showMessage(type, text) {
  message.className = `status-strip ${type}`;
  message.textContent = text;
  message.classList.remove("hidden");
}

function showGuestUi() {
  guestForms.classList.remove("hidden");
  sessionBox.classList.add("hidden");
}

function showSessionUi(email) {
  guestForms.classList.add("hidden");
  sessionBox.classList.remove("hidden");
  emailSpan.textContent = email;
}

onAuthStateChanged(auth, async (user) => {
  message.classList.add("hidden");
  if (!user) {
    showGuestUi();
    return;
  }
  const isAdmin = await getAdminRole(user);
  if (isAdmin) {
    window.location.replace("./admin.html");
    return;
  }
  showSessionUi(user.email || "");
});

document.getElementById("register-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    showMessage("status-ok", "Akkaunt yaratildi. Endi bron qilishingiz mumkin.");
  } catch (err) {
    showMessage("status-error", err.message || "Ro‘yxatdan o‘tishda xato.");
  }
});

document.getElementById("signin-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("sign-email").value.trim();
  const password = document.getElementById("sign-password").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    const user = auth.currentUser;
    if (user && (await getAdminRole(user))) {
      window.location.replace("./admin.html");
      return;
    }
    showMessage("status-ok", "Xush kelibsiz.");
  } catch (err) {
    showMessage("status-error", err.message || "Kirishda xato.");
  }
});

document.getElementById("account-logout").addEventListener("click", async () => {
  await signOut(auth);
  showGuestUi();
});
