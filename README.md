# Grand Luxe Hotel Booking

Statik frontend (GitHub Pages yoki boshqa host) va Firebase (Firestore + ixtiyoriy Cloud Functions).

## Ketma-ket deploy (checklist)

1. **Firestore** (har doim): loyiha ildizida  
   `firebase deploy --only firestore:rules,firestore:indexes`

2. **Cloud Functions** (ixtiyoriy): faqat **Blaze** rejimida. Spark’da deploy qilinmaydi.  
   Loyihada `createBooking`, `updateBookingStatus`, `updatePaymentStatus`, `deleteBooking` bor; hozirgi veb-interfeys asosan **client-side** `runTransaction` bilan bron yaratadi. Funksiyalarni ishlatmoqchi bo‘lsangiz, konsolda rejimni yangilab:  
   `cd functions && npm ci && cd .. && firebase deploy --only functions`

3. **Sayt (GitHub Pages)**  
   - Repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**  
   - `main` ga push qilganda `.github/workflows/pages.yml` saytni avtomatik chiqaradi (statik fayllar `functions` va `.github` siz).

## Firebase sozlash

1. Firebase loyiha, **Authentication** → Email/Password.  
2. **Firestore** yoqing.  
3. `firebase-client.js` dagi config o‘z loyihangizga mos.  
4. Birinchi admin: `roles/admins/users/<UID>` hujjati `enabled: true`.

## Asosiy fayllar

| Fayl | Vazifa |
|------|--------|
| `index.html`, `main.js` | Bron formasi, galereya, SEO |
| `hotels.html`, `hotels.js` | Xonalar |
| `account.html`, `account.js` | Ro‘yxatdan o‘tish / kirish |
| `my-bookings.html`, `my-bookings.js` | Foydalanuvchi bronlari |
| `login.html`, `login.js` | Admin kirish |
| `admin.html`, `admin.js` | Admin panel, CSV, site sozlamalari |
| `firebase-client.js` | Firebase init, so‘rovlar |
| `layout.js`, `i18n.js` | Nav, til |
| `site-settings.js` | `siteSettings/public` o‘qish/yozish |
| `room-catalog.js` | Xona katalogi |
| `style.css` | Uslub |
| `robots.txt`, `sitemap.xml` | SEO |
| `firestore.rules`, `firestore.indexes.json` | Xavfsizlik va indekslar |
| `functions/index.js` | Callable API (Blaze) |

## Indekslar

`bookings` uchun Firestore’da ikkita composite indeks kutiladi:

- `userId` + `createdAt` — “Mening bronlarim”
- `roomId` + `isActive` — Cloud Function’dagi bandlik tekshiruvi (client transaction bilan ham mos)

## Eslatma

- `bookingLocks` sanalar ustidan ustma-ust tushishni bloklaydi.  
- Admin bo‘lmagan foydalanuvchi faqat o‘z `userId` si bilan bronlarni o‘qiy oladi (qoidalarga qarang).
