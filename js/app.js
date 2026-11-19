import { PLAN, SPESA, PREP, PASTI } from "./data.js";
import { store, prefs } from "./store.js";
import { sync } from "./sync.js";
import { timers, withTimers } from "./timers.js";

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const buzz = (ms = 8) => { try { navigator.vibrate?.(ms); } catch {} };
const DAY = 864e5;
const CHECK = `<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/* ---------- Tema ---------- */
const mq = matchMedia("(prefers-color-scheme: dark)");
function applyTheme() {
  const p = prefs.get("theme", "light");
  const dark = p === "dark" || (p === "auto" && mq.matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => (m.content = dark ? "#0b1510" : "#f3faf1"));
}
mq.addEventListener?.("change", applyTheme);
applyTheme();

/* ---------- Conteggi ---------- */
const spesaKeys = () => SPESA.flatMap((g) => g.items.map((_, i) => `s:${g.id}:${i}`));
const mealKeys = () => PASTI.flatMap((m) => [0, 1].map((j) => `m:${m.id}:${j}`));
const count = (keys) => keys.filter((k) => store.get(k)).length;

/* ---------- Toast con Annulla ---------- */
let toastT;
function toast(msg, undo) {
  const t = $("#toast");
  t.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button type="button">Annulla</button>' : ""}`;
  if (undo) t.querySelector("button").onclick = () => { undo(); t.classList.remove("show"); buzz(); };
  t.classList.add("show");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("show"), undo ? 5000 : 2200);
}
function resetKeys(keys, msg) {
  const obj = Object.fromEntries(keys.filter((k) => store.get(k)).map((k) => [k, null]));
  if (!Object.keys(obj).length) return toast("Niente da azzerare");
  const prev = store.setMany(obj);
  buzz(20);
  toast(msg, () => store.setMany(prev));
}

/* ---------- Sottotitolo: freschezza ---------- */
function headerLine() {
  const pd = store.get("prepDate");
  const left = $("#fridge");
  if (pd) {
    const days = PLAN.fridgeDays - Math.floor((Date.now() - pd) / DAY);
    const day = new Date(pd).toLocaleDateString("it-IT", { weekday: "long" });
    left.innerHTML = days > 1 ? `Preparato ${day} · <b>ancora ${days} giorni</b>` : days === 1 ? `Preparato ${day} · <b>ultimo giorno</b>` : `Preparato ${day} · <b>da consumare subito</b>`;
    return;
  }
  const s = spesaKeys(), n = s.length - count(s);
  left.innerHTML = n ? `${PLAN.subtitle} · <b>${n} da comprare</b>` : `Spesa fatta · <b>pronto a cucinare</b>`;
}

/* ---------- Pagina: Spesa ---------- */
const openState = { cart: false, prep: new Set() };
function ring(n, tot, label) {
  return `<div class="ring" style="--p:${tot ? Math.round((n / tot) * 100) : 0}" data-l="${n}/${tot}"></div><div class="txt"><b>${label}</b>`;
}
function rowHTML(k, text, checked) {
  return `<div class="row${checked ? " checked" : ""}" data-k="${k}"><div class="bgl">${checked ? "↺ Rimetti in lista" : "✓ Preso"}</div>
    <div class="fg" role="checkbox" aria-checked="${checked}" tabindex="0"><span class="box">${CHECK}</span><span class="lbl">${esc(text)}</span></div></div>`;
}
function renderSpesa() {
  const keys = spesaKeys(), n = count(keys), tot = keys.length;
  let h = `<div class="prog">${ring(n, tot, n === tot ? "Spesa completata" : "Lista della spesa")}<span>${n} di ${tot} nel carrello</span></div></div>`;
  h += `<div class="chips"><button class="chip" data-act="share">↗ Condividi lista</button><button class="chip" data-act="reset-s">↺ Azzera</button></div>`;
  let any = false;
  for (const g of SPESA) {
    const todo = g.items.map((t, i) => [t, `s:${g.id}:${i}`]).filter(([, k]) => !store.get(k));
    if (!todo.length) continue;
    any = true;
    h += `<div class="grp"><h3>${g.emoji} ${g.name}</h3><span>${g.items.length - todo.length}/${g.items.length}</span></div><div class="list">${todo.map(([t, k]) => rowHTML(k, t, false)).join("")}</div>`;
  }
  if (!any) h += `<div class="empty"><span class="big">🛒</span>Tutto nel carrello! Scorri a sinistra per iniziare a cucinare.</div>`;
  const done = SPESA.flatMap((g) => g.items.map((t, i) => [t, `s:${g.id}:${i}`])).filter(([, k]) => store.get(k));
  if (done.length) h += `<details class="cart" data-open="cart"${openState.cart ? " open" : ""}><summary>Nel carrello (${done.length})</summary><div class="list">${done.map(([t, k]) => rowHTML(k, t, true)).join("")}</div></details>`;
  if (!prefs.get("swiped")) h += `<p class="hint-swipe">Scorri un articolo verso destra per spuntarlo · scorri lo schermo per cambiare sezione</p>`;
  $("#p-0").innerHTML = h;
}

