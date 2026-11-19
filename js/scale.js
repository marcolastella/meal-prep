// Ricalcola le quantità di un ingrediente in base alle porzioni.
// "1½ cucchiai (≈ 22 ml)" × 0,5 → "¾ di cucchiai (≈ 11 ml)" … con frazioni leggibili.

const FR = { "¼": 0.25, "½": 0.5, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": 0.125 };
const NICE = [[0.125, "⅛"], [0.25, "¼"], [1 / 3, "⅓"], [0.5, "½"], [2 / 3, "⅔"], [0.75, "¾"]];
const NUM = /(\d+(?:[.,]\d+)?)?\s?([¼½¾⅓⅔⅛])|(\d+(?:[.,]\d+)?)/g;

function fmt(x, small) {
  if (x >= 20) return String(Math.round(x));
  if (!small && x >= 5) return String(Math.round(x));
  const whole = Math.floor(x + 1e-9), frac = x - whole;
  if (frac < 0.06) return String(whole || "");
  if (frac > 0.94) return String(whole + 1);
  for (const [v, s] of NICE) if (Math.abs(frac - v) < 0.06) return (whole ? whole : "") + s;
  return String(Math.round(x * 10) / 10).replace(".", ",");
}

export function scaleText(text, f) {
  if (f === 1) return text;
  // Le grammature (g, ml) si arrotondano a numeri interi, il resto in frazioni.
  return text.replace(NUM, (m, a, fr, n, off, all) => {
    let v = fr ? (a ? parseFloat(a.replace(",", ".")) : 0) + FR[fr] : parseFloat(n.replace(",", "."));
    if (!isFinite(v)) return m;
    const unit = all.slice(off + m.length).trimStart();
    const metric = /^(g|ml|kg|l)\b/i.test(unit);
    const out = v * f;
    const s = metric ? String(Math.max(1, Math.round(out))) : fmt(out, true) || "un pizzico";
    return s;
  });
}

/** Testo per gli ingredienti che non si possono scalare ("Tutto il couscous"). */
export function scaleIngredient(text, f) {
  if (f === 1) return text;
  // "½ della pasta" × 2 → "Tutta la pasta"
  const out = scaleText(text, f);
  const whole = { della: "Tutta la", delle: "Tutte le", del: "Tutto il", dello: "Tutto lo", dei: "Tutti i", degli: "Tutti gli" };
  const m = out.match(/^(\d+(?:[¼½¾⅓⅔⅛])?|[¼½¾⅓⅔⅛]) (della|delle|del|dello|dei|degli) /);
  if (m && m[1] === "1") return out.replace(m[0], whole[m[2]] + " ");
  if (m && /^\d/.test(m[1]) && m[1] !== "1") return out.replace(m[0], whole[m[2]] + " ") + " (non basta: ne hai preparata meno)";
  if (/^tutt[oa]/i.test(text)) return text.replace(/^Tutt([oa]) (il|la|lo|l’|quello)\s?/i, (m) => `${m}`) + (f < 1 ? ` (circa ${fmt(f, true)})` : ` (× ${fmt(f, true)})`);
  return out;
}
