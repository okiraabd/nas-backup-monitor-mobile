# NAS Backup Monitor Mobile

Aplikasi Android berbasis Expo Router untuk memantau backup NAS dan Ceph melalui
backend `nas-backup-monitor`. Aplikasi ini adalah client operasional untuk role
`admin` dan `operator`; collector tetap berjalan sebagai service backend dan
tidak ditampilkan sebagai halaman mobile.

## Fitur

- Login JWT dengan access token terenkripsi di Expo SecureStore.
- Seluruh teks yang tampil kepada pengguna menggunakan bahasa Inggris; waktu
  operasional tetap ditampilkan dalam zona Asia/Jakarta dengan label WIB.
- Dashboard ringkas untuk freshness NAS, health/storage Ceph, tren backup, dan
  backup gagal terbaru.
- Backup logs dengan filter, pagination, detail, acknowledge, dan aksi hapus
  khusus admin.
- Monitoring NAS/Ceph dengan snapshot, rentang history 1 jam sampai 30 hari,
  dan grafik metrik.
- Reports untuk melihat, membuat, mengunduh PDF berautentikasi, dan menghapus
  report sesuai role.
- Refresh manual dan waktu pembaruan terakhir pada halaman data utama.
- Profile, informasi API aktif, serta logout yang me-revoke token di server.

## Pola refresh

Polling hanya aktif ketika aplikasi berada di foreground dan tab terkait sedang
aktif. Saat aplikasi kembali aktif atau pengguna kembali ke tab, data halaman
langsung dimuat ulang. Ini mencegah request 10 detik terus berjalan di belakang
layar.

| Halaman/data | Perilaku |
|---|---|
| Dashboard status, NAS, dan backup gagal | Otomatis setiap 10 detik. |
| Dashboard activity trend | Otomatis setiap 60 detik karena datanya berubah lebih lambat. |
| Monitor NAS/Ceph snapshot | Otomatis setiap 10 detik pada segmen yang aktif. |
| Monitor history | Dimuat saat filter berubah dan di-refresh ketika snapshot baru terdeteksi. |
| Logs | Refresh saat tab kembali aktif dan melalui tombol refresh. |
| Reports | Refresh saat tab kembali aktif dan melalui tombol refresh. |

Request history mengirim `max_points=300` agar API melakukan sampling di
database. Grafik mobile membatasi hasil render hingga 120 titik untuk menjaga
SVG tetap ringan pada Android.

## Prasyarat

- Node.js LTS yang kompatibel dengan Expo SDK 54.
- Android emulator, atau perangkat Android dengan Expo Go yang kompatibel.
- Backend `nas-backup-monitor` yang dapat dijangkau dari perangkat.

Gunakan dependency dari lockfile:

~~~bash
npm ci
~~~

`expo-linear-gradient` adalah dependency wajib grafik dan sudah tercantum pada
`package.json`. Jalankan `npm ci` kembali bila Metro melaporkan package gradient
tidak ditemukan.

## Konfigurasi API

Salin template environment:

~~~bash
cp .env.example .env
~~~

Di PowerShell, perintah setaranya adalah:

~~~powershell
Copy-Item .env.example .env
~~~

Alamat API dipilih dengan urutan berikut:

1. `EXPO_PUBLIC_API_BASE_URL` dari `.env`.
2. `expo.extra.apiBaseUrl` dari `app.json`.
3. Fallback Android emulator `http://10.0.2.2:8000/api`.

Template `.env.example` memakai `http://localhost:8000/api`. Ganti nilai itu
sebelum menjalankan Metro bila memakai emulator, perangkat LAN, atau API publik;
selama variabel tersebut ada, fallback emulator tidak akan dipakai.

Gunakan base URL lengkap dengan prefix `/api` dan tanpa endpoint tambahan.
Contoh API publik:

~~~env
EXPO_PUBLIC_API_BASE_URL=https://api-monitor.qra.web.id/api
~~~

Contoh untuk backend lokal:

| Lingkungan | Nilai |
|---|---|
| Android emulator | `http://10.0.2.2:8000/api` |
| Perangkat pada Wi-Fi yang sama | `http://192.168.1.20:8000/api` |
| Perangkat USB dengan `adb reverse tcp:8000 tcp:8000` | `http://localhost:8000/api` |

Setelah mengubah `.env`, hentikan Metro lalu jalankan kembali dengan cache
bersih. Nilai environment Expo dibaca saat bundle dibuat:

~~~bash
npx expo start --clear
~~~

HTTPS wajib untuk deployment publik. `usesCleartextTraffic` masih aktif pada
konfigurasi Android agar backend HTTP lokal dapat dipakai saat development.

## Menjalankan aplikasi

Jalankan Metro dari direktori proyek:

~~~bash
npm ci
npx expo start --clear
~~~

Kemudian:

1. Hubungkan Android dan pastikan USB debugging aktif, atau nyalakan emulator.
2. Buka proyek melalui Expo Go dari QR/deep link yang ditampilkan Metro.
3. Tekan `a` pada terminal Metro untuk membuka Android secara otomatis bila
   perangkat terdeteksi oleh ADB.

Perintah npm yang tersedia:

| Perintah | Fungsi |
|---|---|
| `npm run start` | Menjalankan Metro/Expo. |
| `npm run android` | Menjalankan Metro dan membuka Android. |
| `npm run web` | Menjalankan target web untuk pemeriksaan dasar. |
| `npm run typecheck` | Memeriksa TypeScript tanpa membuat output. |
| `npm run lint` | Menjalankan ESLint melalui Expo. |

## Autentikasi

Hanya akun aktif dengan role `admin` atau `operator` yang dapat memakai aplikasi
mobile. Akun machine `service` dan `collector` sengaja ditolak walaupun dapat
memperoleh token dari API.

Aplikasi tidak memakai refresh token jangka panjang. Respons 401 menghapus sesi
lokal dan meminta pengguna login kembali. Saat logout, aplikasi mencoba revoke
token melalui API lalu selalu menghapus token dari SecureStore.

Dengan `SEED_MODE=users` atau `demo`, backend membuat akun development berikut:

- `admin` / `admin123`
- `operator` / `operator`

Password seed hanya untuk bootstrap development. Rotasi password, gunakan
`SEED_MODE=none`, dan jangan memakai kredensial contoh pada production.

## Verifikasi

Sebelum handoff, jalankan:

~~~bash
npm run typecheck
npm run lint
npx expo export --platform android
~~~

Lakukan smoke test login, Dashboard, Logs, Monitoring NAS/Ceph, Reports,
download PDF, pembatasan aksi admin, perpindahan foreground/background, dan
logout terhadap API deployment yang sebenarnya.
