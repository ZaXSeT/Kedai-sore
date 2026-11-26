# Kedai Sore: pesan dulu, ambil di kasir

Demo portofolio untuk pemilik usaha kuliner yang melayani pickup. Pelanggan memilih menu dari HP, mengirim pesanan, lalu mendapat kode ambil dan struk. Kasir mencari pesanan dengan kode itu, dan item serta totalnya sama persis dengan yang dilihat pelanggan.

Semua nama, alamat, dan pesanan di proyek ini fiktif.

**Status:** live di Production → **https://kedai-sore.vercel.app** (diverifikasi 26 Nov 2026). Repo: [github.com/ZaXSeT/Kedai-sore](https://github.com/ZaXSeT/Kedai-sore).

![Struk dengan kode ambil di HP, lebar 390 px](docs/hp-struk.png)

## Stack

- SvelteKit 3 (Svelte 5, TypeScript), form action, `@sveltejs/adapter-vercel`, runtime Node.js 22 (region `sin1`).
- Supabase Postgres lewat driver `postgres` dari fungsi server. Browser tidak pernah mengakses database.
- Postgres lokal tertanam (`embedded-postgres`) untuk dev dan tes.

## Prasyarat

- Node.js 22 atau lebih baru (diuji dengan Node 24.11).
- npm 10 atau lebih baru.

## Menjalankan lokal

```powershell
npm install
copy .env.example .env      # isi DATABASE_URL dengan URL lokal di bawah
npm run db:start            # terminal 1: Postgres lokal di port 55402
npm run db:setup            # terminal 2: migrasi + seed menu
npm run dev                 # http://localhost:5173
```

```
DATABASE_URL=postgres://postgres:postgres-lokal@127.0.0.1:55402/kedai_sore
```

| Perintah | Fungsi |
|---|---|
| `npm run db:start` | Menyalakan Postgres lokal dan membuat database `kedai_sore` serta `kedai_sore_test` |
| `npm run db:migrate` / `db:seed` / `db:setup` | Migrasi dan seed menu. Keduanya aman diulang, dan seed tidak menimpa status stok yang diubah pemilik |
| `npm run check` · `npm run lint` | Pemeriksaan tipe · ESLint |
| `npm test` | Tes K1–K4 terhadap database tes terpisah |
| `npm run build` | Build produksi untuk Vercel |
| `npm run build:local` lalu `npm run start:local` | Pratinjau produksi lokal di http://localhost:4172 (adapter Node, CSRF aktif) |
| `npm run pesanan` | Akses kasir/pemilik (lihat di bawah) |
| `npm run stok` | Tandai produk tersedia atau habis |
| `npm run images` | Memproses ulang foto menu dari `assets-src/raw` |

> **Catatan Windows:** langkah akhir `npm run build` membuat symlink untuk Vercel Build Output dan gagal dengan `EPERM` jika Developer Mode Windows belum aktif. Kompilasi aplikasinya lulus, dan build di Vercel (Linux) tidak terdampak. Untuk menguji build di Windows, pakai `build:local`.

## Akses pemilik dan kasir

```powershell
npm run pesanan                          # pesanan hari ini (WIB)
npm run pesanan -- --tanggal 2026-11-24
npm run pesanan -- --kode t93n           # cari satu pesanan dengan kode ambil (huruf besar/kecil sama)
npm run stok                             # daftar produk dan statusnya
npm run stok -- roti-gula-aren habis
npm run stok -- roti-gula-aren tersedia
```

Contoh keluaran dengan data fiktif:

```
Kedai Sore · kode T93N
────────────────────────────────────────────────

T93N  Sinta  ·  19.49 WIB  ·  3 item
    2 × Es Kopi Sore             Rp48.000
    1 × Roti Gula Aren           Rp20.000
   Total, bayar di kasir         Rp68.000
────────────────────────────────────────────────
```

## Aturan bisnis

- Delapan produk dalam kategori Kopi, Nonkopi, dan Camilan. Kopi Susu Pandan berstatus **Habis** sebagai contoh.
- Satu pesanan boleh berisi 1–10 unit per produk. Pesanan hanya untuk pickup dan dibayar di kasir.
- Keranjang browser (`localStorage`) hanya menyimpan ID produk dan jumlah, sehingga bertahan saat halaman dimuat ulang. Harga dan status stok selalu dibaca dari server.
- Checkout berjalan dalam satu transaksi:
  1. Cek kunci idempotensi. Jika kunci sudah ada dan isinya sama, server mengembalikan pesanan yang sama. Jika isinya berbeda, server menjawab **409 konflik**.
  2. Baca harga dan stok (`for share`). Jika ada ID tidak dikenal atau item habis, transaksi dibatalkan tanpa menulis apa pun.
  3. Tulis `orders` dan `order_items`. Nama dan harga satuan disalin saat checkout.
