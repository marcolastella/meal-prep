import { PLAN, SPESA, PREP, PASTI } from "./data.js";
import { store, prefs } from "./store.js";
import { sync } from "./sync.js";
import { timers, withTimers, stepTimer, SOUNDS, fmt } from "./timers.js";
import { motionBlur, dragBlur, clearBlur, burst, confetti, ripple, stagger, bump } from "./fx.js";
import qrcode from "./vendor/qrcode.mjs";
import { ico } from "./icons.js";

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const buzz = (ms = 8) => { try { navigator.vibrate?.(ms); } catch {} };
const DAY = 864e5;
const CHECK = `<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
document.documentElement.dataset.theme = "light";

/* ---------- Persone e avatar ---------- */
const HUES = [142, 96, 168, 30, 200, 330, 52, 265];
const hueOf = (id) => HUES[[...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length];
const initials = (m) => ((m?.first?.[0] || "") + (m?.last?.[0] || "")).toUpperCase() || "?";
const shortName = (m) => [m?.first, m?.last ? m.last.trim()[0].toUpperCase() + "." : ""].filter(Boolean).join(" ");
const fullName = (m) => [m?.first, m?.last].filter(Boolean).join(" ") || "Senza nome";
// Icone per l'avatar, a tema cucina vegana.
const ICONS = ["🥑", "🥕", "🍅", "🥦", "🌶️", "🍆", "🥬", "🧄", "🧅", "🍋", "🍓", "🫐", "🍉", "🥥", "🍄", "🌽", "🫑", "🥒", "🍠", "🫛", "🍌", "🍍", "🍒", "🥐", "🥖", "🥨", "🍜", "🍝", "🥗", "🥟", "🍲", "🥘", "🫕", "🥣", "🧁", "🍪", "🍩", "☕", "🍵", "🫖", "🥄", "🍴", "🔪", "🧑‍🍳", "🌱", "🌿"];
function avatar(m, size = 30, cls = "") {
  const on = sync.online.has(m.id), ic = m.icon && ICONS.includes(m.icon) ? m.icon : "";
  return `<span class="av ${cls}${ic ? " emo" : ""}${on ? " on" : ""}" style="--h:${hueOf(m.id)};--s:${size}px" title="${esc(fullName(m))}">${ic || esc(initials(m))}</span>`;
}
function who(v) { return typeof v === "string" ? sync.member(v) : null; }
function ago(t) {
  if (!t) return "";
  const m = Math.round((Date.now() - t) / 6e4);
  if (m < 2) return "attivo ora";
  if (m < 60) return `visto ${m} min fa`;
  const h = Math.round(m / 60);
  if (h < 24) return `visto ${h} h fa`;
  return `visto ${Math.round(h / 24)} g fa`;
}

/* ---------- Conteggi ---------- */
const spesaKeys = () => SPESA.flatMap((g) => g.items.map((_, i) => `s:${g.id}:${i}`));
// Ogni ricetta fa 2 porzioni: una per pranzo, una per cena.
const SLOTS = [["pranzo", "🌞", "Pranzo"], ["cena", "🌙", "Cena"]];
const mealKeys = () => PASTI.flatMap((m) => SLOTS.map(([s]) => `m:${m.id}:${s}`));
const TOT_PORZ = PASTI.length * SLOTS.length;
const ingr = (m) => m.i;
/* ---------- Giorno della spesa ---------- */
const dayStart = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const dayLabel = (t, long) => {
  const diff = Math.round((dayStart(Date.now()) - dayStart(t)) / DAY);
  if (diff === 0) return "oggi";
  if (diff === 1) return "ieri";
  return new Date(t).toLocaleDateString("it-IT", long ? { weekday: "long", day: "numeric", month: "long" } : { weekday: "short", day: "numeric" });
};
const count = (keys) => keys.filter((k) => store.get(k)).length;

/* ---------- Toast con Annulla ---------- */
let toastT;
function toast(msg, undo) {
  const t = $("#toast");
  t.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button type="button">Annulla</button>' : ""}`;
  if (undo) t.querySelector("button").onclick = () => { undo(); t.classList.remove("show"); buzz(); };
  t.classList.add("show");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("show"), undo ? 5000 : 2400);
}
function resetKeys(keys, msg) {
  const obj = Object.fromEntries(keys.filter((k) => store.get(k)).map((k) => [k, null]));
  if (!Object.keys(obj).length) return toast("Niente da azzerare");
  const prev = store.setMany(obj);
  buzz(20);
  toast(msg, () => store.setMany(prev));
}

/* ---------- Intestazione ---------- */
function renderHeader() {
  const pd = store.get("prepDate");
  const left = $("#fridge");
  if (pd) {
    const days = PLAN.fridgeDays - Math.floor((Date.now() - pd) / DAY);
    const day = new Date(pd).toLocaleDateString("it-IT", { weekday: "long" });
    left.innerHTML = days > 1 ? `Preparato ${day} · <b>ancora ${days} giorni</b>` : days === 1 ? `Preparato ${day} · <b>ultimo giorno</b>` : `Preparato ${day} · <b>da consumare subito</b>`;
  } else {
    const s = spesaKeys(), n = s.length - count(s);
    left.innerHTML = shoppingNow() ? `🛒 <b>Spesa in corso</b>` : n ? `${PLAN.subtitle} · <b>${n} mancano in dispensa</b>` : `Dispensa completa · <b>pronto a cucinare</b>`;
  }
  const hn = sync.houseName();
  $("#house").textContent = hn ? "🏡 " + hn : "🏡 La mia casa";
  const me = sync.me;
  $("#avs").innerHTML = me.first
    ? avatar({ ...me }, 32) + `<span class="me-name">${esc(shortName(me))}</span>`
    : `<span class="av add" style="--s:32px">＋</span><span class="me-name">Profilo</span>`;
}