/* ---------- Pagina: Preparazione ---------- */
function renderPrep() {
  const n = PREP.filter((p) => store.get("p:" + p.id)).length, tot = PREP.length;
  let h = "";
  if (n < tot) {
    h += `<div class="hero"><h2>${n ? "Riprendi da dove eri" : "Un’ora, dieci pasti"}</h2><p>${n ? `Mancano ${tot - n} preparazioni.` : "Ti guido passo per passo, con i timer già pronti."}</p>
      <button class="btn light" data-cook="prep">▶ ${n ? "Continua" : "Inizia a cucinare"}</button></div>`;
  } else {
    h += `<div class="hero" style="--x:1"><h2>Tutto pronto 🎉</h2><p>Dieci pasti in frigo. Buon appetito per i prossimi giorni.</p><button class="btn light" data-goto="2">Vai ai pasti →</button></div>`;
  }
  h += `<div class="prog">${ring(n, tot, "Preparazioni")}<span>${n} di ${tot} fatte${n < tot ? " · le cotture vanno in parallelo" : ""}</span></div></div>`;
  h += `<ol class="tl-list">`;
  PREP.forEach((p, idx) => {
    const done = !!store.get("p:" + p.id);
    h += `<li class="step${done ? " done" : ""}"><div class="rail"><button class="em" data-tog="p:${p.id}" aria-label="${done ? "Segna da fare" : "Segna fatto"}: ${esc(p.t)}">${p.emoji}</button></div>
      <details class="pcard" data-open="prep:${p.id}"${openState.prep.has(p.id) ? " open" : ""}><summary><h3>${esc(p.t)}</h3><span class="mins">≈ ${p.min} min</span></summary>
      <div class="pbody">${p.hint ? `<p class="phint">${esc(p.hint)}</p>` : ""}<ul class="ing">${p.i.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      <ol class="steps">${p.s.map((x) => `<li>${withTimers(x, p.t)}</li>`).join("")}</ol>
      <div class="prow"><button class="btn pri" data-cook="prep" data-from="${idx}">▶ Cucina</button><button class="btn ghost" data-tog="p:${p.id}">${done ? "↺ Da rifare" : "✓ Fatto"}</button></div></div></details></li>`;
  });
  h += `</ol><div class="chips" style="margin-top:8px"><button class="chip" data-act="reset-p">↺ Azzera la preparazione</button></div>`;
  $("#p-1").innerHTML = h;
}

/* ---------- Pagina: Pasti ---------- */
function renderPasti() {
  const keys = mealKeys(), n = count(keys);
  let h = `<div class="prog">${ring(n, 10, n === 10 ? "Settimana finita!" : "Pasti")}<span>${10 - n} porzioni rimaste</span></div></div>`;
  const pd = store.get("prepDate");
  if (pd) {
    const days = PLAN.fridgeDays - Math.floor((Date.now() - pd) / DAY);
    h += `<div class="fresh${days <= 1 ? " warn" : ""}"><span class="d">${Math.max(0, days)}</span><span>${days > 0 ? `giorn${days === 1 ? "o" : "i"} di freschezza rimast${days === 1 ? "o" : "i"}. Consuma prima i piatti con le verdure crude.` : "Oltre i giorni consigliati: controlla bene prima di mangiare."}</span></div>`;
  } else {
    h += `<div class="fresh"><span class="d">🌱</span><span>Dopo la preparazione hai ${PLAN.fridgeDays} giorni per gustarli al meglio. Ognuno si assembla in 5 minuti.</span></div>`;
  }
  for (const m of PASTI) {
    const e = [0, 1].map((j) => !!store.get(`m:${m.id}:${j}`));
    h += `<article class="meal${e[0] && e[1] ? " all" : ""}" style="--h:${m.hue}" data-meal="${m.id}" tabindex="0" role="button" aria-label="${esc(m.t)}: apri ricetta">
      <div class="mi"><h3>${esc(m.t)}</h3><div class="plates">${e.map((on, j) => `<button class="plate${on ? " on" : ""}" data-tog="m:${m.id}:${j}" aria-pressed="${on}"><i></i>Porzione ${j + 1}</button>`).join("")}</div></div>
      <div class="me" aria-hidden="true">${m.emoji}</div></article>`;
  }
  h += `<div class="chips" style="margin-top:8px"><button class="chip" data-act="reset-m">↺ Azzera i pasti</button></div>`;
  $("#p-2").innerHTML = h;
}

