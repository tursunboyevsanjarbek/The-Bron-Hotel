# Grand Luxe Hotel Booking

Bu loyiha GitHub Pages uchun statik frontend va Firebase backend kombinatsiyasidan iborat.

## Nimalar ishlaydi

- Public booking forma
- Firestore transaction orqali booking validation
- Availability va overlap bloklash (`bookingLocks`)
- Booking reference (`GLH-000001` ko'rinishida)
- Firebase Authentication orqali admin login
- Admin dashboard: booking status, payment status, delete
- Firestore security rules

## Asosiy fayllar

- `index.html` - public booking sahifasi
- `main.js` - booking forma oqimi
- `login.html` va `login.js` - admin login
- `admin.html` va `admin.js` - admin dashboard
- `firebase-client.js` - umumiy Firebase init
- `firestore.rules` - Firestore security qoidalari

## Firebase sozlash

1. Firebase project yarating.
2. Authentication ichida `Email/Password` ni yoqing.
3. Firestore Database yarating.
4. `firebase-client.js` ichidagi config qiymatlarini o'zingizniki bilan yangilang.
5. Firestore rules va indexes deploy qiling:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## Birinchi admin foydalanuvchini yaratish

1. Firebase Authentication orqali admin user yarating.
2. Firestore ichida quyidagi hujjatni qo'shing:

`roles/admins/users/<ADMIN_UID>`

Hujjat body:

```json
{
  "enabled": true,
  "email": "admin@example.com",
  "createdAt": "manual"
}
```

Shundan keyin admin foydalanuvchi `login.html` orqali tizimga kira oladi.

## GitHub Pages deploy

Frontend fayllari statik:

- `index.html`
- `admin.html`
- `login.html`
- `style.css`
- `main.js`
- `admin.js`
- `login.js`
- `firebase-client.js`
- `room-catalog.js`

Ularni GitHub repo root qismida saqlang va GitHub Pages ni `main` branch root papkaga yoqing.

## Eslatma

- Spark rejim uchun bookinglar client transaction orqali yoziladi.
- `bookingLocks` kolleksiyasi sanalar overlap bo'lishini bloklaydi.
- Admin bo'lmagan foydalanuvchi bookinglar kolleksiyasini o'qiy olmaydi.