/* ---------- Pagina: Spesa ---------- */
const openState = { cart: false, prep: new Set() };
let justChecked = null, justTog = null; // solo l'elemento appena toccato si anima
function ring(n, tot, label) {
  return `<div class="ring" style="--p:${tot ? Math.round((n / tot) * 100) : 0}" data-l="${n}/${tot}"></div><div class="txt"><b>${label}</b>`;
}
function rowHTML(k, text, v) {
  const checked = !!v, w = who(v);
  return `<div class="row${checked ? " checked" : ""}${justChecked === k ? " just" : ""}" data-k="${k}"><div class="bgl">${checked ? "↺ Rimetti in lista" : "✓ Preso"}</div>
    <div class="fg" role="checkbox" aria-checked="${checked}" tabindex="0"><span class="box">${CHECK}</span><span class="lbl">${esc(text)}</span>${checked && w ? avatar(w, 24, "mini") : ""}</div></div>`;
}
/* ---------- Pagina: Dispensa (frigo + inventario) ---------- */
const pantry = () => SPESA.flatMap((g) => g.items.map((t, i) => ({ g, i, k: `s:${g.id}:${i}`, text: t, em: g.em[i], name: g.short[i][0], qty: g.short[i][1] })));
function shopBannerHTML() {
  const sh = shoppingNow();
  if (!sh || shopOpen) return "";
  const w = who(sh.by), mine = sh.by === sync.me.id;
  return `<button class="shop-banner" data-act="shop-open"><div class="sb-l"><span class="cart-ico">🛒</span><div><b>${mine ? "Spesa in corso" : `${esc(w ? w.first : "Qualcuno")} sta facendo la spesa`}</b><span>${mine ? "Tocca per riaprire la lista" : "La dispensa si aggiorna mentre compra"}</span></div></div><span class="chev">›</span></button>`;
}
// Icona della dispensa: credenza con vasetti, bottiglia e cesto di verdure.
const PANTRY_ICON = `<svg viewBox="0 0 64 64" aria-hidden="true">
  <rect x="5" y="4" width="54" height="56" rx="10" fill="#effaec" stroke="#16b04f" stroke-width="3"/>
  <path d="M5 24h54M5 42h54" stroke="#16b04f" stroke-width="3"/>
  <rect x="11" y="12" width="11" height="12" rx="3" fill="#fff" stroke="#0e8a3e" stroke-width="2"/><rect x="10" y="9" width="13" height="4.5" rx="2" fill="#16b04f"/>
  <rect x="26" y="10" width="11" height="14" rx="3" fill="#ffd166" stroke="#d99a1b" stroke-width="2"/><rect x="25" y="7.5" width="13" height="4" rx="2" fill="#e8590c"/>
  <path d="M45 24V15c0-2 3-3 3-5V7h4v3c0 2 3 3 3 5v9z" fill="#b6ec3c" stroke="#0e8a3e" stroke-width="2" stroke-linejoin="round"/>
  <rect x="11" y="30" width="9" height="12" rx="2" fill="#ff7a59" stroke="#c94a2c" stroke-width="2"/><rect x="22" y="30" width="9" height="12" rx="2" fill="#ff7a59" stroke="#c94a2c" stroke-width="2"/>
  <path d="M36 42l2-11c1-3 9-3 10 0l2 11z" fill="#f4e3c3" stroke="#b78a4a" stroke-width="2" stroke-linejoin="round"/><path d="M40 33h6" stroke="#b78a4a" stroke-width="2" stroke-linecap="round"/>
  <path d="M12 54h40l-3-8H15z" fill="#d9a066" stroke="#9c6b35" stroke-width="2" stroke-linejoin="round"/>
  <path d="M20 47c-1-4 2-7 5-8" stroke="#16b04f" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M27 47l4-8 3 8z" fill="#ff8a3d"/><circle cx="41" cy="45" r="3.5" fill="#e63946"/>
</svg>`;
function shelvesHTML() {
  const items = pantry();
  return SPESA.map((g) => {
    const list = items.filter((x) => x.g === g), n = list.filter((x) => store.get(x.k)).length;
    return `<section class="fsh"><div class="fsh-h"><h3>${g.emoji} ${g.name}</h3><span>${n}/${list.length}</span></div>
      <div class="tiles">${list.map((x) => { const v = store.get(x.k), w = who(v);
        return `<button class="tile${v ? " have" : ""}${justTog === x.k ? " just" : ""}" data-have="${x.k}" aria-pressed="${!!v}">
          <span class="te">${ico(x.em)}</span><span class="tn">${esc(x.name)}</span><span class="tq">${esc(x.qty)}</span>
          ${v ? `<span class="ts">${w ? avatar(w, 20, "mini") : "✓"}</span>` : ""}</button>`; }).join("")}</div><div class="shelf-line"></div></section>`;
  }).join("");
}
function renderDispensa() {
  const items = pantry(), have = items.filter((x) => store.get(x.k)).length, miss = items.length - have;
  let h = shopBannerHTML();
  h += `<div class="pantry-head"><span class="pantry-ico">${PANTRY_ICON}</span>
      <div class="ph-t"><b>${miss ? "La tua dispensa" : "Dispensa completa ✨"}</b><span>${have} di ${items.length} ingredienti${miss ? ` · ne mancano ${miss}` : ""}</span>
      <div class="ph-bar"><i style="width:${(have / items.length) * 100}%"></i></div></div></div>
    <button class="btn pri big-shop${miss ? "" : " full"}" data-act="shop-open"${miss ? "" : " disabled"}>
      <span class="cart-ico">🛒</span><span><b>${miss ? "Vai a fare la spesa" : "Niente da comprare"}</b><small>${miss ? `${miss} prodotti che non hai in dispensa` : "La dispensa ha già tutto"}</small></span>${miss ? `<span class="badge">${miss}</span>` : ""}</button>
    <div class="chips pantry-chips"><button class="chip" data-act="pantry-all">✓ Ho tutto</button><button class="chip" data-act="share">↗ Condividi cosa manca</button><button class="chip" data-act="reset-s">↺ Svuota</button></div>
    <p class="fv-hint">Tocca un ingrediente per segnare se ce l’hai</p>
    <div class="shelves">${shelvesHTML()}</div>`;
  $("#p-0").innerHTML = h;
}
/* ---------- Pagina: Preparazione ---------- */
function renderPrep() {
  const n = PREP.filter((p) => store.get("p:" + p.id)).length, tot = PREP.length;
  let h = "";
  if (n < tot) {
    h += `<div class="hero" style="--fd:-${(Date.now() % 5000) / 1000}s"><h2>${n ? "Riprendi da dove eri" : "Un’ora, dieci pasti"}</h2><p>${n ? `Mancano ${tot - n} preparazioni.` : "Ti guido passo per passo, con i timer già pronti."}</p>
      <button class="btn light" data-cook="prep">▶ ${n ? "Continua" : "Inizia a cucinare"}</button></div>`;
  } else {
    h += `<div class="hero" style="--fd:-${(Date.now() % 5000) / 1000}s"><h2>Tutto pronto 🎉</h2><p>Dieci pasti in frigo. Buon appetito per i prossimi giorni.</p><button class="btn light" data-goto="2">Vai ai pasti →</button></div>`;
  }
  h += `<div class="prog">${ring(n, tot, "Preparazioni")}<span>${n} di ${tot} fatte${n < tot ? " · le cotture vanno in parallelo" : ""}</span></div></div>`;
  h += `<ol class="tl-list">`;
  PREP.forEach((p, idx) => {
    const v = store.get("p:" + p.id), done = !!v, w = who(v);
    h += `<li class="step${done ? " done" : ""}${justTog === "p:" + p.id ? " just" : ""}"><div class="rail"><button class="em" data-tog="p:${p.id}" aria-label="${done ? "Segna da fare" : "Segna fatto"}: ${esc(p.t)}">${p.emoji}</button></div>
      <details class="pcard" data-open="prep:${p.id}"${openState.prep.has(p.id) ? " open" : ""}><summary><h3>${esc(p.t)}</h3>${done && w ? avatar(w, 24, "mini") : ""}<span class="mins">≈ ${p.min} min</span></summary>
      <div class="pbody">${p.hint ? `<p class="phint">${esc(p.hint)}</p>` : ""}<ul class="ing">${p.i.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      <ol class="steps">${p.s.map((x) => `<li>${withTimers(x, p.t)}</li>`).join("")}</ol>
      <div class="prow"><button class="btn pri" data-cook="prep" data-from="${idx}">▶ Cucina</button><button class="btn ghost" data-tog="p:${p.id}">${done ? "↺ Da rifare" : "✓ Fatto"}</button></div></div></details></li>`;
  });
  h += `</ol><div class="chips" style="margin-top:8px"><button class="chip" data-act="reset-p">↺ Azzera la preparazione</button></div>`;
  $("#p-1").innerHTML = h;
}

/* ---------- Pagina: Pasti ---------- */
function slotsHTML(m) {
  return SLOTS.map(([slot, emo, label]) => {
    const k = `m:${m.id}:${slot}`, v = store.get(k), on = !!v, w = who(v);
    return `<button class="plate eat slot${on ? " on" : ""}${justTog === k ? " just" : ""}" data-tog="${k}" aria-pressed="${on}" aria-label="${label}${on ? ": mangiato, tocca per annullare" : ": segna come mangiato"}"><span class="yum">${emo}</span><span class="et">${label}</span>${on && w ? avatar(w, 22, "eat-av") : on ? '<span class="ok">✓</span>' : ""}</button>`;
  }).join("");
}
function renderPasti() {
  const keys = mealKeys(), n = count(keys);
  let h = `<div class="prog">${ring(n, TOT_PORZ, n === TOT_PORZ ? "Settimana finita!" : "Pasti")}<span>${TOT_PORZ - n} porzioni da mangiare · 2 per piatto</span></div></div>`;
  const pd = store.get("prepDate");
  if (pd) {
    const days = PLAN.fridgeDays - Math.floor((Date.now() - pd) / DAY);
    h += `<div class="fresh${days <= 1 ? " warn" : ""}"><span class="d">${Math.max(0, days)}</span><span>${days > 0 ? `giorn${days === 1 ? "o" : "i"} di freschezza rimast${days === 1 ? "o" : "i"}. Consuma prima i piatti con le verdure crude.` : "Oltre i giorni consigliati: controlla bene prima di mangiare."}</span></div>`;
  } else {
    h += `<div class="fresh"><span class="d">🌱</span><span>Dopo la preparazione hai ${PLAN.fridgeDays} giorni per gustarli al meglio. Ognuno si assembla in 5 minuti.</span></div>`;
  }
  h += `<div class="meals">`;
  for (const m of PASTI) {
    const all = SLOTS.every(([sl]) => store.get(`m:${m.id}:${sl}`));
    h += `<article class="meal${all ? " all" : ""}" style="--h:${m.hue}" data-meal="${m.id}" tabindex="0" role="button" aria-label="${esc(m.t)}: apri ricetta">
      <div class="mi"><h3>${esc(m.t)}</h3><div class="plates">${slotsHTML(m)}</div></div>
      <div class="me" aria-hidden="true">${m.emoji}</div></article>`;
  }
  h += `</div>`;
  h += `<div class="chips" style="margin-top:8px"><button class="chip" data-act="reset-m">↺ Azzera i pasti</button></div>`;
  $("#p-2").innerHTML = h;
}

const lastTabs = ["", "", ""];
function renderTabs() {
  const s = spesaKeys();
  const vals = [`${count(s)}/${s.length}`, `${PREP.filter((p) => store.get("p:" + p.id)).length}/${PREP.length}`, `${count(mealKeys())}/${TOT_PORZ}`];
  vals.forEach((v, i) => {
    const el = $("#tc-" + i);
    if (lastTabs[i] && lastTabs[i] !== v) bump(el);
    el.textContent = v; lastTabs[i] = v;
  });
}

function renderAll() {
  renderDispensa(); if (shopOpen) paintShop(); renderPrep(); renderPasti(); renderTabs(); renderHeader();
  justChecked = null; justTog = null;
  if (sheet.classList.contains("open") && sheetRender && canRerenderSheet()) sheetRender();
}