function renderTabs() {
  const s = spesaKeys();
  $("#tc-0").textContent = `${count(s)}/${s.length}`;
  $("#tc-1").textContent = `${PREP.filter((p) => store.get("p:" + p.id)).length}/${PREP.length}`;
  $("#tc-2").textContent = `${count(mealKeys())}/10`;
}

function renderAll() {
  renderSpesa(); renderPrep(); renderPasti(); renderTabs(); headerLine();
  if ($("#sheet").classList.contains("open") && sheetRender) sheetRender();
}

/* ---------- Data di preparazione automatica ---------- */
function checkPrepDate() {
  const all = PREP.every((p) => store.get("p:" + p.id));
  const pd = store.get("prepDate");
  if (all && !pd) { store.set("prepDate", Date.now()); toast(`🎉 Fatto! 10 pasti pronti per ${PLAN.fridgeDays} giorni`); buzz([30, 60, 30]); }
  if (!all && pd && !PREP.some((p) => store.get("p:" + p.id))) store.set("prepDate", null);
}

/* ---------- Pager con swipe ---------- */
const pager = $("#pager"), strip = $("#strip"), ind = $("#ind");
const qp = new URLSearchParams(location.search).get("p");
let page = Math.min(2, Math.max(0, qp != null ? +qp || 0 : prefs.get("page", 0)));
function setPos(px = 0, anim = true) {
  strip.classList.toggle("anim", anim);
  strip.style.transform = `translateX(calc(${(-page * 100) / 3}% + ${px}px))`;
  const W = pager.clientWidth || 1;
  ind.style.transition = anim ? "transform .38s cubic-bezier(.2,.8,.2,1)" : "none";
  ind.style.transform = `translateX(${(page - px / W) * 100}%)`;
}
function goTo(i, anim = true) {
  const prev = page;
  page = Math.min(2, Math.max(0, i));
  setPos(0, anim);
  document.querySelectorAll(".tabs button").forEach((b, j) => { b.setAttribute("aria-selected", j === page); b.tabIndex = j === page ? 0 : -1; });
  document.querySelectorAll(".page").forEach((p, j) => p.setAttribute("aria-hidden", j !== page));
  prefs.set("page", page);
  if (prev !== page) buzz(5);
}

let g = null, swallowClick = false;
pager.addEventListener("pointerdown", (e) => {
  if (e.button > 0 || e.target.closest("input,textarea,.ck-ing")) return;
  g = { x0: e.clientX, y0: e.clientY, t0: performance.now(), mode: null, row: e.target.closest(".row"), id: e.pointerId, W: pager.clientWidth, dx: 0 };
});
addEventListener("pointermove", (e) => {
  if (!g || e.pointerId !== g.id) return;
  const dx = e.clientX - g.x0, dy = e.clientY - g.y0;
  if (!g.mode) {
    if (Math.abs(dx) < 9 && Math.abs(dy) < 9) return;
    if (Math.abs(dx) > Math.abs(dy) * 1.2) {
      g.mode = g.row && dx > 0 ? "row" : "page";
      try { pager.setPointerCapture(g.id); } catch {}
      document.body.style.userSelect = "none";
    } else { g = null; return; }
  }
  g.dx = dx;
  if (g.mode === "page") {
    let off = dx;
    if ((page === 0 && dx > 0) || (page === 2 && dx < 0)) off = dx / 3.5;
    setPos(off, false);
  } else {
    const d = Math.max(0, dx), fg = g.row.querySelector(".fg");
    fg.style.transition = "none";
    fg.style.transform = `translateX(${d}px)`;
    g.row.querySelector(".bgl").style.opacity = Math.min(1, d / 70);
    if (d > 80 && !g.armed) { g.armed = true; buzz(10); } else if (d <= 80) g.armed = false;
  }
});
function endGesture(cancel) {
  if (!g) return;
  const { mode, dx, t0, W, row } = g;
  document.body.style.userSelect = "";
  if (mode) { swallowClick = true; setTimeout(() => (swallowClick = false), 50); }
  if (mode === "page") {
    const v = dx / (performance.now() - t0);
    let next = page;
    if (!cancel) { if (dx < -W * 0.2 || v < -0.45) next++; else if (dx > W * 0.2 || v > 0.45) next--; }
    if (next !== page && !prefs.get("swiped")) { prefs.set("swiped", true); setTimeout(renderSpesa, 400); }
    goTo(next);
  } else if (mode === "row") {
    const fg = row.querySelector(".fg");
    fg.style.transition = "transform .3s cubic-bezier(.2,.8,.2,1)";
    if (dx > 80 && !cancel) {
      fg.style.transform = `translateX(${W}px)`;
      if (!prefs.get("swiped")) prefs.set("swiped", true);
      toggleRow(row, true);
    } else { fg.style.transform = ""; row.querySelector(".bgl").style.opacity = 0; }
  }
  g = null;
}
addEventListener("pointerup", () => endGesture(false));
addEventListener("pointercancel", () => endGesture(true));
addEventListener("click", (e) => { if (swallowClick) { e.stopPropagation(); e.preventDefault(); swallowClick = false; } }, true);
addEventListener("resize", () => setPos(0, false));

