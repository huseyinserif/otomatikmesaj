# Aidat Takip (web sitesi, çok müşterili)

Kullanıcılar siteden kendi hesabını açar, öğrencilerini girer, aidat gününde velilere WhatsApp mesajı otomatik gider.

## Mantık
- Aidat günü gelen her öğrenciye mesaj gider.
- Ödendi = hayır -> tutar = geçmiş borç + bu ayın aidatı. Evet -> sadece bu ayın aidatı.
- Mesaj gidince ödendi otomatik "hayır", borç = mesajdaki tutar. "Ödendi" yapılınca borç sıfırlanır.
- Aynı gün aynı öğrenciye ikinci kez mesaj atılmaz. Hata alan mesajda borç artmaz.
- Her yeni hesaba 14 gün deneme verilir. Abonelik uzatma artık Yönetici panelinden yapılır. Abonelik bitince mesaj gönderimi durur
  (Yönetici panelinden +30 gün / +1 yıl ile yenilersin).

## Kurulum (Cloudflare Workers)
1. **Supabase:** proje aç, SQL Editor'de `supabase/schema.sql` dosyasını çalıştır.
2. **Google girişi:** console.cloud.google.com > APIs & Services > Credentials > "OAuth client ID" (Web application).
   Authorized redirect URI: Supabase > Authentication > Providers > Google sayfasında yazan adres
   (https://xxxx.supabase.co/auth/v1/callback). Client ID ve Secret'ı Supabase'deki aynı sayfaya yapıştırıp Google'ı aç.
3. **GitHub:** dosyaları depoya yükle. `package.json` deponun en üstünde (kökte) olmalı.
4. **Cloudflare:** Workers & Pages > projen > Settings > Build:
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
   - Root directory: `/`
   - Build variables: NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY
   Settings > Variables and secrets: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (türü "Secret").
   Proje adı `wrangler.jsonc` içindeki `name` ile aynı olmalı (şu an "ogrencitakip").
5. **Supabase'e site adresini söyle:** Authentication > URL Configuration > Site URL = siteadresin;
   Redirect URLs listesine `https://siteadresin/panel/` ve `https://siteadresin/admin.html` ekle.
6. **Günlük otomatik gönderim** Cloudflare'in zamanlayıcısıyla kendiliğinden çalışır (wrangler.jsonc > triggers),
   ayrıca bir şey kurman gerekmez.

### Cloudflare notu (önemli)
Ücretsiz planda tek çalıştırma en fazla 50 dış bağlantı yapabilir, bu yüzden sistem her çalışmada yaklaşık 20 mesaj gönderir
ve sabah her 10 dakikada devam eder (200 öğrenci bir iki saatte biter, tekrar gönderim olmaz).
Daha hızlı/garantili olsun istersen Workers Paid ($5/ay) alıp ISTEK_LIMITI=900 yap.

## Yönetici paneli (admin.html)
Ayrı bir dosyadır: `public/admin.html`. Şu an public klasöründe durur ve site yayınlanınca `siteadresin/admin.html` adresinden açılır.
1. Dosyanın başındaki SUPABASE_URL ve SUPABASE_ANON_KEY değerlerini doldur (anon key herkese açık bir anahtardır; service_role kullanma).
2. Supabase > Authentication > URL Configuration > Redirect URLs listesine `https://siteadresin.com/admin.html` ekle.
3. Yönetici e-postası `supabase/schema.sql` içinde `yoneticiler` tablosuna yazılıdır (keleshusein3@gmail.com). Başka yönetici eklemek için tabloya satır ekle.
Yetki kontrolü veritabanında yapılır: dosya herkese açık olsa bile başkası giremez, veri göremez.
Dosyayı sitede istemezsen public klasöründen silip yeniden yayınla; ayarlama yapacağın zaman geri koyarsın.
Panelde: kayıtlı okullar, öğrenci sayısı, bu ay giden mesaj, WhatsApp bağlı mı, abonelik bitişi; +30 gün / +1 yıl ve Durdur/Aç düğmeleri.

## WhatsApp bağlantısı (her müşteri için)
Panel > Ayarlar'a Phone Number ID, token ve onaylı şablon adı girilir. Token panele geri gösterilmez.
Şablon metni için `sablon.txt`. Müşterinin kendi numarasında sohbet görünsün istiyorsa
numarası WhatsApp Business uygulamasından Coexistence ile bağlanır.
Şimdilik bu Meta kurulumunu müşteri adına sen yaparsın. Müşteri sayısı artınca Meta "Embedded Signup"
(Tech Provider olma) ile müşterilerin kendi kendine bağlanması sağlanabilir.

## Abonelik tahsilatı
Şimdilik elle: ödeme gelince abonelik_bitis'i uzatırsın. İleride iyzico/PayTR eklenebilir.

## Not
Bu proje yazıldığı ortamda internet olmadığı için derlenip çalıştırılarak denenmedi.
Önce `npm run dev` ile yerelde dene, ardından kendi numarana tek öğrenciyle test mesajı at.


## Ortak WhatsApp + mesaj kredisi (güncel model)
- Tek bir WhatsApp numarası/Meta hesabı SENDE kurulur (WA_TOKEN, WA_PHONE_ID, şablon: sablon.txt). Müşteri teknik bir şey yapmaz.
- Müşteri Ayarlar'da okul adı, IBAN ve hesap sahibini girer; bunlar mesajın içine yazılır.
- Her okulun mesaj kredisi vardır (yeni hesap: 20 ücretsiz). Her başarılı mesaj 1 kredi harcar, kredi bitince gönderim durur.
- Kredi eklemek: admin.html > +100 / +500 / +1000 / Elle.
- Eski veritabanı için supabase/duzeltme3.sql dosyasını bir kere çalıştır.
- İsteğe bağlı: bir okul kendi numarasını kullanacaksa, yönetici okul_gizli tablosuna o okulun wa_token / wa_phone_id değerlerini yazar (kredi yine düşer).

### Okulun kendi numarasından gönderim
Token hep SENİN ortak token'ındır. Bir okulun mesajları kendi numarasından gitsin istiyorsan: o numarayı senin WhatsApp Business hesabına (WABA) ekle,
Meta'nın verdiği Phone Number ID'yi admin.html > "Numara" düğmesine yaz. Şablon aynı hesapta olduğu için tek şablon tüm numaralarda çalışır.
Numara tanımlanmayan okullar ortak numaradan gönderir. Veritabanı için supabase/duzeltme4.sql dosyasını bir kere çalıştır.