/* ---------- Modalità spesa ---------- */
// Una spesa dimenticata aperta scade da sola dopo 4 ore.
const shoppingNow = () => { const sh = store.get("shopping"); return sh && Date.now() - sh.at < 4 * 36e5 ? sh : null; };
let shopLock = null;
async function keepAwake(on) {
  try {
    if (on && !shopLock && navigator.wakeLock) { shopLock = await navigator.wakeLock.request("screen"); shopLock.onrelease = () => { shopLock = null; }; }
    if (!on && shopLock) { await shopLock.release(); shopLock = null; }
  } catch {}
}
const shopEl = () => $("#shop");
let shopOpen = false, shopList = [];
function openShop() {
  const items = pantry();
  // la lista parte sempre dalla dispensa: solo ciò che manca (più quello già preso in questa spesa)
  const sh = shoppingNow();
  if (!sh || !shopList.length) shopList = items.filter((x) => !store.get(x.k)).map((x) => x.k);
  if (!shopList.length) { toast("✨ La dispensa ha già tutto"); return; }
  if (!sh || sh.by !== sync.me.id) store.set("shopping", { by: sync.me.id, at: Date.now() });
  shopOpen = true; keepAwake(true); buzz([15, 40, 15]);
  const el = shopEl();
  const byG = SPESA.map((g) => [g, items.filter((x) => x.g === g && shopList.includes(x.k))]).filter(([, l]) => l.length);
  el.innerHTML = `<div class="ck-top shop-top"><button class="x" data-act="shop-close" aria-label="Chiudi">✕</button>
      <div class="st-t"><b>🛒 Spesa</b><span id="shopCount"></span></div><span class="st-pct" id="shopPct"></span></div>
    <div class="shop-bar"><i id="shopBar"></i></div>
    <div class="shop-list">${byG.map(([g, l]) => `<section class="sg"><div class="grp"><h3>${g.emoji} ${g.name}</h3><span data-gc="${g.id}"></span></div>
      <div class="list">${l.map((x) => `<button class="srow" data-buy="${x.k}"><span class="box">${CHECK}</span><span class="se">${ico(x.em)}</span><span class="sl"><b>${esc(x.name)}</b><small>${esc(x.text)}</small></span></button>`).join("")}</div></section>`).join("")}
      <p class="note" style="text-align:center;margin:18px 0 0">Quello che spunti entra da solo in dispensa 🧺</p></div>
    <div class="ck-nav"><button class="btn pri block" data-act="shop-done">✓ Fine spesa</button></div>`;
  el.classList.add("open"); el.setAttribute("aria-hidden", "false"); document.body.classList.add("cooking");
  history.pushState({ overlay: "shop" }, "");
  paintShop();
  [...el.querySelectorAll(".sg")].forEach((c, i) => c.animate([{ opacity: 0, transform: "translateY(18px)" }, { opacity: 1, transform: "none" }], { duration: 420, delay: 80 + i * 60, easing: "cubic-bezier(.2,.9,.25,1)", fill: "backwards" }));
  renderDispensa();
}
function paintShop() {
  const el = shopEl(); if (!el) return;
  let got = 0;
  el.querySelectorAll("[data-buy]").forEach((b) => { const on = !!store.get(b.dataset.buy); b.classList.toggle("on", on); if (on) got++; });
  SPESA.forEach((g) => { const c = el.querySelector(`[data-gc="${g.id}"]`); if (!c) return; const l = shopList.filter((k) => k.startsWith(`s:${g.id}:`)); c.textContent = `${l.filter((k) => store.get(k)).length}/${l.length}`; });
  const tot = shopList.length;
  const cEl = $("#shopCount"); if (cEl) cEl.textContent = `${got} di ${tot} nel carrello`;
  const pEl = $("#shopPct"); if (pEl) pEl.textContent = `${Math.round((got / Math.max(1, tot)) * 100)}%`;
  const bar = $("#shopBar"); if (bar) bar.style.width = `${(got / Math.max(1, tot)) * 100}%`;
}
function closeShop(fromPop, finish) {
  if (!shopOpen) return;
  if (!fromPop && history.state?.overlay === "shop") { history.back(); if (finish) finishShopping(); return; }
  shopOpen = false;
  const el = shopEl(); el.classList.remove("open"); el.setAttribute("aria-hidden", "true"); document.body.classList.remove("cooking");
  setTimeout(() => { if (!shopOpen) el.innerHTML = ""; }, 400);
  renderDispensa();
}
function finishShopping() {
  const got = shopList.filter((k) => store.get(k)).length;
  store.set("shopping", null); keepAwake(false); shopList = [];
  buzz(15);
  toast(got ? `🧺 ${got} prodott${got === 1 ? "o" : "i"} in dispensa` : "Spesa chiusa");
  if (spesaKeys().every((x) => store.get(x))) setTimeout(confetti, 300);
  setTimeout(() => { const f = $(".pantry-ico"); if (f) bump(f); }, 450);
}
document.addEventListener("visibilitychange", () => { if (!document.hidden && shopOpen) keepAwake(true); });

/* ---------- Traguardi ---------- */
function checkPrepDate() {
  const all = PREP.every((p) => store.get("p:" + p.id));
  const pd = store.get("prepDate");
  if (all && !pd) { store.set("prepDate", Date.now()); toast(`🎉 Fatto! 10 pasti pronti per ${PLAN.fridgeDays} giorni`); buzz([30, 60, 30]); confetti(); }
  if (!all && pd && !PREP.some((p) => store.get("p:" + p.id))) store.set("prepDate", null);
}
function checkMilestones(k, v) {
  if (!v) return;
  if (k.startsWith("s:") && spesaKeys().every((x) => store.get(x)) && !shopOpen) { setTimeout(confetti, 250); toast("🧺 Dispensa completa!"); }
  if (k.startsWith("m:") && mealKeys().every((x) => store.get(x))) { setTimeout(confetti, 250); toast("🎉 Settimana completata! Pronto per un nuovo meal prep?"); }
}

/* ---------- Pager con swipe e motion blur ---------- */
const pager = $("#pager"), strip = $("#strip"), ind = $("#ind");
const qp = new URLSearchParams(location.search).get("p");
let page = Math.min(2, Math.max(0, qp != null ? +qp || 0 : prefs.get("page", 0)));
function setPos(px = 0, anim = true) {
  strip.classList.toggle("anim", anim);
  strip.style.transform = `translateX(calc(${(-page * 100) / 3}% + ${px}px))`;
  const W = pager.clientWidth || 1;
  ind.style.transition = anim ? "transform .5s cubic-bezier(.34,1.4,.5,1)" : "none";
  ind.style.transform = `translateX(${(page - px / W) * 100}%)`;
}
function goTo(i, anim = true) {
  const prev = page;
  page = Math.min(2, Math.max(0, i));
  setPos(0, anim);
  document.querySelectorAll(".tabs button").forEach((b, j) => { b.setAttribute("aria-selected", j === page); b.tabIndex = j === page ? 0 : -1; });
  document.querySelectorAll(".page").forEach((p, j) => p.setAttribute("aria-hidden", j !== page));
  prefs.set("page", page);
  if (prev !== page && anim && !isWide()) {
    buzz(5);
    motionBlur(strip, Math.min(6, 2.5 + Math.abs(prev - page) * 2));
    stagger($("#p-" + page));
  }
}