/* ---------- Spunta articolo con animazione ---------- */
function toggleRow(row, swiped) {
  const k = row.dataset.k, v = !store.get(k);
  buzz(v ? 12 : 6);
  row.classList.toggle("checked", v);
  store.set(k, v || null, { silent: true });
  setTimeout(() => {
    row.style.maxHeight = row.offsetHeight + "px";
    requestAnimationFrame(() => row.classList.add("leaving"));
    setTimeout(() => store.notify(), 300);
  }, swiped ? 120 : 260);
}

/* ---------- Bottom sheet ---------- */
const sheet = $("#sheet"), sheetBody = $("#sheetBody"), panel = $(".sheet-panel");
let sheetRender = null;
function openSheet(render) {
  sheetRender = render; render();
  sheetBody.scrollTop = 0;
  sheet.classList.add("open"); sheet.setAttribute("aria-hidden", "false");
  history.pushState({ overlay: "sheet" }, "");
  setTimeout(() => panel.querySelector("button,[tabindex]")?.focus({ preventScroll: true }), 350);
}
function closeSheet(fromPop) {
  if (!sheet.classList.contains("open")) return;
  if (!fromPop && history.state?.overlay === "sheet") return history.back();
  sheet.classList.remove("open"); sheet.setAttribute("aria-hidden", "true");
  panel.style.transform = ""; sheetRender = null;
}
sheet.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeSheet(); });

// Trascina giù per chiudere: dalla maniglia, o dal contenuto quando è in cima.
(function sheetDrag() {
  let s = null;
  const start = (y, fromGrab) => { s = { y0: y, dy: 0, t0: performance.now(), grab: fromGrab, active: fromGrab }; };
  const move = (y, ev) => {
    if (!s) return;
    const dy = y - s.y0;
    if (!s.active) { if (dy > 6 && sheetBody.scrollTop <= 0) s.active = true; else if (Math.abs(dy) > 6) { s = null; return; } else return; }
    ev?.cancelable && ev.preventDefault();
    s.dy = Math.max(0, dy);
    sheet.classList.add("drag");
    panel.style.transform = `translateY(${s.dy}px)`;
  };
  const end = () => {
    if (!s) return;
    sheet.classList.remove("drag");
    const v = s.dy / (performance.now() - s.t0);
    if (s.active && (s.dy > 110 || v > 0.6)) { panel.style.transform = "translateY(100%)"; setTimeout(() => closeSheet(), 10); }
    else panel.style.transform = "";
    s = null;
  };
  $("#grab").addEventListener("pointerdown", (e) => { start(e.clientY, true); $("#grab").setPointerCapture(e.pointerId); });
  $("#grab").addEventListener("pointermove", (e) => move(e.clientY));
  $("#grab").addEventListener("pointerup", end);
  $("#grab").addEventListener("pointercancel", end);
  $("#grab").addEventListener("click", () => closeSheet());
  sheetBody.addEventListener("touchstart", (e) => start(e.touches[0].clientY, false), { passive: true });
  sheetBody.addEventListener("touchmove", (e) => move(e.touches[0].clientY, e), { passive: false });
  sheetBody.addEventListener("touchend", end);
})();

