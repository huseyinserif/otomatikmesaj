export const AYLAR = ["", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

// 0555 111 22 33 / 555 111 22 33 / +90 555... -> 905551112233, geçersizse null
export function telefonDuzelt(t) {
  let s = String(t || "").replace(/\D/g, "");
  if (s.startsWith("00")) s = s.slice(2);
  if (s.startsWith("0") && s.length === 11) s = "9" + s;
  if (s.length === 10 && s.startsWith("5")) s = "90" + s;
  return /^905\d{9}$/.test(s) ? s : null;
}

// Velilere giden mesaj metni. Okul Ayarlar'dan değiştirebilir. Kullanılabilen alanlar: {ad} {ay} {tutar} {okul} {iban} {alici}
export const VARSAYILAN_SABLON =
  "Sayın veli, {ad} için {ay} ayı ödenmesi gereken toplam aidat tutarı {tutar} TL'dir.\n\n{okul}\nIBAN: {iban}\nAlıcı: {alici}\n\nAçıklama kısmına öğrenci adını yazınız.";

export function sablonDoldur(sablon, v) {
  return (sablon || VARSAYILAN_SABLON).replace(/\{(ad|ay|tutar|okul|iban|alici)\}/g, (_, k) => String(v[k] ?? ""));
}

// Türkiye saatiyle bugünün tarihi (YYYY-MM-DD)
export function trTarihStr() {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date()).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