const wide = matchMedia("(min-width: 1024px) and (orientation: landscape), (min-width: 1200px)");
const isWide = () => wide.matches;
wide.addEventListener?.("change", () => { document.body.classList.toggle("wide", isWide()); setPos(0, false); });
document.body.classList.toggle("wide", isWide());
let g = null, swallowClick = false;
pager.addEventListener("pointerdown", (e) => {
  if (e.button > 0 || e.target.closest("input,textarea,.ck-ing")) return;
  g = { x0: e.clientX, y0: e.clientY, t0: performance.now(), mode: null, row: e.target.closest(".row"), id: e.pointerId, W: pager.clientWidth, dx: 0, lx: e.clientX, lt: performance.now(), v: 0 };
});
addEventListener("pointermove", (e) => {
  if (!g || e.pointerId !== g.id) return;
  const dx = e.clientX - g.x0, dy = e.clientY - g.y0;
  if (!g.mode) {
    if (Math.abs(dx) < 9 && Math.abs(dy) < 9) return;
    if (Math.abs(dx) > Math.abs(dy) * 1.2) {
      g.mode = g.row && dx > 0 ? "row" : isWide() ? null : "page";
      if (!g.mode) { g = null; return; }
      try { pager.setPointerCapture(g.id); } catch {}
      document.body.style.userSelect = "none";
    } else { g = null; return; }
  }
  const now = performance.now();
  g.v = 0.7 * g.v + 0.3 * ((e.clientX - g.lx) / Math.max(1, now - g.lt));
  g.lx = e.clientX; g.lt = now; g.dx = dx;
  if (g.mode === "page") {
    let off = dx;
    if ((page === 0 && dx > 0) || (page === 2 && dx < 0)) off = dx / 3.5;
    setPos(off, false);
    dragBlur(strip, g.v);
  } else {
    const d = Math.max(0, dx), fg = g.row.querySelector(".fg");
    fg.style.transition = "none";
    fg.style.transform = `translateX(${d}px) rotate(${Math.min(2, d / 80)}deg)`;
    const bg = g.row.querySelector(".bgl");
    bg.style.opacity = Math.min(1, d / 70);
    if (d > 80 && !g.armed) { g.armed = true; buzz(10); bg.classList.add("armed"); } else if (d <= 80 && g.armed) { g.armed = false; bg.classList.remove("armed"); }
  }
});
function endGesture(cancel) {
  if (!g) return;
  const { mode, dx, W, row, v } = g;
  document.body.style.userSelect = "";
  if (mode) { swallowClick = true; setTimeout(() => (swallowClick = false), 50); }
  if (mode === "page") {
    clearBlur(strip);
    let next = page;
    if (!cancel) { if (dx < -W * 0.2 || v < -0.45) next++; else if (dx > W * 0.2 || v > 0.45) next--; }
    if (next !== page && !prefs.get("swiped")) { prefs.set("swiped", true); setTimeout(renderDispensa, 450); }
    goTo(next);
  } else if (mode === "row") {
    const fg = row.querySelector(".fg");
    fg.style.transition = "transform .32s cubic-bezier(.2,.8,.2,1), filter .32s";
    if (dx > 80 && !cancel) {
      fg.style.transform = `translateX(${W}px) rotate(4deg)`;
      fg.style.filter = "blur(3px)";
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
  if (v) { burst(row.querySelector(".box")); justChecked = k; }
  store.set(k, v ? sync.me.id : null, { silent: true });
  setTimeout(() => {
    row.style.maxHeight = row.offsetHeight + "px";
    requestAnimationFrame(() => row.classList.add("leaving"));
    setTimeout(() => { store.notify(); checkMilestones(k, v); }, 300);
  }, swiped ? 120 : 280);
}

/* ---------- Tocco: onde e rimbalzi ---------- */
document.addEventListener("pointerdown", (e) => {
  const el = e.target.closest(".btn,.chip,.meal,.row .fg,.plate,.set-row.tap,.mrow");
  if (el) ripple(e, el);
}, { passive: true });

/* ---------- Bottom sheet ---------- */
// Non ridisegnare la scheda mentre si sta scrivendo (si perderebbero i campi).
let lastTyping = 0;
document.addEventListener("focusin", (e) => { if (e.target.matches?.("#sheetBody input")) lastTyping = Date.now(); });
document.addEventListener("input", (e) => { if (e.target.matches?.("#sheetBody input")) lastTyping = Date.now(); }, true);
function canRerenderSheet() {
  if (sheetKind === "profile") return false;
  if (sheetKind === "welcome" && document.querySelector("#sheetBody #pFirst")?.value) return false;
  if (document.activeElement?.matches?.("#sheetBody input")) return false;
  return Date.now() - lastTyping > 1500;
}
const sheet = $("#sheet"), sheetBody = $("#sheetBody"), panel = $(".sheet-panel");
let sheetRender = null, sheetKind = null;
function openSheet(render, kind = null) {
  const wasOpen = sheet.classList.contains("open");
  sheetRender = render; sheetKind = kind; render();
  sheetBody.scrollTop = 0;
  if (!wasOpen) {
    sheet.classList.add("open"); sheet.setAttribute("aria-hidden", "false");
    history.pushState({ overlay: "sheet" }, "");
  } else stagger(sheetBody, 6);
}
function closeSheet(fromPop) {
  if (!sheet.classList.contains("open")) return;
  if (!fromPop && history.state?.overlay === "sheet") return history.back();
  sheet.classList.remove("open"); sheet.setAttribute("aria-hidden", "true");
  panel.style.transform = ""; sheetRender = null; sheetKind = null;
  document.activeElement?.blur?.();
}
sheet.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeSheet(); });

const tablet = matchMedia("(min-width: 744px)");
const sheetT = (dy) => (tablet.matches ? `translate(-50%, calc(-50% + ${dy}))` : `translateY(${dy})`);
(function sheetDrag() {
  let s = null;
  const start = (y, fromGrab) => { s = { y0: y, dy: 0, t0: performance.now(), active: fromGrab }; };
  const move = (y, ev) => {
    if (!s) return;
    const dy = y - s.y0;
    if (!s.active) { if (dy > 6 && sheetBody.scrollTop <= 0) s.active = true; else if (Math.abs(dy) > 6) { s = null; return; } else return; }
    ev?.cancelable && ev.preventDefault();
    s.dy = Math.max(0, dy);
    sheet.classList.add("drag");
    panel.style.transform = sheetT(s.dy + "px");
  };
  const end = () => {
    if (!s) return;
    sheet.classList.remove("drag");
    const v = s.dy / (performance.now() - s.t0);
    if (s.active && (s.dy > 110 || v > 0.6)) { panel.style.transform = sheetT("100vh"); setTimeout(() => closeSheet(), 10); }
    else panel.style.transform = "";
    s = null;
  };
  const grab = $("#grab");
  grab.addEventListener("pointerdown", (e) => { start(e.clientY, true); grab.setPointerCapture(e.pointerId); });
  grab.addEventListener("pointermove", (e) => move(e.clientY));
  grab.addEventListener("pointerup", end);
  grab.addEventListener("pointercancel", end);
  sheetBody.addEventListener("touchstart", (e) => { if (!e.target.closest("input")) start(e.touches[0].clientY, false); }, { passive: true });
  sheetBody.addEventListener("touchmove", (e) => move(e.touches[0].clientY, e), { passive: false });
  sheetBody.addEventListener("touchend", end);
})();

function mealSheet(id) {
  const m = PASTI.find((x) => x.id === id);
  openSheet(() => {
    sheetBody.innerHTML = `<div class="sh-hero"><span class="e">${m.emoji}</span><div><h2 id="sheet-title">${esc(m.t)}</h2><p class="note">Assemblaggio in 5 minuti</p></div></div>
      <div class="plates sheet-plates">${slotsHTML(m)}</div>
      <div class="sh-sec">Ingredienti · 2 porzioni</div><ul class="ing">${ingr(m).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      <div class="sh-sec">Procedimento</div><ol class="steps">${m.s.map((x) => `<li>${withTimers(x, m.short)}</li>`).join("")}</ol>
      <button class="btn pri block" data-cook="meal:${m.id}">▶ Cucina passo passo</button>`;
  }, "meal");
}

/* ---------- Casa: impostazioni, membri, profilo ---------- */
let installEvt = null;
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEvt = e; });