function mealSheet(id) {
  const m = PASTI.find((x) => x.id === id);
  openSheet(() => {
    const e = [0, 1].map((j) => !!store.get(`m:${m.id}:${j}`));
    sheetBody.innerHTML = `<div class="sh-hero"><span class="e">${m.emoji}</span><div><h2 id="sheet-title">${esc(m.t)}</h2><p class="note">Assemblaggio in 5 minuti · 2 porzioni</p></div></div>
      <div class="plates" style="color:var(--ink)">${e.map((on, j) => `<button class="plate${on ? " on" : ""}" style="background:${on ? "" : "var(--surf2)"}" data-tog="m:${m.id}:${j}" aria-pressed="${on}"><i></i>Porzione ${j + 1} mangiata</button>`).join("")}</div>
      <div class="sh-sec">Ingredienti</div><ul class="ing">${m.i.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      <div class="sh-sec">Procedimento</div><ol class="steps">${m.s.map((x) => `<li>${withTimers(x, m.short)}</li>`).join("")}</ol>
      <button class="btn pri block" data-cook="meal:${m.id}">▶ Cucina passo passo</button>`;
  });
}

let installEvt = null;
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEvt = e; });

function settingsSheet() {
  openSheet(() => {
    const th = prefs.get("theme", "light");
    const st = { local: "Solo su questo dispositivo", syncing: "Sincronizzo…", synced: "Sincronizzato", offline: "Offline: sincronizzo appena torni online", error: "Errore di connessione, riprovo" }[sync.status];
    sheetBody.innerHTML = `<h2 id="sheet-title" style="font-size:25px;margin-bottom:6px">Impostazioni</h2>
      <div class="sh-sec">Salvataggio</div>
      ${sync.configured ? `<p class="note"><b>${st}</b>. Chi apre il tuo link d’invito vede e modifica la stessa lista in tempo reale.</p>
        <p class="note">Codice casa: <span class="code">${esc(sync.household)}</span></p>
        <div class="prow" style="margin:10px 0"><button class="btn pri" data-act="invite">↗ Invita in casa</button><button class="btn ghost" data-act="sync-now">↻ Sincronizza</button></div>
        <div class="field"><input id="joinCode" placeholder="Incolla un codice o un link d’invito" autocomplete="off" autocapitalize="off"><button class="btn ghost" data-act="join">Entra</button></div>`
      : `<p class="note">I dati sono salvati su questo dispositivo. Per sincronizzarli tra telefoni e condividere la lista, collega Supabase (istruzioni nel README del progetto).</p>`}
      <div class="sh-sec">Aspetto</div>
      <div class="set-row"><span>Tema</span><div class="seg">${[["auto", "Auto"], ["light", "Chiaro"], ["dark", "Scuro"]].map(([v, l]) => `<button data-theme-set="${v}" class="${th === v ? "on" : ""}">${l}</button>`).join("")}</div></div>
      ${installEvt ? `<div class="set-row"><span>Installa come app</span><button class="btn ghost" data-act="install">Installa</button></div>` : `<p class="note" style="margin-top:12px">📱 Su iPhone: Condividi → “Aggiungi alla schermata Home” per usarla come un’app, anche offline.</p>`}
      <div class="sh-sec">Gesti</div>
      <ul class="ing"><li>Scorri lo schermo a destra/sinistra per cambiare sezione</li><li>Scorri un articolo verso destra per metterlo nel carrello</li><li>Trascina giù le schede per chiuderle</li><li>In modalità cucina scorri tra i passaggi; lo schermo resta acceso</li><li>Scorri di lato un timer per eliminarlo</li></ul>
      <div class="sh-sec">Nuova settimana</div>
      <button class="btn ghost block" data-act="reset-all">↺ Ricomincia da zero</button>
      <p class="note" style="text-align:center;margin-top:16px">Ricette: ${PLAN.source}. Conversioni in g e ml approssimative.</p>`;
  });
}
const syncBtn = $("#syncBtn");
let settingsSheetRender = null;
sync.onStatus((s) => {
  syncBtn.dataset.s = s;
  $("#syncLbl").textContent = { local: "Locale", syncing: "Sync", synced: "Sync", offline: "Offline", error: "Errore" }[s];
  if (sheetRender && sheetRender === settingsSheetRender) sheetRender();
});
syncBtn.addEventListener("click", () => { settingsSheet(); settingsSheetRender = sheetRender; });

