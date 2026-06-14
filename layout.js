import { applyI18n, getLang, setLang, t } from "./i18n.js?v=20260423f";
import { auth, onAuthStateChanged } from "./firebase-client.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

function navClass(page, id) {
  return page === id ? "nav-link nav-link-active" : "nav-link";
}

export function initLayout() {
  const header = document.getElementById("site-header");
  if (!header) return;

  const page = document.body.dataset.page || "index";
  const lang = getLang();

  header.innerHTML = `
    <nav class="nav" aria-label="Asosiy navigatsiya">
      <a class="brand" href="./index.html"><span class="brand-mark" aria-hidden="true"></span> Grand Luxe Hotel</a>
      <div class="nav-links">
        <a class="${navClass(page, "index")}" href="./index.html" data-i18n="nav.home">Bosh sahifa</a>
        <a class="${navClass(page, "bookings")}" href="./my-bookings.html" data-i18n="nav.bookings">Mening bronlarim</a>
      </div>
      <div class="nav-actions">
        <div class="lang-switcher" role="group" aria-label="${t("nav.lang")}">
          <button type="button" class="lang-btn ${lang === "uz" ? "lang-btn-active" : ""}" data-set-lang="uz" title="O‘zbek">UZ</button>
          <button type="button" class="lang-btn ${lang === "ru" ? "lang-btn-active" : ""}" data-set-lang="ru" title="Русский">RU</button>
          <button type="button" class="lang-btn ${lang === "en" ? "lang-btn-active" : ""}" data-set-lang="en" title="English">EN</button>
        </div>
        <div id="auth-actions" class="auth-actions"></div>
      </div>
    </nav>
  `;

  header.querySelectorAll("[data-set-lang]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const code = btn.getAttribute("data-set-lang");
      setLang(code);
      window.location.reload();
    });
  });

  applyI18n(header);
  applyI18n(document.body);

  const authActions = header.querySelector("#auth-actions");
  const renderGuest = () => {
    authActions.innerHTML = `
      <a class="btn-outline ${page === "account" ? "nav-link-active" : ""}" href="./account.html" data-i18n="nav.login">${t("nav.login")}</a>
      <a class="btn-outline ${page === "admin" || page === "login" ? "nav-link-active" : ""}" href="./login.html" data-i18n="nav.adminLogin">${t("nav.adminLogin")}</a>
    `;
    applyI18n(authActions);
  };

  const renderUser = () => {
    authActions.innerHTML = `
      <a class="btn-outline ${page === "account" ? "nav-link-active" : ""}" href="./account.html" data-i18n="nav.profile">${t("nav.profile")}</a>
      <button type="button" class="btn-outline" id="nav-logout-btn" data-i18n="nav.logout">${t("nav.logout")}</button>
      <a class="btn-outline ${page === "admin" || page === "login" ? "nav-link-active" : ""}" href="./login.html" data-i18n="nav.adminLogin">${t("nav.adminLogin")}</a>
    `;
    authActions.querySelector("#nav-logout-btn")?.addEventListener("click", async () => {
      await signOut(auth);
      window.location.reload();
    });
    applyI18n(authActions);
  };

  renderGuest();
  onAuthStateChanged(auth, (user) => {
    if (user) renderUser();
    else renderGuest();
  });
}
