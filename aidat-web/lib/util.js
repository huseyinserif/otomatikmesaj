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
