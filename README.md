# NAS Backup Monitor Mobile

Aplikasi Android berbasis Expo Router untuk memantau backup NAS dan Ceph dari backend `nas-backup-monitor`.

## Fitur

- Login JWT dengan token di SecureStore.
- Role gate untuk `admin` dan `operator`.
- Dashboard ringkas: NAS freshness, Ceph health/storage, tren backup, recent failed.
- Backup logs: filter status/NAS/job/tanggal WIB, pagination, detail, acknowledge, delete admin.
- Monitoring NAS/Ceph: KPI cards dan chart history.
- Reports: list, generate PDF, download dengan Authorization header, delete admin.
- Auto-refresh 10 detik hanya pada tab aktif; berhenti saat aplikasi berada di background.
- Refresh manual tersedia pada Dashboard, Logs, Monitor, dan Reports.
- Profile dan logout server-side revoke.

## Konfigurasi API

Salin `.env.example` bila perlu:

```bash
cp .env.example .env
```

Default Android emulator:

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000/api
```

Device fisik harus memakai IP LAN host backend, misalnya:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.20:8000/api
```

Produksi sebaiknya memakai HTTPS.

## Jalankan

```bash
npm install
npm run start
```

Lalu buka di Android emulator atau Expo dev client.

## Verifikasi

```bash
npm run typecheck
npm run lint
```

## Akun Dev Backend

Dengan `SEED_MODE=demo` atau `users` pada backend:

- `admin` / `admin123`
- `operator` / `operator`
