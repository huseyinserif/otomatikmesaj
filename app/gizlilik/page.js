export const metadata = { title: "Gizlilik Politikası - Aidat Takip" };

export default function Gizlilik() {
  return (
    <div className="kap" style={{ maxWidth: 760 }}>
      <p><a href="/">← Ana sayfa</a></p>
      <h1>Gizlilik Politikası ve KVKK Aydınlatma Metni</h1>
      <p style={{ color: "var(--mut)" }}>Son güncelleme: 8 Kasım 2026</p>

      <h2>1. Biz kimiz?</h2>
      <p>Aidat Takip, spor okulları ve kurslar için otomatik WhatsApp aidat hatırlatma hizmetidir.
        İletişim: <a href="mailto:keleshusein3@gmail.com">keleshusein3@gmail.com</a></p>

      <h2>2. Hangi verileri işliyoruz?</h2>
      <p>Hesap sahibi (okul yetkilisi) için: Google ile giriş yaptığınızda Google'dan yalnızca e-posta adresiniz,
        adınız ve profil bilgileriniz alınır. Google hesabınızdaki başka verilere (e-posta içeriği, kişiler, takvim, dosyalar vb.)
        erişmeyiz.</p>
      <p>Okulun sisteme girdiği veriler için: öğrenci adı soyadı, veli telefon numarası, aidat günü, aidat tutarı,
        ödeme durumu ve borç bilgisi. Bu verileri okul girer.</p>

      <h2>3. Hangi amaçla kullanıyoruz?</h2>
      <p>Verileriniz yalnızca hizmeti sunmak için kullanılır: hesabınıza giriş yapmanızı sağlamak, öğrenci listenizi saklamak
        ve aidat gününde velilere WhatsApp hatırlatma mesajı göndermek. Verileri satmaz, reklam amacıyla kullanmaz ve
        üçüncü kişilerle pazarlama için paylaşmayız.</p>

      <h2>4. Veri sorumlusu ve veri işleyen</h2>
      <p>Öğrenci ve veli verileri bakımından veri sorumlusu, bu verileri sisteme giren okuldur; Aidat Takip, okulun
        talimatıyla hareket eden veri işleyendir. Okul, velilerden telefon numarası ve mesaj alma konusunda gerekli
        bilgilendirme ve izinleri almakla yükümlüdür.</p>

      <h2>5. Verileri kimlerle paylaşıyoruz?</h2>
      <p>Hizmetin çalışması için şu hizmet sağlayıcılar kullanılır: Supabase (veritabanı ve giriş), Cloudflare
        (barındırma), Meta / WhatsApp Business Platform (mesaj gönderimi) ve Google (giriş). Veriler yalnızca bu
        hizmetlerin çalışması için gereken ölçüde onlara aktarılır; bu sağlayıcıların sunucuları yurt dışında olabilir.</p>

      <h2>6. Saklama süresi</h2>
      <p>Verileriniz hesabınız açık olduğu sürece saklanır. Hesabınızın ve verilerin silinmesini talep ederseniz
        makul bir süre içinde silinir.</p>

      <h2>7. Haklarınız</h2>
      <p>6698 sayılı KVKK kapsamında verilerinize erişme, düzeltilmesini veya silinmesini isteme, işlenmesine itiraz
        etme haklarına sahipsiniz. Talepleriniz için yukarıdaki e-posta adresine yazabilirsiniz. Veliler, mesaj
        almak istemiyorsa okulla iletişime geçerek numaralarının listeden çıkarılmasını isteyebilir.</p>

      <h2>8. Güvenlik</h2>
      <p>Her okul yalnızca kendi verilerine erişebilir. WhatsApp erişim anahtarları arayüzde gösterilmez ve sunucu
        tarafında saklanır.</p>
    </div>
  );
}