- Kunci idempotensi dibuat browser per isi pesanan (nama + item). Kirim ulang atau klik ganda memakai kunci yang sama. Isi yang berubah memakai kunci baru.
- Permintaan kembar yang datang bersamaan diselesaikan oleh constraint unik `orders_idempotency_key` dan `on conflict do nothing`: satu pesanan tersimpan, permintaan lain membaca pesanan yang sama.

## Keamanan dan privasi

- Validasi server dengan zod: UUID kunci, nama 2–30 huruf, 1–20 baris, jumlah bilangan bulat 1–10, format ID, dan produk ganda. Field harga atau total dari browser diabaikan.
- Query berparameter (postgres.js). Origin form diperiksa oleh CSRF SvelteKit di produksi (diuji: lintas origin mendapat 403).
- Pembatasan laju disimpan di Postgres (`kedai.rate_limits`, 20 kiriman per 10 menit per IP yang di-hash).
- Schema privat `kedai`, dengan akses `anon`/`authenticated` Supabase dicabut.
- Halaman publik hanya mengirim menu. Struk hanya dikirim ke browser yang membuat pesanan. Tidak ada endpoint publik untuk membaca pesanan orang lain.
- Log menyamarkan nomor dan email. `.env` dan `.data/` tidak masuk git. `/og` hanya ada saat dev.

## Hasil tes dan verifikasi (lokal, 24 Nov 2026)

| Pemeriksaan | Cara | Hasil |
|---|---|---|
| Tipe · lint | `npm run check` · `npm run lint` | 0 error · bersih |
| Tes aturan bisnis | `npm test` | 21/21 lulus |
| Build | `npm run build` / `build:local` | kompilasi lulus; symlink Vercel ditolak Windows; build Node lulus |
| K1 di browser (390 px) | 2 Es Kopi Sore + 1 Roti Gula Aren | Bilah "Lihat pesanan · 3 item · Rp68.000"; struk T93N Rp68.000; `npm run pesanan -- --kode t93n` sama |
| Keranjang | Muat ulang halaman | Isi keranjang tetap ada; kosong setelah pesanan sukses |
| K2 di browser | Roti ditandai habis via `npm run stok` setelah halaman checkout dibuka | Pesan "Roti Gula Aren baru saja habis. Pesanan belum dikirim…", baris ditandai, Americano tetap ada, tombol kirim nonaktif; setelah Roti dihapus, pesanan RD3G berhasil |
| K3 di browser | Respons pertama sengaja diputus, lalu **Kirim ulang** | Kode sama (RD3G), satu baris di CLI kasir. Tiga klik cepat menghasilkan satu pesanan (MW6H) |
| K3/K4 lewat HTTP (server produksi lokal) | kirim ulang · isi beda · keranjang kosong · harga palsu · lintas origin | kode sama + `replay` · 409 · 400 · total tetap Rp20.000 · 403 |
| Restart | Postgres dihentikan dan dinyalakan ulang | 6 pesanan tetap terbaca |
| Layout | 390 px dan 1440 px | Tanpa scroll horizontal; bilah HP tidak menutupi baris terakhir; desktop menampilkan ringkasan di samping menu |

Environment: Windows 11, Node 24.11.1, Postgres tertanam lokal. Vercel Preview dan Production: lihat bagian Deployment yang berjalan.

## Deployment yang berjalan

