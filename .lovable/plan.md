# Otomatisasi Relasi dan Acuan Thread Canvas

## Yang akan dibangun
- Tambahkan bagian “Hubungan dengan Karakter Lain” pada formulir Character Bible: karakter tujuan, jenis hubungan, dan catatan ringkas.
- Saat karakter baru disimpan, buat node dan benang relasinya sekaligus; saat mengedit karakter, relasi tambahan juga dapat dibuat.
- Tambahkan Mode Hubungkan pada Thread Canvas: pilih dua node secara berurutan untuk membuka formulir benang baru.
- Saat garis diklik, buka pop-up untuk mengubah jenis hubungan dan deskripsi, atau menghapus benang.
- Tambahkan tombol “Simpan Thread Canvas” dan status perubahan belum tersimpan / peta tersimpan sebagai acuan AI.
- Simpan versi terkunci per naskah, termasuk relasi dan posisi node, sehingga tersedia kembali setelah halaman dimuat ulang.
- Tambahkan Thread Canvas tersimpan sebagai sumber acuan di Gemini AI Inspector serta kategori “Inkonsistensi Relasi & Karakter”.
- Temuan relasi hanya akan muncul jika teks memuat pertentangan eksplisit terhadap relasi tersimpan, agar tidak menghasilkan peringatan spekulatif.

## Detail teknis
- Perluas penyimpanan bersama dengan operasi tambah, ubah, hapus, dan simpan snapshot relasi; penghapusan karakter tetap membersihkan benang terkait.
- Formulir karakter mengirim data karakter dan relasi awal dalam satu aksi agar node dan garis selalu konsisten.
- Inspector hanya membaca snapshot Thread Canvas yang sudah disimpan, bukan perubahan draf yang belum dikunci.
- Tambahkan teks antarmuka untuk empat bahasa yang didukung dan gunakan kontrol serta token visual yang sudah ada.

## Verifikasi
- Buat karakter dengan relasi dan pastikan garis baru otomatis muncul.
- Buat benang lewat Mode Hubungkan, lalu edit jenis/deskripsi dan hapus lewat pop-up garis.
- Simpan kanvas, muat ulang, dan pastikan status serta susunan tersimpan kembali.
- Pastikan Inspector mengaktifkan sumber Thread Canvas dan menampilkan kategori relasi saat ada kontradiksi eksplisit.
- Periksa tampilan desktop dan seluler serta pastikan tidak ada galat aplikasi.
