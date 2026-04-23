import { rooms } from "./room-catalog.js";
import { initLayout } from "./layout.js";
import { applyI18n, t } from "./i18n.js";

initLayout();
applyI18n(document.body);

const grid = document.getElementById("hotels-grid");
const empty = document.getElementById("hotels-empty");
const search = document.getElementById("hotel-search");
const minEl = document.getElementById("price-min");
const maxEl = document.getElementById("price-max");

function render(filtered) {
  if (!filtered.length) {
    grid.innerHTML = "";
    empty.classList.remove("hidden");
    empty.textContent = t("hotels.empty");
    return;
  }
  empty.classList.add("hidden");
  grid.innerHTML = filtered
    .map(
      (room) => `
      <article class="room-card">
        <div class="room-card-visual" aria-hidden="true"></div>
        <div class="room-card-content">
          <span class="badge">${room.badge}</span>
          <h3>${room.name}</h3>
          <p class="muted">${room.description}</p>
          <div class="price">$${room.price} <span class="price-unit">/ kecha</span></div>
          <div class="muted room-capacity">Sig'im: ${room.capacity} kishi</div>
          <div class="amenities">
            ${room.amenities.map((item) => `<span class="amenity">${item}</span>`).join("")}
          </div>
          <a class="btn btn-block" href="./index.html#booking">${t("hotels.book")}</a>
        </div>
      </article>
    `,
    )
    .join("");
}

function filterRooms() {
  const q = search.value.trim().toLowerCase();
  const min = Number(minEl.value) || 0;
  const max = Number(maxEl.value) || 1e9;
  const filtered = rooms.filter((room) => {
    const text = `${room.name} ${room.description} ${room.amenities.join(" ")}`.toLowerCase();
    const okText = !q || text.includes(q);
    const okPrice = room.price >= min && room.price <= max;
    return okText && okPrice;
  });
  render(filtered);
}

document.getElementById("hotel-reset").addEventListener("click", () => {
  search.value = "";
  minEl.value = "0";
  maxEl.value = "10000";
  filterRooms();
});

search.addEventListener("input", filterRooms);
minEl.addEventListener("change", filterRooms);
maxEl.addEventListener("change", filterRooms);

filterRooms();
