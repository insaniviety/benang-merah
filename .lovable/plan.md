# Pembaruan Naskah, Character Bible, dan Thread Canvas

## Yang akan dibangun
- Ganti pemilih genre yang dapat dibuka-tutup menjadi grid chip yang selalu terlihat, mendukung banyak pilihan, serta menandai pilihan aktif dengan warna aksen.
- Tambahkan bidang “Identitas / Peran Spesifik” pada data dan formulir karakter, termasuk contoh placeholder yang sesuai.
- Atur formulir karakter agar identitas, diksi, dan Bio / Latar Belakang memakai lebar penuh; area bio dibuat lebih tinggi untuk teks panjang.
- Tampilkan identitas spesifik secara menonjol pada setiap kartu Character Bible.
- Tambahkan tipe hubungan “Keluarga” ke data, filter, label garis, dan detail Thread Canvas.
- Tambahkan contoh hubungan keluarga pada cerita awal agar fitur langsung terlihat.
- Saat relasi keluarga dipilih, tampilkan identitas kedua karakter dan ringkasan keterhubungan dari Character Bible; saat karakter dipilih, identitas juga tampil pada panel detail.

## Detail teknis
- Perluas tipe `Character` dengan `identity` dan tipe hubungan dengan `family`, lalu perbarui data contoh serta alur tambah/edit karakter.
- Tambahkan terjemahan baru untuk empat bahasa yang sudah didukung.
- Gunakan komponen Button dan token visual yang sudah ada untuk chip genre dan kontrol Thread Canvas.
- Hilangkan kontrol dropdown/checkbox genre yang tidak lagi diperlukan.

## Verifikasi
- Uji chip genre bisa memilih dan membatalkan beberapa genre pada Naskah Baru serta Edit Naskah.
- Uji identitas karakter tersimpan setelah tambah/edit dan tampil pada kartu Character Bible.
- Uji filter Keluarga serta detail hubungan keluarga menampilkan identitas dan keterhubungan yang benar.
- Periksa tampilan desktop dan seluler, serta pastikan aplikasi tidak menghasilkan galat.
