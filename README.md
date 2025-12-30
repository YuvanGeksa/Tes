# Yopandelreyz — Official Payment Page (No Build / Cloudflare Upload)

Versi ini **refactor UI/UX** agar terasa seperti produk perusahaan besar (Stripe/Midtrans/Vercel-ish):
- Hierarki informasi lebih jelas (judul → panduan → metode pembayaran)
- Trust cues (Secure checkout chip, verifikasi URL/host, tips keamanan)
- Aksesibilitas lebih baik (ARIA accordion, focus ring konsisten, tombol copy sebagai `<button>`)
- Tetap **100% static** (HTML + CSS + 1 JS) dan kompatibel upload ZIP (Cloudflare Pages)

## Deploy ke Cloudflare Pages (tanpa GitHub)
1. Cloudflare Dashboard → Pages → Create a project
2. Pilih **Upload assets**
3. Upload ZIP ini
4. Pastikan `index.html` ada di root

## Ganti aset gambar
Replace file berikut dengan aset kamu (nama harus sama):
- `img/dana.jpg`
- `img/gopay.jpg`
- `img/ovo.jpg`
- `img/qris.jpg`
- `img/wa.jpg`
- `img/favicon.png`

## Preview lokal
Buka `index.html` langsung, atau jalankan server statis:
```bash
python -m http.server 3000
```
Buka http://localhost:3000
