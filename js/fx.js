// Micro-animazioni: motion blur, scintille sulle spunte, coriandoli, onde al tocco.
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
const COLORS = ["#16b04f", "#3fd26f", "#b6ec3c", "#8be36b", "#ffd166", "#ff7a59", "#0e9f4a"];
const pick = (a) => a[(Math.random() * a.length) | 0];

/** Sfocatura breve durante un movimento orizzontale veloce. */
export function motionBlur(el, strength = 3.5, ms = 420) {
  if (reduce.matches || !el.animate) return;
  el.animate(
    [{ filter: "blur(0px)" }, { filter: `blur(${strength}px)`, offset: 0.3 }, { filter: "blur(0px)" }],
    { duration: ms, easing: "cubic-bezier(.2,.8,.2,1)" }
  );
}

/** Sfocatura in tempo reale mentre si trascina, in base alla velocità. */
export function dragBlur(el, vPxPerMs) {
  if (reduce.matches) return;
  const b = Math.min(4, Math.abs(vPxPerMs) * 2.2);
  el.style.filter = b > 0.3 ? `blur(${b.toFixed(2)}px)` : "";
}
export function clearBlur(el) { el.style.filter = ""; }

/** Scintille che esplodono dal centro di un elemento. */
export function burst(el, n = 12) {
  if (reduce.matches || !el) return;
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let i = 0; i < n; i++) {
    const p = document.createElement("i");
    const s = 5 + Math.random() * 5, a = (i / n) * Math.PI * 2 + Math.random() * 0.5, d = 26 + Math.random() * 26;
    p.className = "fx-p";
    p.style.cssText = `left:${cx - s / 2}px;top:${cy - s / 2}px;width:${s}px;height:${s}px;background:${pick(COLORS)};border-radius:${Math.random() > 0.5 ? "50%" : "2px"}`;
    document.body.appendChild(p);
    p.animate(
      [{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px) scale(0) rotate(${Math.random() * 360}deg)`, opacity: 0.2 }],
      { duration: 520 + Math.random() * 200, easing: "cubic-bezier(.15,.8,.3,1)" }
    ).onfinish = () => p.remove();
  }
}

/** Pioggia di coriandoli per i traguardi. */
export function confetti(n = 90) {
  if (reduce.matches) return;
  const W = innerWidth, H = innerHeight;
  for (let i = 0; i < n; i++) {
    const p = document.createElement("i");
    const w = 6 + Math.random() * 6, h = w * (0.4 + Math.random() * 0.8);
    const x = Math.random() * W, drift = (Math.random() - 0.5) * 160;
    p.className = "fx-p";
    p.style.cssText = `left:${x}px;top:-20px;width:${w}px;height:${h}px;background:${pick(COLORS)};border-radius:${Math.random() > 0.7 ? "50%" : "2px"}`;
    document.body.appendChild(p);
    p.animate(
      [{ transform: `translate(0,0) rotate(0deg)`, opacity: 1 }, { transform: `translate(${drift}px,${H + 40}px) rotate(${(Math.random() - 0.5) * 900}deg)`, opacity: 0.9 }],
      { duration: 1600 + Math.random() * 1300, delay: Math.random() * 350, easing: "cubic-bezier(.25,.6,.45,1)" }
    ).onfinish = () => p.remove();
  }
}

/** Onda al tocco, come nelle app native. */
export function ripple(e, el) {
  if (reduce.matches || !el) return;
  const r = el.getBoundingClientRect();
  const size = Math.max(r.width, r.height) * 2.2;
  const s = document.createElement("span");
  s.className = "fx-ripple";
  s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
  el.appendChild(s);
  s.animate([{ transform: "scale(0)", opacity: 0.35 }, { transform: "scale(1)", opacity: 0 }], { duration: 550, easing: "cubic-bezier(.2,.8,.2,1)" }).onfinish = () => s.remove();
}

/** Ingresso sfalsato degli elementi di una pagina. */
export function stagger(container, max = 9) {
  if (reduce.matches || !container) return;
  [...container.children].slice(0, max).forEach((c, i) => {
    c.animate(
      [{ opacity: 0, transform: "translateY(16px) scale(.98)" }, { opacity: 1, transform: "none" }],
      { duration: 460, delay: 40 + i * 45, easing: "cubic-bezier(.2,.9,.25,1)", fill: "backwards" }
    );
  });
}

/** Piccolo rimbalzo. */
export function bump(el) {
  if (reduce.matches || !el?.animate) return;
  el.animate([{ transform: "scale(1)" }, { transform: "scale(1.22)" }, { transform: "scale(1)" }], { duration: 380, easing: "cubic-bezier(.34,1.56,.64,1)" });
}