function houseSheet() {
  openSheet(() => {
    const ms = sync.members(), onl = ms.filter((m) => sync.online.has(m.id)).length;
    const st = { local: "Solo su questo dispositivo", syncing: "Sincronizzo…", synced: "Sincronizzato", offline: "Offline: sincronizzo appena torni online", error: "Errore di connessione, riprovo" }[sync.status];
    const me = sync.me;
    sheetBody.innerHTML = `
      <div class="house-card">
        <span class="house-emoji">🏡</span>
        <input class="house-name" id="houseName" value="${esc(sync.houseName())}" placeholder="Dai un nome alla casa" maxlength="40" enterkeyhint="done" aria-label="Nome della casa">
        <p class="house-sub"><span class="dot-s" data-s="${sync.status}"></span>${ms.length} ${ms.length === 1 ? "persona" : "persone"} · ${onl} online ora</p>
        <div class="prow"><button class="btn pri" data-act="qr">▦ Invita con QR</button><button class="btn ghost" data-act="scan">⌖ Scansiona</button></div>
      </div>
      <div class="sh-sec">Chi c’è in casa</div>
      <div class="mlist">${ms.length ? ms.map((m) => `<div class="mrow">${avatar(m, 42)}<div class="mtxt"><b>${esc(fullName(m))}${m.id === me.id ? ' <span class="you">tu</span>' : ""}</b><span>${sync.online.has(m.id) ? '<i class="live"></i>online ora' : esc(ago(m.seen))}</span></div>${m.id !== me.id ? `<button class="mx" data-rm="${esc(m.id)}" aria-label="Rimuovi ${esc(fullName(m))}">✕</button>` : ""}</div>`).join("") : `<p class="note">Ancora nessuno: scrivi il tuo nome qui sotto e invita chi cucina con te.</p>`}</div>
      <div class="sh-sec">Il tuo profilo</div>
      <div class="me-card">
        <div class="me-top">${avatar({ ...me, id: me.id }, 64)}<div class="me-txt"><b>${esc(me.first ? shortName(me) : "Senza nome")}</b><span>così ti vedono in casa</span></div></div>
        <button class="opt-row" data-act="edit-avatar"><span class="oi person"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.2" r="3.9"/><path d="M4.6 20.2c.9-3.9 3.9-6.1 7.4-6.1s6.5 2.2 7.4 6.1"/></svg></span><span class="ot"><b>Modifica avatar</b><span>Scegli un’icona a tema cucina</span></span><span class="chev">›</span></button>
        <button class="opt-row" data-act="edit-sound"><span class="oi">${SOUNDS[timers.sound].emoji}</span><span class="ot"><b>Modifica suono timer</b><span>${esc(SOUNDS[timers.sound].name)}</span></span><span class="chev">›</span></button>
      </div>
      <div class="pform">
        <label><span>Nome</span><input id="pFirst" value="${esc(me.first)}" placeholder="Marco" autocomplete="given-name" autocapitalize="words" maxlength="30" enterkeyhint="next"></label>
        <label><span>Cognome</span><input id="pLast" value="${esc(me.last)}" placeholder="Rossi" autocomplete="family-name" autocapitalize="words" maxlength="30" enterkeyhint="done"></label>
      </div>
      <div class="sh-sec">Entra in un’altra casa</div>
      <div class="field"><input id="joinCode" placeholder="Incolla codice o link d’invito" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"><button class="btn ghost" data-act="join">Entra</button></div>
      <p class="note">Entrando in un’altra casa vedrai la sua lista al posto della tua.</p>
      <div class="sh-sec">Sincronizzazione</div>
      <div class="set-row"><span class="note"><b>${st}</b><br>Codice: <span class="code">${esc(sync.household)}</span></span><button class="btn ghost" data-act="sync-now">↻</button></div>
      ${installEvt ? `<div class="set-row"><span>Installa come app</span><button class="btn ghost" data-act="install">Installa</button></div>` : `<p class="note" style="margin-top:12px">📱 Su iPhone: Condividi → “Aggiungi alla schermata Home” per usarla come un’app, anche offline.</p>`}
      <div class="sh-sec">Gesti</div>
      <ul class="ing"><li>Scorri lo schermo a destra/sinistra per cambiare sezione</li><li>Scorri un articolo verso destra per metterlo nel carrello</li><li>Trascina giù le schede per chiuderle</li><li>In modalità cucina scorri tra i passaggi; lo schermo resta acceso</li><li>Scorri di lato un timer per eliminarlo</li></ul>
      <div class="sh-sec">Nuova settimana</div>
      <button class="btn ghost block" data-act="reset-all">↺ Ricomincia da zero</button>
      <button class="btn ghost block danger" data-act="new-house" style="margin-top:8px">Crea una casa nuova</button>
      <p class="note" style="text-align:center;margin-top:16px">Ricette: ${PLAN.source}. Conversioni in g e ml approssimative.</p>`;
  }, "house");
}

function qrSVG(text) {
  const q = qrcode(0, "M"); q.addData(text); q.make();
  const n = q.getModuleCount(), m = 2, size = n + m * 2;
  let dots = "";
  const finder = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c) && !finder(r, c)) dots += `<rect x="${c + m + 0.08}" y="${r + m + 0.08}" width=".84" height=".84" rx=".38"/>`;
  const eye = (x, y) => `<rect x="${x + 0.5}" y="${y + 0.5}" width="6" height="6" rx="1.8" fill="none" stroke="#0f2a19" stroke-width="1"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx=".9" fill="#16b04f"/>`;
  return `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="QR code d’invito"><rect width="${size}" height="${size}" rx="2" fill="#fff"/><g fill="#0f2a19">${dots}</g>${eye(m, m)}${eye(n - 7 + m, m)}${eye(m, n - 7 + m)}</svg>`;
}
function qrSheet() {
  const link = sync.inviteLink();
  openSheet(() => {
    const hn = sync.houseName() || "la mia casa";
    sheetBody.innerHTML = `<div class="qr-wrap">
      <h2 id="sheet-title" style="font-size:24px">Invita in ${esc(hn)}</h2>
      <p class="note">Fai inquadrare il codice dalla fotocamera dell’altro telefono, o da “Scansiona” nella sua app.</p>
      <div class="qr-card">${qrSVG(link)}<span class="qr-badge">🥗</span></div>
      <p class="note">Codice: <span class="code">${esc(sync.household)}</span></p>
      <div class="prow" style="justify-content:center"><button class="btn pri" data-act="invite">↗ Condividi link</button><button class="btn ghost" data-act="copy-link">Copia</button></div>
      <button class="btn ghost block" data-act="house" style="margin-top:14px">← Torna alla casa</button></div>`;
  }, "qr");
}

// Benvenuto: scegli chi sei tra i membri della casa ("Sono io") oppure scrivi il tuo nome.
function profileSheet(welcome) {
  let typedOnce = false;
  openSheet(() => {
    const hn = sync.houseName(), me = sync.me;
    const others = sync.members().filter((m) => m.id !== me.id);
    const pick = welcome && others.length;
    // Mentre si scrive il nome non ridisegnare (canRerenderSheet lo blocca già); qui basta mostrare i membri appena arrivano.
    sheetBody.innerHTML = `<div class="welcome">
      <div class="wave">👋</div>
      <h2 id="sheet-title">${welcome && hn ? `Benvenuto in ${esc(hn)}!` : welcome ? "Benvenuto!" : "Il tuo profilo"}</h2>
      ${pick ? `<p class="note">Sei già in questa casa? Tocca il tuo nome.</p>
        <div class="mlist iam-list">${others.map((m) => `<button class="mrow iam" data-iam="${esc(m.id)}">${avatar(m, 42)}<div class="mtxt"><b>${esc(fullName(m))}</b><span>${sync.online.has(m.id) ? '<i class="live"></i>online ora' : esc(ago(m.seen))}</span></div><span class="iam-chip">Sono io</span></button>`).join("")}</div>
        <div class="or"><span>oppure</span></div>` : ""}
      ${pick && me.first
        ? `<button class="btn pri block" data-act="profile-ok">Sono nuovo: continua come ${esc(fullName(me))}</button>`
        : `<p class="note">${pick ? "Sei nuovo? Scrivi il tuo nome." : "Come ti chiami? Così chi cucina con te vede chi ha preso cosa."}</p>
      <div class="pform">
        <label><span>Nome</span><input id="pFirst" value="${esc(me.first)}" placeholder="Nome" autocomplete="given-name" autocapitalize="words" maxlength="30" enterkeyhint="next"></label>
        <label><span>Cognome</span><input id="pLast" value="${esc(me.last)}" placeholder="Cognome" autocomplete="family-name" autocapitalize="words" maxlength="30" enterkeyhint="done"></label>
      </div>
      <button class="opt-row solo" data-act="avatar-welcome">${avatar({ ...me }, 44)}<span class="ot"><b>Scegli il tuo avatar</b><span>${me.icon ? "Tocca per cambiarlo" : "Facoltativo"}</span></span><span class="chev">›</span></button>
      <button class="btn pri block" data-act="profile-ok" style="margin-top:14px">Continua</button>`}
      <button class="btn ghost block" data-close style="margin-top:8px">Più tardi</button></div>`;
  }, welcome ? "welcome" : "profile");
}

// Modifica avatar: anteprima grande, tutte le icone visibili, Salva / Annulla.
function avatarSheet(back) {
  let pending = sync.me.icon || "";
  openSheet(() => {
    const me = sync.me, prev = { ...me, icon: pending };
    sheetBody.innerHTML = `<div class="pick-sheet">
      <h2 id="sheet-title">Modifica avatar</h2>
      <div class="av-preview" id="avPrev">${avatar(prev, 104)}</div>
      <p class="note" style="text-align:center">${esc(me.first ? shortName(me) : "Il tuo avatar")}</p>
      <div class="icon-grid">
        <button class="ip${!pending ? " on" : ""}" data-av="" aria-label="Iniziali"><span>${esc(initials(me) === "?" ? "Aa" : initials(me))}</span></button>
        ${ICONS.map((ic) => `<button class="ip${pending === ic ? " on" : ""}" data-av="${ic}">${ic}</button>`).join("")}
      </div>
      <div class="pick-actions"><button class="btn ghost" data-act="pick-cancel">Annulla</button><button class="btn pri" data-act="pick-save">Salva</button></div></div>`;
  }, "avatar");
  pickState = { kind: "avatar", get: () => pending, set: (v) => { pending = v; }, back };
}
function soundSheet(back) {
  let pending = timers.sound;
  openSheet(() => {
    sheetBody.innerHTML = `<div class="pick-sheet">
      <h2 id="sheet-title">Suono del timer</h2>
      <p class="note">Tocca un suono per ascoltarlo, poi salva. Suona finché non premi “Ferma”.</p>
      <div class="snd-list">${Object.entries(SOUNDS).map(([k, v]) => `<button class="snd${pending === k ? " on" : ""}" data-snd="${k}">
        <span class="se">${v.emoji}</span><span class="ot"><b>${esc(v.name)}</b><span>${esc(v.desc)}</span></span><span class="radio"></span></button>`).join("")}</div>
      <div class="pick-actions"><button class="btn ghost" data-act="pick-cancel">Annulla</button><button class="btn pri" data-act="pick-save">Salva</button></div></div>`;
  }, "sound");
  pickState = { kind: "sound", get: () => pending, set: (v) => { pending = v; }, back };
}
let pickState = null;

