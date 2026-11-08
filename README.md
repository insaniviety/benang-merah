# Story Weaver AI

Buatkan aplikasi web Next.js modern bernama "Benang Merah" - platform co-writing berbasis AI untuk penulis fiksi dengan dukungan multibahasa (ID, EN, ZH-CN, ZH-TW).

1. TEMA VISUAL & THEME TOGGLE:

   - Sediakan tombol pengalih tema (Bulan/Matahari) di header atas.

   - Dark Mode (Default): Latar belakang dark slate / obsidian (abu-abu gelap elegan), teks putih gading, dan warna aksen dusty rose / merah marun halus.

   - Light Mode: Latar belakang off-white / warm cream (seperti warna kertas buku novel), teks charcoal (abu-abu gelap nyaman dibaca), dan warna aksen merah marun klasik.

2. HEADER ATAS:

   - Judul aplikasi "Benang Merah".

   - Dropdown pemilih bahasa UI (Bahasa Indonesia, English, 简体中文, 繁體中文).

   - Tombol Theme Switcher (Light/Dark Mode).

   - Profil Penulis.

3. SIDEBAR NAVIGASI KIRI:

   - Dropdown "Pilih Cerita" untuk berpindah naskah aktif dengan cepat.

   - Tombol "+ Naskah Baru".

   - Menu Navigasi:

     * Dashboard Utama (Editor)

     * Koleksi Naskah (Story Library)

     * Character Bible (Profil Karakter)

     * Thread Canvas (Kanvas Relasi Visual)

     * Timeline & Bab

     * Quick Capture (Catatan Cepat)

4. FITUR & HALAMAN UTAMA:

   A. Dashboard Utama:

      - Area editor teks naskah cerita yang bersih, nyaman, dan minimalis.

      - Panel Samping Kanan ("Gemini AI Inspector"): Menampilkan notifikasi peringatan AI otomatis seperti "Plot Hole Kritis Terdeteksi", "Masalah Konsistensi Karakter", dan "Saran AI".

   B. Pengelolaan Banyak Naskah (Multi-Project):

      - Halaman "Koleksi Naskah": Tampilkan daftar naskah dalam bentuk kartu (cards) berisi Judul, Genre (misal: Wuxia, Fantasy, Romance), Jumlah Bab, Tanggal Update, dan tombol "Buka Cerita". Berikan 2-3 contoh naskah dummy.

      - Pop-up Formulir "+ Naskah Baru": Modal untuk mengisi Judul, Genre, Bahasa Utama Naskah, dan Sinopsis Singkat.

   C. Character Bible (Profil Karakter):

      - Kartu profil karakter lengkap dengan Avatar, Nama, Peran (Protagonis/Antagonis/Pendukung), Diksi/Gaya Bicara Khas, dan Status (Aktif/Meninggal/Hilang).

      - Pop-up Formulir "+ Tambah Karakter".

   D. Thread Canvas (Kanvas Relasi Benang Merah):

      - Area kanvas interaktif yang menampilkan node/kartu karakter yang saling terhubung dengan garis-garis "benang merah".

      - Filter jenis hubungan di bagian atas: Semua, Konflik, Aliansi, Rahasia, dan Asmara.

      - Panel samping interaktif saat salah satu garis/node diklik untuk menampilkan riwayat hubungan.

Buatkan antarmuka web yang rapi, responsif, intuitif, dan siap digunakan oleh penulis.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://benang-merah.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f0114ac8-cc80-5ca2-bece-2ba3cf093521).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
