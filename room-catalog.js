import { getLang } from "./i18n.js?v=20260423f";

const ROOM_DATA = {
  uz: [
    {
      id: "standard-room",
      badge: "Mashhur",
      name: "Standart Xona",
      description:
        "Qulay va zamonaviy jihozlangan xona. Shahar manzarasi, ish stoli va barcha zarur qulayliklar mavjud.",
      price: 89,
      capacity: 2,
      amenities: ["Smart TV", "Konditsioner", "Mini-bar", "Hammom"],
    },
    {
      id: "deluxe-room",
      badge: "Deluxe",
      name: "Deluxe Xona",
      description:
        "King-size karavot, shaxsiy balkon va panoramik shahar ko'rinishi bilan premium dam olish muhiti.",
      price: 149,
      capacity: 3,
      amenities: ["King Bed", "Balkon", "Jacuzzi", "Mini-bar"],
    },
    {
      id: "lux-suite",
      badge: "Suite",
      name: "Lyuks Suite",
      description:
        "Alohida mehmonxona va yotoqxona, keng joy va premium xizmatlar bilan oilaviy dam olish uchun mos variant.",
      price: 299,
      capacity: 4,
      amenities: ["2 xona", "Premium Jacuzzi", "Butler", "Champagne"],
    },
  ],
  ru: [
    {
      id: "standard-room",
      badge: "Популярно",
      name: "Стандартный номер",
      description: "Уютный современный номер с видом на город, рабочим столом и всем необходимым.",
      price: 89,
      capacity: 2,
      amenities: ["Smart TV", "Кондиционер", "Мини-бар", "Ванная"],
    },
    {
      id: "deluxe-room",
      badge: "Deluxe",
      name: "Номер Deluxe",
      description: "King-size кровать, личный балкон и панорамный вид на город для премиального отдыха.",
      price: 149,
      capacity: 3,
      amenities: ["King Bed", "Балкон", "Джакузи", "Мини-бар"],
    },
    {
      id: "lux-suite",
      badge: "Suite",
      name: "Люкс Suite",
      description: "Отдельные гостиная и спальня, простор и премиальный сервис для семейного отдыха.",
      price: 299,
      capacity: 4,
      amenities: ["2 комнаты", "Премиум джакузи", "Батлер", "Шампанское"],
    },
  ],
  en: [
    {
      id: "standard-room",
      badge: "Popular",
      name: "Standard Room",
      description: "Comfortable modern room with city view, desk, and all essential amenities.",
      price: 89,
      capacity: 2,
      amenities: ["Smart TV", "Air conditioning", "Mini-bar", "Bathroom"],
    },
    {
      id: "deluxe-room",
      badge: "Deluxe",
      name: "Deluxe Room",
      description: "King-size bed, private balcony, and panoramic city view for a premium stay.",
      price: 149,
      capacity: 3,
      amenities: ["King Bed", "Balcony", "Jacuzzi", "Mini-bar"],
    },
    {
      id: "lux-suite",
      badge: "Suite",
      name: "Luxury Suite",
      description: "Separate living room and bedroom with spacious premium comfort for families.",
      price: 299,
      capacity: 4,
      amenities: ["2 rooms", "Premium Jacuzzi", "Butler", "Champagne"],
    },
  ],
};

export function getRooms() {
  const lang = getLang();
  return ROOM_DATA[lang] || ROOM_DATA.uz;
}

export function getRoomById(roomId) {
  return getRooms().find((room) => room.id === roomId) || null;
}
