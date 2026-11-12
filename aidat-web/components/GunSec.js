"use client";
import { useEffect, useRef, useState } from "react";

// Takvim gibi gün seçici: 1-30. Seçilen gün her ayın o günü demektir.
export default function GunSec({ value, onChange }) {
  const [acik, setAcik] = useState(false);
  const [poz, setPoz] = useState({ top: 0, left: 0 });
  const btn = useRef(null);

  useEffect(() => {
    if (!acik) return;
    const kapat = (e) => { if (!e.target.closest?.("[data-gunsec]")) setAcik(false); };
    document.addEventListener("mousedown", kapat);
    return () => document.removeEventListener("mousedown", kapat);
  }, [acik]);

  function ac() {
    const r = btn.current.getBoundingClientRect();
    setPoz({ top: r.bottom + 4, left: Math.max(8, Math.min(r.left, window.innerWidth - 274)) });
    setAcik(!acik);
  }

  return (
    <span data-gunsec style={{ display: "inline-block" }}>
      <button type="button" ref={btn} className="gri" onClick={ac}>
        {value ? `Her ayın ${value}. günü` : "Aidat günü seç"}
      </button>
      {acik && (
        <div data-gunsec style={{ position: "fixed", top: poz.top, left: poz.left, zIndex: 50,
          background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: 10,
          boxShadow: "0 6px 24px rgba(0,0,0,.18)", width: 262 }}>
          <div style={{ fontSize: 12, color: "var(--mut)", marginBottom: 6 }}>Her ayın kaçında mesaj gitsin?</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {Array.from({ length: 30 }, (_, i) => i + 1).map((g) => (
              <button type="button" key={g} className={g === +value ? "" : "gri"}
                style={{ padding: "7px 0", margin: 0 }}
                onClick={() => { onChange(g); setAcik(false); }}>{g}</button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 6 }}>
            29-30 seçilirse, o gün olmayan aylarda ayın son günü gider.
          </div>
        </div>
      )}
    </span>
  );
}
