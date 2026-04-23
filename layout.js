import { applyI18n, getLang, setLang, t } from "./i18n.js";

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
        <a class="${navClass(page, "hotels")}" href="./hotels.html" data-i18n="nav.hotels">Mehmonxonalar</a>
        <a class="${navClass(page, "bookings")}" href="./my-bookings.html" data-i18n="nav.bookings">Mening bronlarim</a>
      </div>
      <div class="nav-actions">
        <div class="lang-switcher" role="group" aria-label="${t("nav.lang")}">
          <button type="button" class="lang-btn ${lang === "uz" ? "lang-btn-active" : ""}" data-set-lang="uz" title="O‘zbek">UZ</button>
          <button type="button" class="lang-btn ${lang === "ru" ? "lang-btn-active" : ""}" data-set-lang="ru" title="Русский">RU</button>
          <button type="button" class="lang-btn ${lang === "en" ? "lang-btn-active" : ""}" data-set-lang="en" title="English">EN</button>
        </div>
        <a class="btn-outline ${page === "account" ? "nav-link-active" : ""}" href="./account.html" data-i18n="nav.account">Kirish</a>
        <a class="btn-outline nav-admin-link ${page === "admin" || page === "login" ? "nav-link-active" : ""}" href="./login.html" data-i18n="nav.admin">Admin</a>
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
}
