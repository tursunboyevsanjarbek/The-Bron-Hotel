import { auth, getAdminRole } from "./firebase-client.js";
import { initLayout } from "./layout.js?v=20260423f";
import { t } from "./i18n.js?v=20260423f";
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
const authFormTitle = document.getElementById("auth-form-title");
const authForm = document.getElementById("auth-form");
const authSubmit = document.getElementById("auth-submit");
const authSwitchText = document.getElementById("auth-switch-text");
const authSwitchLink = document.getElementById("auth-switch-link");

let mode = "login";

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

function setMode(nextMode) {
  mode = nextMode;
  const isLogin = mode === "login";

  authFormTitle.textContent = isLogin ? t("account.login") : t("account.register");
  authSubmit.textContent = isLogin ? t("account.login") : t("account.register");
  authSwitchText.textContent = isLogin ? t("account.noAccount") : t("account.hasAccount");
  authSwitchLink.textContent = isLogin ? t("account.register") : t("account.login");

  guestForms.querySelectorAll("[data-auth-mode]").forEach((btn) => {
    btn.classList.toggle("auth-mode-btn-active", btn.dataset.authMode === mode);
  });
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

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;
  try {
    if (mode === "register") {
      await createUserWithEmailAndPassword(auth, email, password);
      // Firebase register qilganda userni avtomatik login qiladi.
      // Talab bo'yicha qayta chiqib, foydalanuvchini qo'lda kirishga o'tkazamiz.
      await signOut(auth);
      setMode("login");
      document.getElementById("auth-password").value = "";
      showMessage("status-ok", t("account.registeredSuccess"));
      return;
    }
    await signInWithEmailAndPassword(auth, email, password);
    const user = auth.currentUser;
    if (user && (await getAdminRole(user))) {
      window.location.replace("./admin.html");
      return;
    }
    window.location.replace("./index.html");
  } catch (err) {
    showMessage("status-error", err.message || t("account.authError"));
  }
});

guestForms.querySelectorAll("[data-auth-mode]").forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.authMode));
});

authSwitchLink.addEventListener("click", () => {
  setMode(mode === "login" ? "register" : "login");
});

document.getElementById("account-logout").addEventListener("click", async () => {
  await signOut(auth);
  showGuestUi();
});

setMode("login");
