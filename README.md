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

URL API adalah konfigurasi build-time. Aplikasi membaca
`EXPO_PUBLIC_API_BASE_URL`; bila tidak tersedia pada development lokal, aplikasi
memakai fallback Android emulator `http://10.0.2.2:8000/api`. `app.json` tidak
menyimpan URL server. Gunakan base URL lengkap dengan prefix `/api` dan tanpa
endpoint tambahan.

### Development lokal

Salin template environment:

~~~bash
cp .env.example .env
~~~

Di PowerShell, perintah setaranya adalah:

~~~powershell
Copy-Item .env.example .env
~~~

Template `.env.example` memakai `http://localhost:8000/api`. Ganti nilai itu
sebelum menjalankan Metro bila memakai emulator, perangkat LAN, atau API publik;
selama variabel tersebut ada, fallback emulator tidak akan dipakai.

Contoh API publik:

~~~env
EXPO_PUBLIC_API_BASE_URL=https://api.example.com/api
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

File `.env` sengaja masuk `.gitignore`. Ia dipakai oleh Expo CLI lokal, tetapi
tidak tersedia pada EAS Build cloud karena tidak ikut di-upload.

### EAS Build cloud

Untuk build APK/AAB, simpan URL pada EAS Environment Variables agar URL tidak
perlu diduplikasi atau diubah di `eas.json` dan `app.json` setiap kali server
berganti. `EXPO_PUBLIC_` bukan secret: nilainya akan tertanam di bundle aplikasi
dan dapat dilihat pengguna.

Setup pertama untuk environment preview dan production:

~~~powershell
eas env:create --name EXPO_PUBLIC_API_BASE_URL --value https://api.example.com/api --environment preview --visibility plaintext
eas env:create --name EXPO_PUBLIC_API_BASE_URL --value https://api.example.com/api --environment production --visibility plaintext
~~~

Profil build perlu memilih environment EAS dan tidak lagi mendefinisikan
`EXPO_PUBLIC_API_BASE_URL` melalui blok `env` inline. Bentuk yang dianjurkan:

~~~json
{
  "build": {
    "preview": {
      "environment": "preview",
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "environment": "production",
      "autoIncrement": true,
      "android": { "buildType": "app-bundle" }
    }
  }
}
~~~

Periksa nilai yang tersimpan:

~~~powershell
eas env:list --environment preview
eas env:list --environment production
~~~

Untuk mengganti server tanpa mengedit file proyek:

~~~powershell
eas env:update --name EXPO_PUBLIC_API_BASE_URL --value https://server-baru.example.com/api --environment preview --visibility plaintext
eas env:update --name EXPO_PUBLIC_API_BASE_URL --value https://server-baru.example.com/api --environment production --visibility plaintext
~~~

Sinkronkan environment EAS ke `.env` lokal bila ingin memakai URL yang sama saat
development:

~~~powershell
eas env:pull --environment preview
~~~

Perubahan URL tidak mengubah APK yang sudah terpasang. Jalankan build baru dan
install update APK agar URL baru tertanam di bundle.

HTTPS wajib untuk deployment publik. Build Android standalone menonaktifkan
cleartext traffic; profil APK dan AAB menggunakan API publik HTTPS. Expo Go
tetap dapat digunakan untuk alur development lokal yang dijelaskan di atas.

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

## Membuat APK Android

Profil `preview` pada `eas.json` menghasilkan APK standalone yang dapat disimpan,
dipindahkan ke perangkat lain, dan di-install tanpa Expo Go. Sebelum build,
pastikan `EXPO_PUBLIC_API_BASE_URL` tersedia pada EAS environment `preview`.

Install EAS CLI dan login dengan akun Expo yang memiliki akses ke proyek EAS:

~~~powershell
npm install --global eas-cli
eas login
~~~

Jalankan build dari root proyek mobile:

~~~powershell
eas build --platform android --profile preview
~~~

Pada build Android pertama, izinkan EAS membuat dan menyimpan Android keystore.
Setelah build selesai, EAS menampilkan URL artifact. Buka URL tersebut dan simpan
file `.apk` ke komputer.

Untuk instalasi melalui USB:

~~~powershell
adb devices
adb install -r .\path\to\nas-backup-monitor.apk
~~~

Alternatifnya, kirim APK ke perangkat, buka file tersebut, lalu izinkan
`Install unknown apps` untuk aplikasi file manager atau browser yang digunakan.
Android mungkin menampilkan peringatan karena APK tidak berasal dari Play Store.

Profil `production` menghasilkan AAB untuk Google Play dan tidak dapat di-install
langsung seperti APK:

~~~powershell
eas build --platform android --profile production
~~~

Nama aplikasi, package Android, ikon, dan splash yang digunakan build:

| Properti | Nilai |
|---|---|
| Nama launcher | NAS Backup Monitor |
| Android package | `id.web.qra.nasbackupmonitor` |
| Ikon utama | `assets/images/app-icon-v4.png` |
| Adaptive foreground | `assets/images/adaptive-foreground-v2.png` |
| Splash mark | `assets/images/splash-mark-v2.png` |
| Splash background | `#020817` |

Jangan mengubah Android package setelah APK mulai didistribusikan. Android akan
menganggap package berbeda sebagai aplikasi yang berbeda. Simpan akses akun EAS
dan keystore karena update berikutnya harus ditandatangani dengan key yang sama.

## Autentikasi

Hanya akun aktif dengan role `admin` atau `operator` yang dapat memakai aplikasi
mobile. Akun machine `service` dan `collector` sengaja ditolak walaupun dapat
memperoleh token dari API.

Aplikasi tidak memakai refresh token jangka panjang. Respons 401 menghapus sesi
lokal dan meminta pengguna login kembali. Saat logout, aplikasi mencoba revoke
token melalui API lalu selalu menghapus token dari SecureStore.

Akun development dibuat oleh backend saat memakai `SEED_MODE=users` atau `demo`.
Lihat dokumentasi backend untuk proses bootstrap, segera rotasi semua password,
gunakan `SEED_MODE=none`, dan jangan memakai kredensial seed pada production.

## Keamanan repository publik

- Jangan commit `.env`, token API, kredensial pengguna, atau URL server internal.
- Simpan URL build cloud melalui EAS Environment Variables. Walaupun variabel
  `EXPO_PUBLIC_` bukan secret, cara ini mencegah URL deployment tersimpan di Git.
- Jangan commit keystore, private key, provisioning profile, atau file kredensial
  layanan. Pola file tersebut sudah dicakup oleh `.gitignore`.
- `owner`, `extra.eas.projectId`, dan Android package ID pada `app.json` adalah
  identifier publik, bukan secret. Nilai tersebut diperlukan untuk mengaitkan
  aplikasi dengan proyek EAS dan identitas paket Android.

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