/* ---------- Modalità cucina ---------- */
const cook = $("#cook");
let ck = null, wl = null;
function cookSteps(kind) {
  if (kind === "prep") return PREP.flatMap((r, ri) => r.s.map((text, i) => ({ r, ri, i, n: r.s.length, text, key: "p:" + r.id })));
  const m = PASTI.find((x) => "meal:" + x.id === kind);
  return m.s.map((text, i) => ({ r: { ...m, t: m.short, i: m.i }, i, n: m.s.length, text, meal: m }));
}
function openCook(kind, from) {
  const steps = cookSteps(kind);
  let idx = 0;
  if (kind === "prep") {
    const startRec = from != null && from !== "" ? +from : PREP.findIndex((p) => !store.get("p:" + p.id));
    idx = Math.max(0, steps.findIndex((s) => s.ri === Math.max(0, startRec)));
  }
  ck = { kind, steps, idx };
  if ($("#sheet").classList.contains("open")) { sheet.classList.remove("open"); sheet.setAttribute("aria-hidden", "true"); sheetRender = null; history.replaceState({ overlay: "cook" }, ""); }
  else history.pushState({ overlay: "cook" }, "");
  renderCook();
  cook.classList.add("open"); cook.setAttribute("aria-hidden", "false");
  try { navigator.wakeLock?.request("screen").then((l) => (wl = l)).catch(() => {}); } catch {}
}
function closeCook(fromPop) {
  if (!cook.classList.contains("open")) return;
  if (!fromPop && history.state?.overlay === "cook") return history.back();
  cook.classList.remove("open"); cook.setAttribute("aria-hidden", "true"); cook.style.transform = "";
  try { wl?.release(); } catch {} wl = null; ck = null;
}
function renderCook() {
  const { steps, kind } = ck;
  const last = kind === "prep"
    ? `<div class="ck-card ck-done"><div class="big">🎉</div><h2 style="font-size:30px;margin:8px 0">Tutto pronto!</h2><p class="note">Dieci pasti in frigo per ${PLAN.fridgeDays} giorni.</p><button class="btn pri" data-goto="2" data-close-cook>Vai ai pasti →</button></div>`
    : `<div class="ck-card ck-done"><div class="big">😋</div><h2 style="font-size:30px;margin:8px 0">Buon appetito!</h2><button class="btn pri" data-eat="${steps[0].meal.id}">✓ Segna 2 porzioni mangiate</button></div>`;
  cook.innerHTML = `<div class="ck-top"><button class="x" data-close-cook aria-label="Chiudi">✕</button><div class="ck-bar">${steps.map(() => "<i></i>").join("")}<i></i></div></div>
    <div class="ck-stage"><div class="ck-strip">${steps.map((s, j) => `<div class="ck-card" aria-hidden="true">
      <div class="ck-rec"><span class="e">${s.r.emoji}</span><span>${esc(s.r.t)}</span></div>
      <div class="ck-n">Passaggio ${s.i + 1} di ${s.n}</div>
      <p class="ck-txt">${withTimers(s.text, s.r.t)}</p>
      ${`<details class="ck-ing"${s.i === 0 ? " open" : ""}><summary>Ingredienti</summary><ul class="ing" style="margin-top:8px">${s.r.i.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></details>`}
      </div>`).join("")}${last}</div></div>
    <div class="ck-nav"><button class="btn ghost back" data-ck="-1" aria-label="Passaggio precedente">←</button><button class="btn pri" data-ck="1" id="ckNext">Avanti →</button></div>`;
  ckGo(ck.idx, false);
}
function ckGo(i, anim = true) {
  const total = ck.steps.length + 1;
  const prev = ck.idx;
  i = Math.max(0, Math.min(total - 1, i));
  // Avanzando oltre l'ultimo passaggio di una ricetta, la ricetta si segna come fatta.
  if (anim && i > prev && ck.kind === "prep") {
    const s = ck.steps[prev];
    if (s && s.i === s.n - 1 && !store.get(s.key)) { store.set(s.key, true); buzz(25); toast(`${s.r.emoji} ${s.r.t}: fatto!`); checkPrepDate(); }
  }
  ck.idx = i;
  const stripEl = $(".ck-strip", cook);
  stripEl.classList.toggle("anim", anim);
  stripEl.style.transform = `translateX(${-i * 100}%)`;
  stripEl.querySelectorAll(".ck-card").forEach((c, j) => c.setAttribute("aria-hidden", j !== i));
  cook.querySelectorAll(".ck-bar i").forEach((b, j) => b.classList.toggle("on", j <= i));
  const next = $("#ckNext", cook), nav = $(".ck-nav", cook);
  nav.style.display = i === total - 1 ? "none" : "";
  next.textContent = i === total - 2 ? "Fine ✓" : (ck.steps[i]?.i === ck.steps[i]?.n - 1 && ck.kind === "prep" ? "Fatto, avanti →" : "Avanti →");
  if (anim && i !== prev) buzz(6);
}
(function cookGestures() {
  let s = null;
  cook.addEventListener("pointerdown", (e) => {
    if (e.button > 0 || !ck) return;
    const top = e.target.closest(".ck-top"), stage = e.target.closest(".ck-stage");
    if (!top && !stage) return;
    s = { x0: e.clientX, y0: e.clientY, t0: performance.now(), mode: null, top: !!top, id: e.pointerId, W: cook.clientWidth };
  });
  cook.addEventListener("pointermove", (e) => {
    if (!s || e.pointerId !== s.id) return;
    const dx = e.clientX - s.x0, dy = e.clientY - s.y0;
    if (!s.mode) {
      if (Math.abs(dx) < 9 && Math.abs(dy) < 9) return;
      if (s.top && dy > Math.abs(dx)) s.mode = "down";
      else if (Math.abs(dx) > Math.abs(dy) * 1.2) s.mode = "x";
      else { s = null; return; }
      try { cook.setPointerCapture(s.id); } catch {}
    }
    s.dx = dx; s.dy = dy;
    if (s.mode === "x") {
      const total = ck.steps.length + 1;
      const off = (ck.idx === 0 && dx > 0) || (ck.idx === total - 1 && dx < 0) ? dx / 3.5 : dx;
      const st = $(".ck-strip", cook); st.classList.remove("anim");
      st.style.transform = `translateX(calc(${-ck.idx * 100}% + ${off}px))`;
    } else { cook.classList.add("drag"); cook.style.transform = `translateY(${Math.max(0, dy)}px)`; }
  });
  const end = (cancel) => {
    if (!s) return;
    if (s.mode) { swallowClick = true; setTimeout(() => (swallowClick = false), 50); }
    if (s.mode === "x") {
      const v = (s.dx || 0) / (performance.now() - s.t0);
      let n = ck.idx;
      if (!cancel) { if (s.dx < -s.W * 0.18 || v < -0.45) n++; else if (s.dx > s.W * 0.18 || v > 0.45) n--; }
      ckGo(n);
    } else if (s.mode === "down") {
      cook.classList.remove("drag");
      if (!cancel && s.dy > 120) { cook.style.transform = "translateY(100%)"; setTimeout(() => closeCook(), 10); }
      else cook.style.transform = "";
    }
    s = null;
  };
  cook.addEventListener("pointerup", () => end(false));
  cook.addEventListener("pointercancel", () => end(true));
})();