function saveProfileFromInputs() {
  const f = $("#pFirst"), l = $("#pLast");
  if (!f) return;
  const first = f.value, last = l.value;
  if (first.trim() !== sync.me.first || last.trim() !== sync.me.last) sync.setProfile(first, last);
}
let pfT;
document.addEventListener("input", (e) => {
  if (e.target.matches("#pFirst,#pLast")) { clearTimeout(pfT); pfT = setTimeout(saveProfileFromInputs, 700); }
  if (e.target.matches("#houseName")) { clearTimeout(pfT); pfT = setTimeout(() => sync.setHouseName(e.target.value), 700); }
});
document.addEventListener("change", (e) => {
  if (e.target.matches("#pFirst,#pLast")) saveProfileFromInputs();
  if (e.target.matches("#houseName")) sync.setHouseName(e.target.value);
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  if (e.target.matches("#pFirst")) { e.preventDefault(); $("#pLast")?.focus(); }
  else if (e.target.matches("#pLast,#houseName")) { e.preventDefault(); e.target.blur(); }
  else if (e.target.matches("#joinCode")) { e.preventDefault(); doJoin(e.target.value); }
});

async function doJoin(code) {
  try {
    const changed = await sync.join(code);
    if (changed === false) return toast("Sei già in questa casa");
    buzz([20, 40, 20]); confetti(60);
    closeSheet();
    setTimeout(() => {
      toast(`Sei entrato in ${sync.houseName() || "una nuova casa"} 🏡`);
      if (!sync.me.first || sync.members().some((m) => m.id !== sync.me.id)) profileSheet(true);
    }, 500);
  } catch (err) { toast(err.message || "Codice non valido"); }
}

$("#syncBtn").addEventListener("click", houseSheet);
sync.onStatus((s) => { $("#syncBtn").dataset.s = s; if (sheetKind === "house" && canRerenderSheet()) sheetRender?.(); });
sync.onPresence(() => { renderHeader(); if (sheetKind === "house" && canRerenderSheet()) sheetRender?.(); });

/* ---------- Scanner QR (fotocamera dentro l'app) ---------- */
const scan = $("#scan");
let scanStream = null, scanRAF = 0;
function loadJsQR() {
  if (window.jsQR) return Promise.resolve();
  return new Promise((ok, ko) => { const s = document.createElement("script"); s.src = "js/vendor/jsQR.min.js"; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
}
async function openScanner() {
  scan.innerHTML = `<video playsinline muted autoplay></video><div class="scan-ui"><button class="x" data-act="scan-close" aria-label="Chiudi">✕</button>
    <div class="frame"><i></i><i></i><i></i><i></i><span class="laser"></span></div><p>Inquadra il QR code della casa</p></div>`;
  scan.classList.add("open"); scan.setAttribute("aria-hidden", "false");
  history.pushState({ overlay: "scan" }, "");
  try {
    await loadJsQR();
    scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 } }, audio: false });
    const video = scan.querySelector("video");
    video.srcObject = scanStream; await video.play();
    const c = document.createElement("canvas"), ctx = c.getContext("2d", { willReadFrequently: true });
    let last = 0;
    const tick = (t) => {
      scanRAF = requestAnimationFrame(tick);
      if (t - last < 120 || video.readyState < 2) return;
      last = t;
      const w = 480, h = Math.round((video.videoHeight / video.videoWidth) * w) || 480;
      c.width = w; c.height = h; ctx.drawImage(video, 0, 0, w, h);
      const res = window.jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
      if (res?.data && /casa=|^[a-z0-9]{5}(-[a-z0-9]{5}){3}$/i.test(res.data)) {
        buzz([15, 40, 15]);
        closeScanner();
        doJoin(res.data);
      }
    };
    scanRAF = requestAnimationFrame(tick);
  } catch (e) {
    console.warn(e);
    scan.querySelector("p").textContent = "Non riesco ad aprire la fotocamera. Consenti l’accesso nelle impostazioni, oppure incolla il codice.";
  }
}
function closeScanner(fromPop) {
  if (!scan.classList.contains("open")) return;
  cancelAnimationFrame(scanRAF);
  scanStream?.getTracks().forEach((t) => t.stop()); scanStream = null;
  scan.classList.remove("open"); scan.setAttribute("aria-hidden", "true");
  setTimeout(() => { if (!scan.classList.contains("open")) scan.innerHTML = ""; }, 400);
  if (!fromPop && history.state?.overlay === "scan") history.back();
}

/* ---------- Modalità cucina ---------- */
const cook = $("#cook");
let ck = null, wl = null;
function cookSteps(kind) {
  if (kind === "prep") return PREP.flatMap((r, ri) => r.s.map((text, i) => ({ r, ri, i, n: r.s.length, text, ing: r.si[i] || [], key: "p:" + r.id })));
  const m = PASTI.find((x) => "meal:" + x.id === kind);
  return m.s.map((text, i) => ({ r: { ...m, t: m.short, i: ingr(m) }, i, n: m.s.length, text, ing: m.si[i] || [], meal: m }));
}
function openCook(kind, from) {
  const steps = cookSteps(kind);
  let idx = 0;
  if (kind === "prep") {
    const startRec = from != null && from !== "" ? +from : PREP.findIndex((p) => !store.get("p:" + p.id));
    idx = Math.max(0, steps.findIndex((s) => s.ri === Math.max(0, startRec)));
  }
  ck = { kind, steps, idx, started: new Set() };
  if (sheet.classList.contains("open")) { sheet.classList.remove("open"); sheet.setAttribute("aria-hidden", "true"); sheetRender = null; sheetKind = null; history.replaceState({ overlay: "cook" }, ""); }
  else history.pushState({ overlay: "cook" }, "");
  renderCook();
  cook.classList.add("open"); cook.setAttribute("aria-hidden", "false"); document.body.classList.add("cooking");
  try { navigator.wakeLock?.request("screen").then((l) => (wl = l)).catch(() => {}); } catch {}
}
function closeCook(fromPop) {
  if (!cook.classList.contains("open")) return;
  if (!fromPop && history.state?.overlay === "cook") return history.back();
  cook.classList.remove("open"); cook.setAttribute("aria-hidden", "true"); cook.style.transform = ""; document.body.classList.remove("cooking");
  try { wl?.release(); } catch {} wl = null; ck = null;
}
// "Ti serve": solo gli ingredienti di questo passaggio, con le quantità in grande.
function needHTML(ing) {
  if (!ing.length) return `<div class="need none"><span>👌</span>Nessun ingrediente nuovo: segui il passaggio</div>`;
  return `<div class="need"><div class="need-h">Ti serve</div><div class="need-list">${ing.map(([q, n, note]) =>
    `<span class="q">${esc(q)}</span><span class="nm">${esc(n)}${note ? `<small>${esc(note)}</small>` : ""}</span>`).join("")}</div></div>`;
}
// Anteprima piccola del passaggio successivo (solo i suoi ingredienti).
function nextHTML(cur, nx) {
  if (!nx) return "";
  const other = nx.r.t !== cur.r.t;
  return `<div class="next"><span class="nx-h">Prossimo passo${other ? ` · ${nx.r.emoji} ${esc(nx.r.t)}` : ""}</span>
    <span class="nx-i">${nx.ing.length ? nx.ing.map(([q, n]) => `<span><b>${esc(q)}</b> ${esc(n)}</span>`).join("") : `<span class="nx-t">${esc(nx.text.length > 80 ? nx.text.slice(0, 78) + "…" : nx.text)}</span>`}</span></div>`;
}
function renderCook() {
  const { steps, kind } = ck;
  const last = kind === "prep"
    ? `<div class="ck-card ck-done"><div class="big">🎉</div><h2 style="font-size:30px;margin:8px 0">Tutto pronto!</h2><p class="note">Dieci pasti in frigo per ${PLAN.fridgeDays} giorni.</p><button class="btn pri" data-goto="2" data-close-cook>Vai ai pasti →</button></div>`
    : `<div class="ck-card ck-done"><div class="big">😋</div><h2 style="font-size:30px;margin:8px 0">Buon appetito!</h2><div class="prow" style="justify-content:center"><button class="btn pri" data-eat="${steps[0].meal.id}:pranzo">🌞 Mangiato a pranzo</button><button class="btn pri" data-eat="${steps[0].meal.id}:cena">🌙 Mangiato a cena</button></div></div>`;
  cook.innerHTML = `<div class="ck-top"><button class="x" data-close-cook aria-label="Chiudi">✕</button><div class="ck-bar">${steps.map(() => "<i></i>").join("")}<i></i></div></div>
    <div class="ck-stage"><div class="ck-strip">${steps.map((s, j) => `<div class="ck-card" aria-hidden="true">
      <div class="ck-rec"><span class="e">${s.r.emoji}</span><span>${esc(s.r.t)}</span></div>
      <div class="ck-n">Passaggio ${s.i + 1} di ${s.n}</div>
      <p class="ck-txt">${s.text.split(/(?<=[.!?])\s+/).map((f) => `<span>${esc(f)}</span>`).join("")}</p>
      ${needHTML(s.ing)}
      ${nextHTML(s, steps[j + 1])}
      </div>`).join("")}${last}</div></div>
    <div class="ck-timer" id="ckTimer" hidden></div>
    <div class="ck-nav"><button class="btn ghost back" data-ck="-1" aria-label="Passaggio precedente">←</button><button class="btn pri" data-ck="1" id="ckNext">Avanti →</button></div>`;
  ckGo(ck.idx, false);
}
// Timer grande in modalità cucina: quello del passaggio corrente (o il più vicino alla fine).
const RING_LEN = 100;
function paintCookTimer() {
  const box = ck && $("#ckTimer", cook); if (!box) return;
  const list = timers.list();
  if (!list.length) { if (!box.hidden) { box.hidden = true; box.innerHTML = ""; box.dataset.sig = ""; } return; }
  const s = ck.steps[ck.idx], lbl = s ? `${s.r.t} · passo ${s.i + 1}` : "";
  const prim = list.find((t) => t.done) || list.find((t) => t.n === lbl) || // quello che suona ha la precedenza
    [...list].sort((a, b) => a.end - b.end)[0];
  const others = list.filter((t) => t !== prim);
  const sig = prim.id + (prim.done ? "d" : "r") + "|" + others.map((t) => t.id + (t.done ? "d" : "r")).join();
  const now = Date.now();
  if (box.dataset.sig !== sig) {
    box.dataset.sig = sig; box.hidden = false;
    box.innerHTML = `<div class="bt${prim.done ? " done" : ""}">
      <div class="bt-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="trk" cx="60" cy="60" r="52"/><circle class="prg" cx="60" cy="60" r="52" pathLength="${RING_LEN}"/></svg>
        <div class="bt-c"><b class="bt-t">${prim.done ? "0:00" : fmt((prim.end - now) / 1000)}</b></div></div>
      <div class="bt-side"><span class="bt-l">${prim.done ? "⏰ Pronto!" : "⏱ " + esc(prim.n)}</span>
        ${prim.done ? `<button class="btn bt-stop" data-bt-stop="${prim.id}">✋ Ferma</button>`
          : `<div class="prow"><button class="btn ghost" data-bt-add="${prim.id}">+1 min</button><button class="btn ghost" data-bt-stop="${prim.id}">Stop</button></div>`}
      </div></div>
      ${others.length ? `<div class="bt-others">${others.map((t) => `<button class="bt-chip${t.done ? " done" : ""}" data-bt-stop="${t.done ? t.id : ""}" data-tid2="${t.id}">${esc(t.n.split(" · ")[0])} <b>${t.done ? "Pronto! ✋" : fmt((t.end - now) / 1000)}</b></button>`).join("")}</div>` : ""}`;
  }
  const left = Math.max(0, (prim.end - now) / 1000);
  const tEl = box.querySelector(".bt-t"); if (tEl && !prim.done) tEl.textContent = fmt(left);
  const prg = box.querySelector(".prg"); if (prg) prg.style.strokeDashoffset = prim.done ? -RING_LEN : -RING_LEN * (1 - left / prim.dur); // si svuota in senso orario, come una lancetta
  others.forEach((t) => { const b = box.querySelector(`[data-tid2="${t.id}"] b`); if (b && !t.done) b.textContent = fmt((t.end - now) / 1000); });
}
setInterval(paintCookTimer, 250);

