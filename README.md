# NAS Backup Monitor — Mobile

Aplikasi Android untuk memantau backup NAS dan Ceph secara real-time. Dibangun
di atas Expo (React Native) dan terhubung ke backend `nas-backup-monitor` melalui
REST API. Hanya akun aktif dengan role **`admin`** atau **`operator`** yang dapat
masuk; akun machine (`service`, `collector`) ditolak.

---

## Daftar Isi

- [Tech Stack](#tech-stack)
- [Fitur](#fitur)
- [Struktur Proyek](#struktur-proyek)
- [Prasyarat](#prasyarat)
- [Setup](#setup)
- [Menjalankan di Development](#menjalankan-di-development)
- [Pola Refresh & Polling](#pola-refresh--polling)
- [Autentikasi](#autentikasi)
- [Membangun APK — EAS Build](#membangun-apk--eas-build)
- [Keamanan Repository](#keamanan-repository)
- [Verifikasi Sebelum Handoff](#verifikasi-sebelum-handoff)

---

## Tech Stack

| Kategori | Library / Tool |
|---|---|
| Framework | [Expo](https://expo.dev) SDK 54, React Native 0.81 |
| Bahasa | TypeScript |
| Routing | [Expo Router](https://docs.expo.dev/router/introduction/) v6 (file-based) |
| Data fetching | [TanStack Query](https://tanstack.com/query) v5 |
| HTTP client | [Axios](https://axios-http.com) |
| State global | [Zustand](https://zustand-demo.pmnd.rs) v5 |
| Form & validasi | [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) |
| Charts | [react-native-gifted-charts](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts) |
| Token storage | [expo-secure-store](https://docs.expo.dev/versions/v54.0.0/sdk/securestore/) |
| Build | [EAS Build](https://docs.expo.dev/build/introduction/) |

---

## Fitur

### Dashboard
- Ringkasan jumlah NAS berdasarkan status freshness: **fresh / stale / offline**.
- Health Ceph (`HEALTH_OK` / `HEALTH_WARN` / dll.) dan persentase pemakaian
  storage dengan progress bar.
- Bar chart tren backup **7 hari terakhir** (sukses vs gagal), polling setiap
  60 detik.
- Daftar **backup gagal terbaru** (maks. 5) dengan indikator acknowledge,
  polling setiap 10 detik.
- Status backup terakhir per NAS, dimuat paralel dengan TanStack `useQueries`.

### Backup Logs
- Daftar log backup dengan **filter**: status (All / Success / Failed), NAS,
  nama job, dan tanggal (format YYYY-MM-DD zona WIB).
- **Infinite scroll** — data dimuat halaman demi halaman (15 per halaman),
  tombol *Load more* muncul selama masih ada halaman berikutnya.
- **Detail log** (`/logs/[id]`): informasi eksekusi (waktu mulai/selesai,
  durasi, engine, source path), transfer stats (ukuran, jumlah file, error),
  dan raw payload JSON yang bisa di-scroll horizontal.
- **Acknowledge** kegagalan backup dengan remark wajib (tersedia untuk admin
  & operator jika log belum di-acknowledge).
- **Hapus log** (admin only), dengan konfirmasi Alert.

### Monitoring
- **Segmented control** untuk beralih antara tampilan NAS dan Ceph.
- **NAS**: pilih NAS dari pill selector → tampil snapshot metrik (CPU, Memory,
  Disk usage % + ukuran absolut, Uptime) + grafik history CPU & Memory.
- **Ceph**: snapshot health, OSD (Up / In / Total), storage usage + grafik
  history storage.
- Selector **timeframe** grafik: 1h, 6h, 12h, 24h, 7d, 30d.
- Grafik history diperbarui otomatis saat timestamp `last_collected_at` pada
  snapshot berubah — tidak bergantung pada timer tersendiri.

### Reports
- Daftar report PDF yang sudah dibuat, dapat dicari berdasarkan nama file.
- **Generate report**: tentukan rentang tanggal, filter NAS (opsional),
  dan nama kustom — divalidasi dengan Zod + React Hook Form.
- **Download PDF berautentikasi** langsung ke storage perangkat, lalu dibuka
  dengan share sheet native.
- **Hapus report** (admin only), dengan konfirmasi Alert.

### Profile
- Informasi akun: nama lengkap, username, role, dan waktu login terakhir (zona
  WIB).
- Informasi aplikasi: nomor versi dan URL API aktif yang sedang digunakan.
- **Logout** dengan konfirmasi Alert — me-revoke token di server lalu
  membersihkan SecureStore.

---

## Struktur Proyek

```
nas-backup-monitor-mobile/
│
├── app/                             # Screens — Expo Router file-based routing
│   ├── _layout.tsx                  # Root layout: QueryClient, QueryLifecycleProvider, AuthProvider
│   ├── index.tsx                    # Entry point: redirect ke /login atau /(tabs)
│   ├── login.tsx                    # Halaman login
│   ├── (tabs)/                      # Tab navigator (5 tab)
│   │   ├── _layout.tsx              # Konfigurasi tab bar & guard auth
│   │   ├── index.tsx                # Dashboard
│   │   ├── logs.tsx                 # Backup Logs (dengan filter & infinite scroll)
│   │   ├── monitor.tsx              # Monitoring NAS & Ceph
│   │   ├── reports.tsx              # Reports
│   │   └── profile.tsx              # Profile & logout
│   └── logs/
│       └── [id].tsx                 # Detail log (dynamic route)
│
├── src/
│   ├── api/                         # Fungsi pemanggil REST API
│   │   ├── client.ts                # Axios instance, interceptors, error helpers, retry logic
│   │   ├── auth.ts                  # login, me, refresh, logout
│   │   ├── logs.ts                  # list, detail, acknowledge, bulkDelete
│   │   ├── monitor.ts               # summary, activityTrend, nasList, nasSnapshot, nasHistory, ceph*
│   │   ├── reports.ts               # list, generate, delete, bulkDelete, downloadUrl, downloadHeaders
│   │   └── token.ts                 # Manajemen token: SecureStore + in-memory cache
│   │
│   ├── components/                  # Komponen UI yang dipakai ulang
│   │   ├── ui.tsx                   # Screen, Card, AppText, Button, IconButton, Field, Badge, dsb
│   │   ├── charts.tsx               # MetricLineChart (area), ActivityBarChart (bar)
│   │   ├── selectors.tsx            # PillSelector (scroll horizontal), SegmentedControl
│   │   ├── status-badges.tsx        # BackupStatusBadge, FreshnessBadge, FreshnessDot, KeyValue
│   │   ├── refresh-controls.tsx     # RefreshButton, UpdatedAt
│   │   └── modal-styles.ts          # Style bersama untuk modal bottom-sheet
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   └── AuthProvider.tsx     # Bootstrap sesi, persistLogin(), logout()
│   │   └── query/
│   │       └── QueryLifecycleProvider.tsx  # Polling lifecycle: useScreenPollingInterval, useRefreshOnScreenFocus
│   │
│   ├── lib/                         # Utility murni (tidak ada side-effect)
│   │   ├── datetime.ts              # Format tanggal/waktu dalam zona WIB (Jakarta)
│   │   ├── format.ts                # formatBytes, formatDurationSeconds, formatUptimeSeconds, percentText
│   │   ├── env.ts                   # Resolusi URL API dari environment variable
│   │   ├── query-keys.ts            # Konstanta kunci cache TanStack Query
│   │   ├── refresh.ts               # Konstanta interval polling (ACTIVE_REFRESH_MS, SLOW_REFRESH_MS)
│   │   └── status.ts                # freshnessColor, backupStatusColor, isHumanRole
│   │
│   ├── store/
│   │   └── auth-store.ts            # Zustand store: user, bootstrapped, bootstrapError
│   │
│   ├── theme/
│   │   └── colors.ts                # Palet warna, spacing, radius, TAB_BOTTOM_PADDING
│   │
│   └── types/
│       └── api.ts                   # Tipe TypeScript untuk seluruh response API
│
├── assets/images/                   # Ikon, adaptive icon, splash screen
├── .env.example                     # Template environment — salin ke .env sebelum menjalankan
├── app.json                         # Konfigurasi Expo (nama, package Android, plugin, EAS)
├── eas.json                         # Profil EAS Build (preview APK, production AAB)
├── package.json
└── tsconfig.json
```

---

## Prasyarat

- **Node.js** LTS yang kompatibel dengan Expo SDK 54.
- **npm** — gunakan lockfile (`npm ci`) untuk memastikan versi dependency yang sama.
- **Android emulator** (via Android Studio) **atau** perangkat Android dengan Expo Go.
- **Backend** `nas-backup-monitor` yang dapat dijangkau dari emulator/perangkat.

---

## Setup

### 1. Install dependency

```bash
npm ci
```

### 2. Konfigurasi environment

Salin template:

```bash
# macOS / Linux
cp .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env
```

Buka `.env` dan sesuaikan URL API:

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000/api
```

> File `.env` masuk `.gitignore` dan tidak pernah di-commit. Lihat `.env.example`
> untuk contoh nilai yang tersedia.

### Referensi URL per lingkungan

| Lingkungan | `EXPO_PUBLIC_API_BASE_URL` |
|---|---|
| Android emulator (fallback default) | `http://10.0.2.2:8000/api` |
| Perangkat di jaringan Wi-Fi yang sama | `http://<IP-komputer-di-LAN>:8000/api` |
| Perangkat USB (`adb reverse tcp:8000 tcp:8000`) | `http://localhost:8000/api` |
| Server / VPS | `https://api.example.com/api` |

URL dipilih dari: `EXPO_PUBLIC_API_BASE_URL` di `.env` → jika tidak ada, fallback
ke `http://10.0.2.2:8000/api`.

Gunakan base URL lengkap dengan prefix `/api` dan **tanpa** trailing slash.

---

## Menjalankan di Development

Setelah mengubah `.env`, selalu jalankan dengan flag `--clear` agar Metro membaca
ulang nilai environment:

```bash
npx expo start --clear
```

Kemudian pilih target dari terminal Metro:

| Cara | Langkah |
|---|---|
| Android emulator | Tekan `a` di terminal Metro |
| Expo Go (perangkat) | Scan QR code yang muncul di terminal |
| Perangkat via USB | Pastikan USB debugging aktif, tekan `a` |

### Script npm yang tersedia

| Perintah | Fungsi |
|---|---|
| `npm run start` | Jalankan Metro / Expo dev server |
| `npm run android` | Jalankan Metro dan buka langsung di Android |
| `npm run typecheck` | Periksa TypeScript tanpa output build |
| `npm run lint` | Jalankan ESLint melalui Expo |

---

## Pola Refresh & Polling

Polling hanya aktif ketika aplikasi berada di **foreground** dan tab terkait
**sedang aktif**. Saat aplikasi kembali ke foreground atau pengguna berpindah ke
tab, data langsung dimuat ulang. Ini mencegah request terus berjalan di background
dan menghemat baterai.

| Data | Interval |
|---|---|
| Dashboard: status NAS, backup gagal, daftar NAS | Setiap 10 detik |
| Dashboard: tren backup 7 hari | Setiap 60 detik (data berubah lebih lambat) |
| Monitor: snapshot NAS & Ceph | Setiap 10 detik pada segmen aktif |
| Monitor: grafik history | Dimuat ulang otomatis saat `last_collected_at` snapshot berubah |
| Logs | Refresh saat tab aktif + tombol manual |
| Reports | Refresh saat tab aktif + tombol manual |

Request history mengirim `max_points=300` agar API melakukan sampling di sisi
database. Di sisi client, grafik membatasi render hingga 120 titik untuk menjaga
performa SVG di Android.

---

## Autentikasi

- Token JWT disimpan di **Expo SecureStore** (enkripsi native OS) dan di-cache
  di memory agar tidak perlu baca storage di setiap request.
- Saat aplikasi dibuka, token yang tersimpan dipakai untuk restore sesi melalui
  `GET /auth/me`. Token yang tidak valid atau kedaluwarsa membersihkan sesi dan
  mengarahkan ke halaman login.
- Response `401` dari endpoint manapun (kecuali `/auth/login`) secara otomatis
  menghapus sesi lokal dan menampilkan notifikasi kepada pengguna.
- Logout memanggil `POST /auth/logout` untuk revoke token di server, lalu
  **selalu** membersihkan token dari SecureStore — terlepas dari hasil revoke.
- Akun machine (`service`, `collector`) ditolak di sisi client walaupun berhasil
  mendapat token dari API.

### Akun development (seed)

Backend menyediakan akun berikut jika dijalankan dengan `SEED_MODE=users` atau
`SEED_MODE=demo`:

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | admin |
| `operator` | `operator` | operator |

> Kredensial seed **hanya untuk development lokal**. Ganti password dan nonaktifkan
> seed mode (`SEED_MODE=none`) sebelum deployment ke environment nyata.

---

## Membangun APK — EAS Build

Project menggunakan [EAS Build](https://docs.expo.dev/build/introduction/) dengan
dua profil:

| Profil | Output | Kegunaan |
|---|---|---|
| `preview` | `.apk` — internal distribution | Testing langsung di perangkat tanpa Expo Go |
| `production` | `.aab` — App Bundle | Distribusi via Google Play Store |

URL API untuk build cloud disimpan di **EAS Environment Variables**, bukan di
`eas.json` atau `app.json`. Dengan cara ini URL server tidak perlu di-commit ke
repository dan dapat diubah tanpa menyentuh kode.

### Setup EAS Environment Variables

Lakukan sekali sebelum build pertama:

```bash
npm install --global eas-cli
eas login
```

Buat variabel untuk setiap environment:

```powershell
eas env:create --name EXPO_PUBLIC_API_BASE_URL --value https://api.example.com/api --environment preview --visibility plaintext
eas env:create --name EXPO_PUBLIC_API_BASE_URL --value https://api.example.com/api --environment production --visibility plaintext
```

Periksa nilai yang tersimpan:

```powershell
eas env:list --environment preview
eas env:list --environment production
```

Untuk mengganti URL server tanpa mengubah file project:

```powershell
eas env:update --name EXPO_PUBLIC_API_BASE_URL --value https://server-baru.example.com/api --environment preview --visibility plaintext
```

> **Catatan:** `EXPO_PUBLIC_` bukan secret — nilainya tertanam di bundle dan dapat
> dilihat dari aplikasi. Gunakan `plaintext` sebagai visibility.

### Menjalankan build

```bash
# APK untuk testing langsung di perangkat
eas build --platform android --profile preview

# AAB untuk Google Play
eas build --platform android --profile production
```

Pada build Android pertama, EAS akan membuat dan menyimpan **Android Keystore**
secara otomatis. Simpan akses akun EAS — update berikutnya harus ditandatangani
dengan key yang sama.

Setelah build selesai, EAS menampilkan URL untuk mengunduh artifact.

### Instalasi APK via USB

```bash
adb devices
adb install -r path/to/nas-backup-monitor.apk
```

Atau kirim file APK ke perangkat dan install manual (aktifkan *Install unknown
apps* di pengaturan perangkat).

> APK `production` tidak dapat di-install langsung — format AAB hanya untuk
> Google Play.

### Informasi aplikasi

| Properti | Nilai |
|---|---|
| Nama launcher | NAS Backup Monitor |
| Android package | `id.web.qra.nasbackupmonitor` |
| Versi | 1.0.0 (versionCode: 1) |
| Orientasi | Portrait |
| Cleartext traffic | Dinonaktifkan — HTTPS wajib untuk build standalone |
| New Architecture | Diaktifkan (`newArchEnabled: true`) |

> **Penting:** Jangan mengubah Android package setelah APK didistribusikan.
> Android menganggap package yang berbeda sebagai aplikasi yang berbeda — data
> pengguna tidak akan ter-migrate.

---

## Keamanan Repository

- File `.env` masuk `.gitignore` dan tidak pernah di-commit.
- URL API untuk build cloud disimpan di EAS Environment Variables, bukan di
  `eas.json`. File `eas.json` di-commit, tetapi tidak mengandung URL server.
- File keystore, private key, provisioning profile, dan kredensial layanan
  sudah dicakup oleh `.gitignore` (pola `*.jks`, `*.keystore`, `*.p12`,
  `credentials.json`, `google-services.json`, dll.).
- `owner`, `extra.eas.projectId`, dan Android package ID di `app.json` adalah
  identifier publik yang diperlukan untuk mengaitkan aplikasi ke proyek EAS —
  bukan secret.

---

## Verifikasi Sebelum Handoff

Jalankan pengecekan statis:

```bash
npm run typecheck
npm run lint
```

Kemudian lakukan smoke test manual terhadap API deployment yang sebenarnya:

- [ ] Login dengan kredensial valid → redirect ke Dashboard
- [ ] Login dengan role `service` / `collector` → ditolak dengan pesan yang sesuai
- [ ] Dashboard memuat semua kartu (NAS summary, Ceph health, chart tren, backup gagal)
- [ ] Polling Dashboard: data diperbarui otomatis setiap ~10 detik
- [ ] Logs: filter status, NAS, nama job, dan tanggal bekerja dengan benar
- [ ] Logs: *Load more* memuat halaman berikutnya
- [ ] Detail log: acknowledge (operator / admin) dan hapus (admin only)
- [ ] Monitor NAS: pilih NAS lain → snapshot dan grafik diperbarui
- [ ] Monitor NAS: ganti timeframe → grafik history diperbarui
- [ ] Monitor Ceph: snapshot dan grafik storage tampil
- [ ] Reports: generate PDF → muncul di daftar
- [ ] Reports: download PDF → share sheet terbuka dengan file yang benar
- [ ] Reports: hapus (admin only) dengan konfirmasi
- [ ] Minimize aplikasi → polling berhenti; buka kembali → data dimuat ulang
- [ ] Logout → token di-revoke, diarahkan ke halaman login
- [ ] Token kedaluwarsa / 401 → sesi dihapus otomatis, muncul notifikasi