addEventListener("popstate", () => {
  const o = history.state?.overlay;
  if (o !== "cook") closeCook(true);
  if (o !== "sheet") closeSheet(true);
});

/* ---------- Azioni (delegate) ---------- */
async function shareList() {
  const lines = SPESA.map((g) => {
    const todo = g.items.filter((_, i) => !store.get(`s:${g.id}:${i}`));
    return todo.length ? `${g.emoji} ${g.name}\n${todo.map((t) => "• " + t).join("\n")}` : "";
  }).filter(Boolean);
  const text = lines.length ? `🛒 Lista della spesa\n\n${lines.join("\n\n")}` : "🛒 Spesa completata!";
  try { if (navigator.share) return await navigator.share({ title: "Lista della spesa", text }); } catch (e) { if (e.name === "AbortError") return; }
  try { await navigator.clipboard.writeText(text); toast("Lista copiata negli appunti"); } catch { toast("Impossibile copiare"); }
}
async function invite() {
  const url = sync.inviteLink();
  try { if (navigator.share) return await navigator.share({ title: "Meal prep", text: "Cuciniamo insieme: apri per condividere la lista", url }); } catch (e) { if (e.name === "AbortError") return; }
  try { await navigator.clipboard.writeText(url); toast("Link d’invito copiato"); } catch { prompt("Copia questo link", url); }
}

