// Excel'de açılan CSV indirir (Türkçe Excel için noktalı virgül ayırıcı ve BOM)
export function csvIndir(dosya, basliklar, satirlar) {
  const kac = (v) => {
    let s = String(v ?? "");
    if (/^[=+\-@]/.test(s)) s = "'" + s;   // Excel formül çalıştırmasın
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const metin = [basliklar, ...satirlar].map((r) => r.map(kac).join(";")).join("\r\n");
  const blob = new Blob(["\uFEFF" + metin], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = dosya;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