// Se il passaggio ha un tempo, il pulsante principale prima imposta il timer, poi fa avanzare.
function setNextButton() {
  const next = $("#ckNext", cook); if (!next || !ck) return;
  const i = ck.idx, s = ck.steps[i], total = ck.steps.length + 1;
  const tm = s && stepTimer(s.text);
  if (tm && !ck.started.has(i) && !timers.has(`${s.r.t} · passo ${s.i + 1}`)) {
    next.dataset.mode = "timer"; next.classList.add("timer");
    next.innerHTML = `<span class="tico">⏱</span> Imposta timer ${tm.label}`;
  } else {
    next.dataset.mode = ""; next.classList.remove("timer");
    next.textContent = i === total - 2 ? "Fine ✓" : (s?.i === s?.n - 1 && ck.kind === "prep" ? "Fatto, avanti →" : "Avanti →");
  }
}
function ckGo(i, anim = true) {
  const total = ck.steps.length + 1;
  const prev = ck.idx;
  i = Math.max(0, Math.min(total - 1, i));
  if (anim && i > prev && ck.kind === "prep") {
    const s = ck.steps[prev];
    if (s && s.i === s.n - 1 && !store.get(s.key)) { store.set(s.key, sync.me.id); buzz(25); toast(`${s.r.emoji} ${s.r.t}: fatto!`); checkPrepDate(); }
  }
  ck.idx = i;
  const stripEl = $(".ck-strip", cook);
  stripEl.classList.toggle("anim", anim);
  stripEl.style.transform = `translateX(${-i * 100}%)`;
  stripEl.querySelectorAll(".ck-card").forEach((c, j) => c.setAttribute("aria-hidden", j !== i));
  cook.querySelectorAll(".ck-bar i").forEach((b, j) => b.classList.toggle("on", j <= i));
  const next = $("#ckNext", cook), nav = $(".ck-nav", cook);
  nav.style.display = i === total - 1 ? "none" : "";
  setNextButton(); paintCookTimer();
  if (anim && i !== prev) {
    buzz(6); motionBlur(stripEl, 4);
    const card = stripEl.children[i];
    if (card) [...card.children].forEach((c, k) => c.animate([{ opacity: 0, transform: "translateX(24px)" }, { opacity: 1, transform: "none" }], { duration: 420, delay: 60 + k * 50, easing: "cubic-bezier(.2,.9,.25,1)", fill: "backwards" }));
    if (i === total - 1 && ck.kind === "prep") setTimeout(confetti, 200);
  }
}
(function cookGestures() {
  let s = null;
  cook.addEventListener("pointerdown", (e) => {
    if (e.button > 0 || !ck) return;
    const top = e.target.closest(".ck-top"), stage = e.target.closest(".ck-stage");
    if (!top && !stage) return;
    s = { x0: e.clientX, y0: e.clientY, t0: performance.now(), mode: null, top: !!top, id: e.pointerId, W: cook.clientWidth, lx: e.clientX, lt: performance.now(), v: 0 };
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
    const now = performance.now();
    s.v = 0.7 * s.v + 0.3 * ((e.clientX - s.lx) / Math.max(1, now - s.lt)); s.lx = e.clientX; s.lt = now;
    s.dx = dx; s.dy = dy;
    if (s.mode === "x") {
      const total = ck.steps.length + 1;
      const off = (ck.idx === 0 && dx > 0) || (ck.idx === total - 1 && dx < 0) ? dx / 3.5 : dx;
      const st = $(".ck-strip", cook); st.classList.remove("anim");
      st.style.transform = `translateX(calc(${-ck.idx * 100}% + ${off}px))`;
      dragBlur(st, s.v);
    } else { cook.classList.add("drag"); cook.style.transform = `translateY(${Math.max(0, dy)}px)`; }
  });
  const end = (cancel) => {
    if (!s) return;
    if (s.mode) { swallowClick = true; setTimeout(() => (swallowClick = false), 50); }
    if (s.mode === "x") {
      clearBlur($(".ck-strip", cook));
      let n = ck.idx;
      if (!cancel) { if (s.dx < -s.W * 0.18 || s.v < -0.45) n++; else if (s.dx > s.W * 0.18 || s.v > 0.45) n--; }
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
  if (o !== "scan") closeScanner(true);
  if (o !== "shop") closeShop(true);
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
  const url = sync.inviteLink(), hn = sync.houseName();
  try { if (navigator.share) return await navigator.share({ title: "Meal prep", text: `Entra in ${hn || "casa mia"} su Meal prep: condividiamo spesa e pasti 🥗`, url }); } catch (e) { if (e.name === "AbortError") return; }
  copyLink();
}
async function copyLink() {
  try { await navigator.clipboard.writeText(sync.inviteLink()); toast("Link d’invito copiato"); } catch { toast("Impossibile copiare"); }
}

document.addEventListener("click", async (e) => {
  const t = e.target;
  const tm = t.closest("[data-tm]");
  if (tm) { e.stopPropagation(); timers.start(tm.dataset.n, +tm.dataset.tm); bump(tm); toast(`⏱ Timer avviato: ${tm.dataset.n}`); return; }
  const tog = t.closest("[data-tog]");
  if (tog) {
    e.stopPropagation();
    const k = tog.dataset.tog, v = !store.get(k);
    if (v) { burst(tog.querySelector(".yum,i") || tog, k.startsWith("p:") ? 16 : 10); justTog = k; }
    store.set(k, v ? sync.me.id : null); buzz(v ? 12 : 6);
    if (k.startsWith("p:")) checkPrepDate();
    checkMilestones(k, v);
    return;
  }
  const row = t.closest(".row .fg");
  if (row) return toggleRow(row.parentElement, false);
  const cookBtn = t.closest("[data-cook]");
  if (cookBtn) return openCook(cookBtn.dataset.cook, cookBtn.dataset.from);
  const ckb = t.closest("[data-ck]");
  if (ckb && ck) {
    if (ckb.dataset.mode === "timer") {
      const s = ck.steps[ck.idx], tm = stepTimer(s.text);
      timers.start(`${s.r.t} · passo ${s.i + 1}`, tm.sec);
      ck.started.add(ck.idx);
      setNextButton(); bump(ckb); paintCookTimer();
      toast(`⏱ Timer di ${tm.label} avviato`);
      return;
    }
    return ckGo(ck.idx + +ckb.dataset.ck);
  }
  const eat = t.closest("[data-eat]");
  if (eat) { store.set(`m:${eat.dataset.eat}`, sync.me.id); buzz(20); closeCook(); checkMilestones("m:", true); return; }
  const gt = t.closest("[data-goto]");
  if (gt) { if (t.closest("[data-close-cook]")) closeCook(); goTo(+gt.dataset.goto); return; }
  if (t.closest("[data-close-cook]")) return closeCook();
  const tab = t.closest(".tabs [data-page]");
  if (tab) return goTo(+tab.dataset.page);
  const meal = t.closest("[data-meal]");
  if (meal) return mealSheet(meal.dataset.meal);
  const bts = t.closest("[data-bt-stop]");
  if (bts && bts.dataset.btStop) { timers.stop(bts.dataset.btStop); buzz(10); paintCookTimer(); setNextButton(); return; }
  const bta = t.closest("[data-bt-add]");
  if (bta) { timers.add(bta.dataset.btAdd, 60); bump($(".bt-t", cook)); paintCookTimer(); return; }
  const av = t.closest("[data-av]");
  if (av && pickState?.kind === "avatar") {
    pickState.set(av.dataset.av);
    document.querySelectorAll("[data-av]").forEach((b) => b.classList.toggle("on", b === av));
    $("#avPrev").innerHTML = avatar({ ...sync.me, icon: av.dataset.av }, 104);
    bump($("#avPrev .av")); buzz(6);
    return;
  }
  const sn = t.closest("[data-snd]");
  if (sn && pickState?.kind === "sound") {
    pickState.set(sn.dataset.snd);
    document.querySelectorAll("[data-snd]").forEach((b) => b.classList.toggle("on", b === sn));
    timers.preview(sn.dataset.snd);
    return;
  }
  const iam = t.closest("[data-iam]");
  if (iam) {
    const m = sync.member(iam.dataset.iam);
    await sync.adopt(iam.dataset.iam);
    buzz([15, 40, 15]); burst(iam.querySelector(".av"), 14);
    setTimeout(() => { closeSheet(); toast(`Bentornato ${m?.first || ""}! 👋`); }, 350);
    return;
  }
  const rm = t.closest("[data-rm]");
  if (rm) {
    const m = sync.member(rm.dataset.rm), prev = store.get("member:" + rm.dataset.rm);
    sync.removeMember(rm.dataset.rm);
    toast(`${fullName(m)} rimosso dalla lista`, () => store.set("member:" + rm.dataset.rm, prev));
    return;
  }
  const hv = t.closest("[data-have]");
  if (hv) { const k = hv.dataset.have, v = !store.get(k); if (v) { burst(hv.querySelector(".te"), 10); justTog = k; } store.set(k, v ? sync.me.id : null); buzz(v ? 12 : 6); checkMilestones(k, v); return; }
  const by = t.closest("[data-buy]");
  if (by) {
    const k = by.dataset.buy, v = !store.get(k);
    by.classList.toggle("on", v); if (v) burst(by.querySelector(".box"), 10);
    store.set(k, v ? sync.me.id : null); buzz(v ? 12 : 6);
    if (v && shopList.every((x) => store.get(x))) { setTimeout(confetti, 200); toast("🛒 Hai preso tutto! Tocca “Fine spesa”"); }
    return;
  }
  const act = t.closest("[data-act]")?.dataset.act;
  if (!act) return;
  if (act === "shop-open") { openShop(); return; }
  if (act === "shop-close") { closeShop(); return; }
  if (act === "shop-done") { closeShop(false, true); return; }
  if (act === "pantry-all") { const prev = store.setMany(Object.fromEntries(spesaKeys().filter((k) => !store.get(k)).map((k) => [k, sync.me.id]))); toast("Dispensa completa", () => store.setMany(prev)); return; }
  if (act === "edit-avatar") { saveProfileFromInputs(); return avatarSheet(houseSheet); }
  if (act === "edit-sound") { saveProfileFromInputs(); return soundSheet(houseSheet); }
  if (act === "avatar-welcome") { saveProfileFromInputs(); return avatarSheet(() => profileSheet(true)); }
  if (act === "pick-save" && pickState) {
    if (pickState.kind === "avatar") { sync.setIcon(pickState.get()); toast("Avatar salvato"); }
    else { timers.setSound(pickState.get()); toast(`Suono: ${SOUNDS[pickState.get()].name}`); }
    buzz(12); const back = pickState.back; pickState = null; renderHeader(); return back ? back() : closeSheet();
  }
  if (act === "pick-cancel" && pickState) { const back = pickState.back; pickState = null; return back ? back() : closeSheet(); }
  if (act === "share") shareList();
  if (act === "reset-s") resetKeys(spesaKeys(), "Dispensa svuotata");
  if (act === "reset-p") resetKeys([...PREP.map((p) => "p:" + p.id), "prepDate"], "Preparazione azzerata");
  if (act === "reset-m") resetKeys(mealKeys(), "Pasti azzerati");
  if (act === "reset-all") { closeSheet(); resetKeys([...spesaKeys(), ...PREP.map((p) => "p:" + p.id), "prepDate", "shopping", ...mealKeys()], "Si ricomincia: nuova settimana"); goTo(0); }
  if (act === "invite") invite();
  if (act === "copy-link") copyLink();
  if (act === "qr") qrSheet();
  if (act === "house") houseSheet();
  if (act === "scan") openScanner();
  if (act === "scan-close") closeScanner();
  if (act === "sync-now") { sync.now(); bump(t.closest("button")); }
  if (act === "install" && installEvt) { installEvt.prompt(); installEvt = null; }
  if (act === "join") doJoin($("#joinCode").value);
  if (act === "profile-ok") {
    saveProfileFromInputs();
    if (!sync.me.first) { toast("Scrivi almeno il nome"); $("#pFirst")?.focus(); return; }
    buzz(15); closeSheet(); toast(`Ciao ${sync.me.first}! 👋`);
  }
  if (act === "new-house") {
    const prevCode = sync.household;
    await sync.newHouse(); closeSheet();
    toast("Nuova casa creata", () => doJoin(prevCode));
  }
});

document.addEventListener("toggle", (e) => {
  const o = e.target.dataset?.open; if (!o) return;
  if (o === "cart") openState.cart = e.target.open;
  else if (o.startsWith("prep:")) { const id = o.slice(5); e.target.open ? openState.prep.add(id) : openState.prep.delete(id); }
}, true);

document.addEventListener("keydown", (e) => {
  if (e.target.closest("input,textarea")) return;
  if (e.key === "Escape") { if (shopOpen) closeShop(); else if (scan.classList.contains("open")) closeScanner(); else if (ck) closeCook(); else closeSheet(); return; }
  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
    const d = e.key === "ArrowRight" ? 1 : -1;
    if (ck) return ckGo(ck.idx + d);
    if (!sheet.classList.contains("open")) { goTo(page + d); document.getElementById("tab-" + page)?.focus(); }
  }
  if ((e.key === " " || e.key === "Enter") && (e.target.matches(".row .fg") || e.target.matches("[data-meal]"))) { e.preventDefault(); e.target.click(); }
});

/* ---------- Avvio ---------- */
store.subscribe(() => renderAll());
renderAll();
goTo(page, false);
stagger($("#p-" + page));
timers.init();
sync.start();
if (shoppingNow()?.by === sync.me.id) setTimeout(openShop, 700); // riapre la spesa lasciata a metà
setInterval(renderHeader, 60_000);
if (sync.joinedFromLink) setTimeout(() => { toast(`Sei entrato in ${sync.houseName() || "una nuova casa"} 🏡`); if (!sheet.classList.contains("open") && !ck) profileSheet(true); }, 1200);
else if (!sync.me.first) setTimeout(() => { if (!sheet.classList.contains("open") && !ck) profileSheet(true); }, 900);
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").then((r) => r.update()).catch(() => {});
  let reloaded = !navigator.serviceWorker.controller; // al primo avvio non serve ricaricare
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (!reloaded) { reloaded = true; location.reload(); } });
}