document.addEventListener("click", async (e) => {
  const t = e.target;
  const tm = t.closest("[data-tm]");
  if (tm) { e.stopPropagation(); timers.start(tm.dataset.n, +tm.dataset.tm); toast(`⏱ Timer avviato: ${tm.dataset.n}`); return; }
  const tog = t.closest("[data-tog]");
  if (tog) {
    e.stopPropagation();
    const k = tog.dataset.tog, v = !store.get(k);
    store.set(k, v || null); buzz(v ? 12 : 6);
    if (k.startsWith("p:")) checkPrepDate();
    if (k.startsWith("m:") && v && mealKeys().every((x) => store.get(x))) toast("🎉 Settimana completata! Pronto per un nuovo meal prep?");
    return;
  }
  const row = t.closest(".row .fg");
  if (row) return toggleRow(row.parentElement, false);
  const cookBtn = t.closest("[data-cook]");
  if (cookBtn) return openCook(cookBtn.dataset.cook, cookBtn.dataset.from);
  const ckb = t.closest("[data-ck]");
  if (ckb && ck) return ckGo(ck.idx + +ckb.dataset.ck);
  const eat = t.closest("[data-eat]");
  if (eat) { store.setMany({ [`m:${eat.dataset.eat}:0`]: true, [`m:${eat.dataset.eat}:1`]: true }); buzz(20); closeCook(); return; }
  const gt = t.closest("[data-goto]");
  if (gt) { if (t.closest("[data-close-cook]")) closeCook(); goTo(+gt.dataset.goto); return; }
  if (t.closest("[data-close-cook]")) return closeCook();
  const tab = t.closest(".tabs [data-page]");
  if (tab) return goTo(+tab.dataset.page);
  const meal = t.closest("[data-meal]");
  if (meal) return mealSheet(meal.dataset.meal);
  const th = t.closest("[data-theme-set]");
  if (th) { prefs.set("theme", th.dataset.themeSet); applyTheme(); sheetRender?.(); return; }
  const act = t.closest("[data-act]")?.dataset.act;
  if (!act) return;
  if (act === "share") shareList();
  if (act === "reset-s") resetKeys(spesaKeys(), "Spesa azzerata");
  if (act === "reset-p") resetKeys([...PREP.map((p) => "p:" + p.id), "prepDate"], "Preparazione azzerata");
  if (act === "reset-m") resetKeys(mealKeys(), "Pasti azzerati");
  if (act === "reset-all") { closeSheet(); resetKeys([...spesaKeys(), ...PREP.map((p) => "p:" + p.id), "prepDate", ...mealKeys()], "Si ricomincia: nuova settimana"); goTo(0); }
  if (act === "invite") invite();
  if (act === "sync-now") sync.now();
  if (act === "install" && installEvt) { installEvt.prompt(); installEvt = null; }
  if (act === "join") {
    try { await sync.join($("#joinCode").value); toast("Sei entrato nella casa"); sheetRender?.(); }
    catch (err) { toast(err.message || "Codice non valido"); }
  }
});

// Ricorda quali schede sono aperte, così i re-render non le chiudono.
document.addEventListener("toggle", (e) => {
  const o = e.target.dataset?.open; if (!o) return;
  if (o === "cart") openState.cart = e.target.open;
  else if (o.startsWith("prep:")) { const id = o.slice(5); e.target.open ? openState.prep.add(id) : openState.prep.delete(id); }
}, true);

// Tastiera: frecce per sezioni e passaggi, Esc per chiudere, Spazio/Invio sugli elementi.
document.addEventListener("keydown", (e) => {
  if (e.target.closest("input,textarea")) return;
  if (e.key === "Escape") { if (ck) closeCook(); else closeSheet(); return; }
  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
    const d = e.key === "ArrowRight" ? 1 : -1;
    if (ck) return ckGo(ck.idx + d);
    if (!sheet.classList.contains("open")) { goTo(page + d); document.getElementById("tab-" + page)?.focus(); }
  }
  if ((e.key === " " || e.key === "Enter") && (e.target.matches(".row .fg") || e.target.matches("[data-meal]"))) { e.preventDefault(); e.target.click(); }
});

/* ---------- Avvio ---------- */
store.subscribe(() => { renderAll(); if (ck) { /* la modalità cucina resta com'è */ } });
renderAll();
goTo(page, false);
requestAnimationFrame(() => document.body.classList.add("ready"));
timers.init();
sync.start();
setInterval(headerLine, 60_000);
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").then((r) => r.update()).catch(() => {});
  let reloaded = !navigator.serviceWorker.controller; // al primo avvio non serve ricaricare
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (!reloaded) { reloaded = true; location.reload(); } });
}