| | Nilai |
|---|---|
| URL Production | https://kedai-sore.vercel.app |
| Repo GitHub | [ZaXSeT/Kedai-sore](https://github.com/ZaXSeT/Kedai-sore) (folder ini adalah root repo; push ke `main` = deploy Production) |
| Proyek Vercel | `kedai-sore` (Hobby, framework SvelteKit, region fungsi `sin1`) |
| Database Production | Supabase `porto-threads-prod` (Singapura), schema `kedai`, role `kedai_app` |
| Database Preview | Supabase `porto-threads-preview`, schema dan role yang sama |
| Env | `DATABASE_URL` (Sensitive) berbeda untuk Production dan Preview, lewat transaction pooler `aws-1-ap-southeast-1.pooler.supabase.com:6543` |

Role `kedai_app` hanya memiliki schema `kedai`. Akses ke schema aplikasi lain dan `CREATE` pada database ditolak (diuji). Preview deployment dilindungi Vercel Authentication; Production publik.

### Hasil uji di Vercel (26 Nov 2026)

| Lingkungan | Hasil |
|---|---|
| Preview | K1 2 Es Kopi Sore + 1 Roti Gula Aren = Rp68.000; K3 dua kiriman kembar → kode sama (HCDX), kunci lama isi beda → 409; K2 item habis → 409; K4 keranjang kosong → 400; `pesanan` di DB preview 1, DB prod 0 |
| Production | K1 Rp68.000 dengan kiriman kembar → satu kode (GTUD); K2/K3/K4 sama seperti Preview |
| Redeploy Production | Transaksi sintetis sebelum redeploy tetap terbaca lewat CLI pemilik setelah redeploy (lihat `npm run pesanan` dengan `DATABASE_URL` Production) |

## Desain

Navbar penuh dari tepi ke tepi dan menempel di atas; konten dan foto mengisi lebar layar dengan gutter `clamp(1rem, 3.2vw, 3rem)`. Palet: hijau botol `#1f3d2e`, krim `#f7f2e7`, emas sampanye `#c4a46a`, cokelat espresso `#2a211b`. Dicek di 360, 390, 768, 1440, dan 1920 px tanpa scroll horizontal.

## Deploy ke Vercel

1. **Database.** Siapkan Supabase untuk Production dan Preview (proyek atau branch terpisah). Pakai connection string **Transaction pooler** (port 6543).
2. **Migrasi dan seed** dari terminal, di luar proses build:
   ```powershell
   $env:DATABASE_URL = "<url pooler Preview>"; npm run db:setup
   $env:DATABASE_URL = "<url pooler Production>"; npm run db:setup
   ```
3. **Proyek Vercel** `kedai-sore` dengan **Root Directory** `02-kedai-sore`. Build `npm run build`.
4. **Environment variable** `DATABASE_URL`: Preview diisi URL database Preview, Production diisi URL database Production.
5. **Uji Preview:** pesan K1 dari HP, cek dengan `npm run pesanan` memakai URL Preview, ulangi klik ganda, lalu pastikan database Production tidak berubah.
6. **Production:** buka di jendela privat, periksa `/og.jpg`, buat satu pesanan sintetis, redeploy, dan pastikan pesanan itu masih ada.

`og:image` otomatis memakai domain permintaan, misalnya `https://kedai-sore.vercel.app/og.jpg`. Bagikan tautan menu (`/`) di Threads.

## Konten Threads

**Caption (siap edit):**

> Pemilik kedai: pernah salah racik karena pesanan pickup cuma ditulis di chat?
>
> Saya buat demo pesan-ambil untuk kedai kopi. Pelanggan pilih menu dari HP, kirim pesanan, lalu dapat kode ambil. Kasir mencari kode itu dan melihat item serta total yang sama persis. Item habis langsung ketahuan sebelum pesanan masuk, dan klik dua kali tidak membuat pesanan dobel.
>
> Coba dari HP (data contoh): [tautan]
>
> Punya kedai atau usaha makanan dengan pickup? DM saja, kita bahas alur pesananmu.

**Alur rekam layar 20 detik (HP, 390 px):**

| Detik | Layar | Teks di layar |
|---|---|---|
| 0–4 | Menu: Es Kopi Sore, Americano, Kopi Susu Pandan bertanda "Habis hari ini" | "Pesanan pickup masih lewat chat?" |
| 4–15 | Tambah Es Kopi Sore 2×, Roti Gula Aren 1×, bilah "Lihat pesanan · 3 item · Rp68.000", **Isi contoh**, **Kirim pesanan** | "Pilih, kirim, selesai" |
| 15–20 | Struk dengan kode ambil besar dan total Rp68.000 | "Kasir cukup cari kodenya. Mau untuk kedaimu? DM." |

## Aset dan lisensi

Semua foto menu dari Pexels ([Lisensi Pexels](https://www.pexels.com/license/): bebas dipakai, atribusi tidak wajib). Foto dipotong menjadi kotak 480×480 dan diseragamkan kecerahan serta saturasinya (`scripts/images.ts`).

| File `static/menu/` | Fotografer | Sumber |
|---|---|---|
| es-kopi-sore.webp | Sóc Năng Động | [32542054](https://www.pexels.com/photo/32542054/) |
| americano.webp | Ömer Furkan Yakar | [16785688](https://www.pexels.com/photo/16785688/) |
| kopi-susu-pandan.webp | Roman Odintsov | [4869290](https://www.pexels.com/photo/4869290/) |
| teh-serai-jeruk.webp | mehmetakifarts | [36825769](https://www.pexels.com/photo/36825769/) |
| cokelat-sore.webp | Юлия Чалова | [8878710](https://www.pexels.com/photo/8878710/) |
| matcha-susu.webp | Darina Belonogova | [8004561](https://www.pexels.com/photo/8004561/) |
| roti-gula-aren.webp | hiven zhu | [26584413](https://www.pexels.com/photo/26584413/) |
| pisang-goreng.webp | Tiya Nh | [37048319](https://www.pexels.com/photo/37048319/) |

`static/og.jpg` adalah tangkapan halaman `/og` proyek ini (1200×630). Font Bricolage Grotesque, Figtree, dan IBM Plex Mono dibundel lewat Fontsource (SIL Open Font License).

## Struktur

```
db/migrations/001_init.sql     products, orders, order_items, rate_limits (schema kedai)
scripts/                       db-local, migrate, seed, pesanan, stok, images, start-local
src/lib/menu.ts                katalog contoh, kategori, format rupiah
src/lib/cart.svelte.ts         keranjang browser + kunci idempotensi
src/lib/server/orders.ts       checkout transaksional, struk, data kasir
src/routes/+page.svelte        menu dan ringkasan pesanan
src/routes/pesanan/            checkout dan struk
tests/orders.test.ts           skenario K1–K4
```
