import {
  auth,
  getAdminRole,
  onAuthStateChanged,
} from "./firebase-client.js";
import {
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const form = document.getElementById("login-form");
const submit = document.getElementById("login-submit");
const message = document.getElementById("login-message");

function showMessage(type, text) {
  message.className = `status-strip ${type}`;
  message.textContent = text;
  message.classList.remove("hidden");
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  const isAdmin = await getAdminRole(user);
  if (isAdmin) {
    window.location.href = "./admin.html";
    return;
  }
  await signOut(auth);
  showMessage("status-error", "Bu foydalanuvchida admin huquqi yo'q.");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  submit.disabled = true;
  submit.textContent = "Tekshirilmoqda...";

  try {
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value.trim();
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    const isAdmin = await getAdminRole(user);

    if (!isAdmin) {
      await signOut(auth);
      throw new Error("Admin ruxsati topilmadi.");
    }

    window.location.href = "./admin.html";
  } catch (error) {
    showMessage("status-error", error.message || "Kirishda xatolik yuz berdi.");
  } finally {
    submit.disabled = false;
    submit.textContent = "Kirish";
  }
});
