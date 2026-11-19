// Timer di cucina: sopravvivono al ricaricamento della pagina, suonano, vibrano
// e tengono lo schermo acceso finché ce n'è uno attivo.

import { prefs } from "./store.js";

const el = () => document.getElementById("timers");
let T = prefs.get("timers", []);
let ac = null, wl = null, sig = "";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const save = () => prefs.set("timers", T);

export const fmt = (s) => { s = Math.max(0, Math.ceil(s)); const m = Math.floor(s / 60); return m + ":" + String(s % 60).padStart(2, "0"); };

function audio() {
  try {
    // Su iPhone suona anche con l'interruttore silenzioso, come un breve avviso.
    if (navigator.audioSession) navigator.audioSession.type = "transient";
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === "suspended") ac.resume();
  } catch {}
}

// --- Suoni sintetizzati (nessun file audio da scaricare) ---
function bus(vol) {
  const out = ac.createGain(); out.gain.value = vol;
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
  out.connect(comp); comp.connect(ac.destination);
  return out;
}
// Marimba: fondamentale + 4ª armonica (tipica delle barre di legno) + colpo di battente.
function woodNote(out, f, t, vel = 1) {
  [[1, 0.9, 0.55], [3.93, 0.22, 0.12], [9.2, 0.05, 0.04]].forEach(([mult, amp, dec]) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = "sine"; o.frequency.value = f * mult;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(amp * vel, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dec + 0.05);
  });
  // "toc" del battente: un soffio di rumore filtrato
  const len = Math.floor(ac.sampleRate * 0.025), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const n = ac.createBufferSource(), bp = ac.createBiquadFilter(), ng = ac.createGain();
  n.buffer = buf; bp.type = "bandpass"; bp.frequency.value = f * 2.4; bp.Q.value = 3; ng.gain.value = 0.25 * vel;
  n.connect(bp); bp.connect(ng); ng.connect(out); n.start(t);
}
// Nota generica "di legno": parziali con decadimenti diversi + colpo di battente.
function toneNote(out, f, t, parts, click = 0.2, vel = 1) {
  parts.forEach(([mult, amp, dec, type]) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || "sine"; o.frequency.value = f * mult;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(amp * vel, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dec + 0.05);
  });
  if (click) {
    const len = Math.floor(ac.sampleRate * 0.02), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const n = ac.createBufferSource(), bp = ac.createBiquadFilter(), ng = ac.createGain();
    n.buffer = buf; bp.type = "bandpass"; bp.frequency.value = Math.min(6000, f * 2.4); bp.Q.value = 3; ng.gain.value = click * vel;
    n.connect(bp); bp.connect(ng); ng.connect(out); n.start(t);
  }
}
const seq = (vol, notes, fn) => { const out = bus(vol), t = ac.currentTime + 0.03; notes.forEach(([f, dt, v = 1]) => fn(out, f, t + dt, v)); };

