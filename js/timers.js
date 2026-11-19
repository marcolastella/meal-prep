// Timer di cucina: sopravvivono al ricaricamento della pagina, suonano, vibrano
// e tengono lo schermo acceso finché ce n'è uno attivo.

import { prefs } from "./store.js";

const el = () => document.getElementById("timers");
let T = prefs.get("timers", []);
let ac = null, wl = null, sig = "";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const save = () => prefs.set("timers", T);

export const fmt = (s) => { s = Math.max(0, Math.ceil(s)); const m = Math.floor(s / 60); return m + ":" + String(s % 60).padStart(2, "0"); };

function audio() { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); } catch {} }

function beep() {
  try {
    audio();
    [0, 0.25, 0.5, 1.1, 1.35, 1.6].forEach((d) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = "triangle"; o.frequency.value = d < 1 ? 880 : 1046;
      o.connect(g); g.connect(ac.destination);
      const t = ac.currentTime + d;
      g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      o.start(t); o.stop(t + 0.22);
    });
  } catch {}
  try { navigator.vibrate?.([300, 120, 300, 120, 500]); } catch {}
}

function notify(t) {
  try {
    if (document.hidden && "Notification" in window && Notification.permission === "granted") {
      navigator.serviceWorker?.ready.then((r) => r.showNotification("⏱ " + t.n + " è pronto", { body: "Il timer è scaduto.", tag: "timer-" + t.id, vibrate: [300, 120, 300] }))
        .catch(() => new Notification("⏱ " + t.n + " è pronto"));
    }
  } catch {}
}

async function wake() {
  try {
    if (T.some((t) => !t.done)) { if (!wl && navigator.wakeLock) { wl = await navigator.wakeLock.request("screen"); wl.onrelease = () => { wl = null; }; } }
    else if (wl && !document.querySelector(".cook.open")) { await wl.release(); wl = null; }
  } catch {}
}

function paint() {
  const now = Date.now(); let ch = false;
  T.forEach((t) => { if (!t.done && now >= t.end) { t.done = true; ch = true; beep(); notify(t); } });
  if (ch) { save(); wake(); }
  const box = el(); if (!box) return;
  const s = T.map((t) => t.id + (t.done ? "d" : "r")).join();
  if (s !== sig) {
    sig = s;
    box.innerHTML = T.map((t) => `<div class="trow${t.done ? " done" : ""}" data-tid="${t.id}">
      <div class="tr" style="--p:0"></div>
      <div class="tt"><b data-b="${t.id}">${t.done ? "Pronto!" : fmt((t.end - now) / 1000)}</b><span>${esc(t.n)}</span></div>
      ${t.done ? "" : `<button data-add="${t.id}" aria-label="Aggiungi un minuto">+1</button>`}
      <button data-x="${t.id}">${t.done ? "OK" : "Stop"}</button></div>`).join("");
  }
  T.forEach((t) => {
    const row = box.querySelector(`[data-tid="${t.id}"]`); if (!row) return;
    const left = Math.max(0, (t.end - now) / 1000);
    row.querySelector(".tr").style.setProperty("--p", t.done ? 100 : 100 - (left / t.dur) * 100);
    if (!t.done) row.querySelector("b").textContent = fmt(left);
  });
}

export const timers = {
  start(label, seconds) {
    audio();
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {});
    const id = Date.now();
    T.push({ id, n: label, end: id + seconds * 1000, dur: seconds, done: false });
    save(); wake(); paint();
    navigator.vibrate?.(15);
  },
  init() {
    setInterval(paint, 250);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) { wake(); paint(); } });
    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-add],[data-x]"); if (!b) return;
      if (b.dataset.add) { const t = T.find((t) => t.id == b.dataset.add); if (t) { t.end += 60000; t.dur += 60; } }
      else T = T.filter((t) => t.id != b.dataset.x);
      save(); wake(); paint();
    });
    // Swipe laterale su un timer per eliminarlo.
    let g = null;
    document.addEventListener("pointerdown", (e) => { const r = e.target.closest(".trow"); if (r && !e.target.closest("button")) g = { r, x: e.clientX }; });
    document.addEventListener("pointermove", (e) => { if (g) { const dx = e.clientX - g.x; g.dx = dx; g.r.style.transform = `translateX(${dx}px)`; g.r.style.opacity = 1 - Math.min(1, Math.abs(dx) / 220); } });
    const end = () => {
      if (!g) return;
      if (Math.abs(g.dx || 0) > 90) { T = T.filter((t) => t.id != g.r.dataset.tid); save(); wake(); sig = ""; paint(); }
      else { g.r.style.transform = ""; g.r.style.opacity = ""; }
      g = null;
    };
    document.addEventListener("pointerup", end); document.addEventListener("pointercancel", end);
    paint(); wake();
  },
};

/** Trasforma "cuoci 15–18 minuti" in testo con un pulsante timer. */
export function withTimers(text, label) {
  return esc(text).replace(/(\d+)(?:–(\d+))?\s+((?:altri\s+)?minut[oi])/g, (m, a, b) => {
    const max = b || a;
    return `${m} <button class="tm" data-tm="${max * 60}" data-n="${esc(label)}">⏱ ${b ? a + "–" + b : a}′</button>`;
  });
}
