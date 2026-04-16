export const rooms = [
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
];

export function getRoomById(roomId) {
  return rooms.find((room) => room.id === roomId) || null;
}