export const SOUNDS = {
  wood: { name: "Marimba di legno", emoji: "🪵", desc: "Cinque note calde e morbide", every: 2200, play() {
    seq(0.32, [[523.25, 0, .75], [659.25, .15, .75], [783.99, .3, .75], [659.25, .45, .75], [1046.5, .68, .9]], (o, f, t, v) => woodNote(o, f, t, v));
  } },
  kalimba: { name: "Kalimba", emoji: "🎶", desc: "Piano a pollice, dolce e cristallino", every: 2400, play() {
    seq(0.3, [[783.99, 0], [987.77, .18], [1174.66, .36], [1567.98, .54, .8], [1174.66, .9, .7]],
      (o, f, t, v) => toneNote(o, f, t, [[1, .8, 1.3], [2.01, .12, .5], [5.9, .04, .12]], 0.12, v));
  } },
  xylo: { name: "Xilofono", emoji: "🎵", desc: "Legno più brillante e allegro", every: 2000, play() {
    seq(0.38, [[1046.5, 0], [1318.51, .12], [1567.98, .24], [2093, .4, .85]],
      (o, f, t, v) => toneNote(o, f, t, [[1, .8, .38], [3, .25, .12], [6.2, .05, .05]], 0.3, v));
  } },
  bamboo: { name: "Bambù", emoji: "🎋", desc: "Canne di legno che si toccano nel vento", every: 2600, play() {
    seq(0.55, [[587.33, 0, .8], [783.99, .11, .6], [659.25, .29, .9], [880, .38, .55], [523.25, .6, .7], [783.99, .82, .8]],
      (o, f, t, v) => toneNote(o, f, t, [[1, .7, .7, "triangle"], [3, .15, .2]], 0.18, v));
  } },
  blocks: { name: "Legnetti", emoji: "🥢", desc: "Toc-toc secco, come una clave", every: 1800, play() {
    seq(0.27, [[880, 0], [880, .17], [660, .55], [660, .72]],
      (o, f, t, v) => toneNote(o, f, t, [[1, .9, .09], [2.3, .3, .04]], 0.55, v));
  } },
};
const soundKey = () => (SOUNDS[prefs.get("timerSound", "wood")] ? prefs.get("timerSound", "wood") : "wood");
const soft = (p) => { try { navigator.vibrate?.(p); } catch {} };
function ring() { try { audio(); SOUNDS[soundKey()].play(); } catch {} soft([60, 100, 60]); }
// Avvio timer: un solo "toc" di legno, leggero.
function startSound() { try { audio(); const out = bus(0.22); woodNote(out, 783.99, ac.currentTime + 0.02, 0.6); woodNote(out, 1174.66, ac.currentTime + 0.11, 0.5); } catch {} soft(12); }

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
  T.forEach((t) => {
    if (!t.done && now >= t.end) { t.done = true; t.lastRing = now; ch = true; ring(); notify(t); }
    // Suona finché non lo fermi tu.
    else if (t.done && now - (t.lastRing || 0) > SOUNDS[soundKey()].every) { t.lastRing = now; ring(); }
  });
  if (ch) { save(); wake(); }
  const box = el(); if (!box) return;
  const s = T.map((t) => t.id + (t.done ? "d" : "r")).join();
  if (s !== sig) {
    sig = s;
    box.innerHTML = T.map((t) => `<div class="trow${t.done ? " done" : ""}" data-tid="${t.id}">
      <div class="tr" style="--p:0"></div>
      <div class="tt"><b data-b="${t.id}">${t.done ? "Pronto!" : fmt((t.end - now) / 1000)}</b><span>${esc(t.n)}</span></div>
      ${t.done ? "" : `<button data-add="${t.id}" aria-label="Aggiungi un minuto">+1</button>`}
      <button data-x="${t.id}">${t.done ? "Ferma" : "Stop"}</button></div>`).join("");
  }
  T.forEach((t) => {
    const row = box.querySelector(`[data-tid="${t.id}"]`); if (!row) return;
    const left = Math.max(0, (t.end - now) / 1000);
    row.querySelector(".tr").style.setProperty("--p", t.done ? 100 : 100 - (left / t.dur) * 100);
    if (!t.done) row.querySelector("b").textContent = fmt(left);
  });
}

export const timers = {
  /** C'è già un timer (attivo o appena suonato) con questa etichetta? */
  has(label) { return T.some((t) => t.n === label); },
  list: () => T,
  add(id, sec) { const t = T.find((t) => t.id == id); if (t && !t.done) { t.end += sec * 1000; t.dur += sec; save(); paint(); } },
  stop(id) { T = T.filter((t) => t.id != id); save(); wake(); paint(); },
  get sound() { return soundKey(); },
  setSound(k) { if (SOUNDS[k]) prefs.set("timerSound", k); },
  preview(k) { try { if (SOUNDS[k]) { audio(); SOUNDS[k].play(); } } catch {} },
  start(label, seconds) {
    audio();
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {});
    const id = Date.now();
    T.push({ id, n: label, end: id + seconds * 1000, dur: seconds, done: false });
    save(); wake(); paint();
    startSound();
    return id;
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

/** Durata del primo tempo citato in un passaggio, per il pulsante "Imposta timer". */
export function stepTimer(text) {
  const m = String(text).match(/(\d+)(?:–(\d+))?\s+(?:altri\s+)?minut[oi]/);
  if (!m) return null;
  const max = +(m[2] || m[1]);
  return { sec: max * 60, label: m[2] ? `${m[1]}–${m[2]} min` : `${m[1]} min` };
}

/** Trasforma "cuoci 15–18 minuti" in testo con un pulsante timer. */
export function withTimers(text, label) {
  return esc(text).replace(/(\d+)(?:–(\d+))?\s+((?:altri\s+)?minut[oi])/g, (m, a, b) => {
    const max = b || a;
    return `${m} <button class="tm" data-tm="${max * 60}" data-n="${esc(label)}">⏱ ${b ? a + "–" + b : a}′</button>`;
  });
}
