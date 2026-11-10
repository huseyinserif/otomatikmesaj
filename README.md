# Aidat Takip

Okullar siteden Google ile hesap açar, öğrencilerini girer. Aidat günü mesajlar hazır olur; okul her veli için
"WhatsApp'ta aç"a basıp WhatsApp'ta Gönder'e basar. Mesaj okulun KENDİ numarasından gider.
Sunucu, script, Meta API yok: Cloudflare (sadece statik site) + Supabase (veritabanı + giriş).

## Mantık
- Aidat günü 1-30 arası takvimden seçilir (29-30, o gün olmayan aylarda ayın son günü sayılır).
- "Bugünün mesajları" sayfası: bugün aidat günü olanları listeler. Ödendi=hayır: geçmiş borç + bu ay; Ödendi=evet: sadece bu ay.
- "Gönderdim" denince mesaj kaydı tutulur, ödendi otomatik "hayır", borç = mesajdaki tutar. Ödendi yapılınca borç sıfırlanır.
- Aynı gün aynı öğrenci için ikinci kez "gönderildi" kaydı tutulmaz.
- Ücret: aylık abonelik. Yeni hesaba 14 gün deneme. Süre bitince öğrenci ekleme/değiştirme ve mesaj kaydı kapanır (veritabanı kuralıyla).
  Süreyi admin.html'den +30 gün / +1 yıl ile uzatırsın.

## Veritabanı
Supabase > SQL Editor: mevcut projede `supabase/guncelle.sql` (bir kere), sıfırdan kurulumda `supabase/schema.sql`.

## Yayın (Cloudflare)
Build command `npm run build`, deploy command `npx wrangler deploy`.
Build variables: NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY. Başka gizli anahtar GEREKMEZ.
Supabase > Authentication > URL Configuration: Site URL ve Redirect URL'lere site adresin (`/panel/` ve `/admin.html` dahil).
Google girişi: Supabase > Providers > Google.

## Yönetici paneli
`public/admin.html`: Supabase adresi ve publishable anahtarı dosyanın başına yaz. Yönetici e-postası veritabanındaki `yoneticiler` tablosundadır.
