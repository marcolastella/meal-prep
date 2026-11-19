// Sincronizzazione con Supabase + casa condivisa.
// - Persistenza: due funzioni RPC (mp_get / mp_put), la tabella non è accessibile direttamente.
// - Tempo reale: canale Supabase Realtime per casa (broadcast per le modifiche, presence per chi è online).
// - Casa: nome ("house:name") e membri ("member:<id>") sono chiavi sincronizzate come le altre.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { store, prefs } from "./store.js";

const configured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
const listeners = new Set(), presenceL = new Set();
let status = configured ? "syncing" : "local";
let channel = null, client = null, pushTimer = null, busy = false;
let online = new Set();

function setStatus(s) { status = s; listeners.forEach((f) => f(s)); }
const rand = (n) => { const a = "abcdefghjkmnpqrstuvwxyz23456789"; return [...crypto.getRandomValues(new Uint8Array(n))].map((x) => a[x % a.length]).join(""); };
const newCode = () => rand(20).replace(/(.{5})(?!$)/g, "$1-");

// Il mio profilo (solo su questo dispositivo, poi pubblicato come membro della casa).
const me = prefs.get("me", null) || { id: rand(10), first: "", last: "" };
prefs.set("me", me);

export function normalizeCode(s) {
  return String(s || "").trim().replace(/.*[?&]casa=/, "").replace(/[&#].*$/, "").replace(/[^a-z0-9-]/gi, "").toLowerCase();
}

// Codice della casa: arriva dal link d'invito (?casa=...) o viene generato.
let joinedFromLink = false;
function initHousehold() {
  const url = new URL(location.href);
  const fromLink = normalizeCode(url.searchParams.get("casa"));
  if (fromLink && fromLink.length >= 16) {
    if (fromLink !== prefs.get("household")) { prefs.set("household", fromLink); store.clearAll(); joinedFromLink = true; }
    url.searchParams.delete("casa");
    history.replaceState(history.state, "", url.pathname + url.search + url.hash);
  }
  if (!prefs.get("household")) prefs.set("household", newCode());
  return prefs.get("household");
}
let household = initHousehold();

async function rpc(fn, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${fn}: ${r.status} ${await r.text()}`);
  const txt = await r.text();
  return txt ? JSON.parse(txt) : null;
}

async function pull() {
  const t0 = Date.now();
  const res = await rpc("mp_get", { p_household: household });
  if (res?.now) store.setSkew(res.now - (t0 + Date.now()) / 2);
  store.merge(res?.items || {});
}

async function push() {
  const items = store.takeDirty();
  if (!Object.keys(items).length) return;
  await rpc("mp_put", { p_household: household, p_items: items });
  store.clearDirty(items);
  channel?.send({ type: "broadcast", event: "patch", payload: items });
}

async function cycle() {
  if (!configured || busy) return;
  if (!navigator.onLine) return setStatus("offline");
  busy = true; setStatus("syncing");
  try { await push(); await pull(); await push(); setStatus("synced"); }
  catch (e) { console.warn("[sync]", e); setStatus(navigator.onLine ? "error" : "offline"); }
  finally { busy = false; if (store.hasDirty() && status === "synced") schedule(); }
}

function schedule(ms = 400) { clearTimeout(pushTimer); pushTimer = setTimeout(cycle, ms); }

function emitPresence() { presenceL.forEach((f) => f(online)); }

async function connectRealtime() {
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.45.4");
    client = client || createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    if (channel) { await client.removeChannel(channel); online = new Set(); emitPresence(); }
    channel = client.channel(`mp-${household}`, { config: { broadcast: { self: false }, presence: { key: me.id } } });
    channel.on("broadcast", { event: "patch" }, ({ payload }) => store.merge(payload));
    channel.on("presence", { event: "sync" }, () => { online = new Set(Object.keys(channel.presenceState())); emitPresence(); });
    channel.subscribe((s) => { if (s === "SUBSCRIBED") { channel.track({ id: me.id, at: Date.now() }); cycle(); } });
  } catch (e) { console.warn("[realtime] non disponibile, uso il polling", e); }
}

function publishMe(force) {
  if (!me.first) return;
  const cur = store.get("member:" + me.id);
  const stale = !cur || cur.first !== me.first || cur.last !== me.last || Date.now() - (cur.seen || 0) > 6 * 36e5;
  if (force || stale) store.set("member:" + me.id, { first: me.first, last: me.last, seen: Date.now(), since: cur?.since || Date.now() });
}

export const sync = {
  configured,
  joinedFromLink,
  get status() { return status; },
  get household() { return household; },
  get me() { return me; },
  get online() { return online; },
  onStatus(f) { listeners.add(f); f(status); },
  onPresence(f) { presenceL.add(f); },
  inviteLink() {
    const u = new URL(location.href); u.search = ""; u.hash = "";
    u.searchParams.set("casa", household);
    return u.toString();
  },
  houseName() { return store.get("house:name") || ""; },
  setHouseName(n) { store.set("house:name", n.trim().slice(0, 40) || null); },
  setProfile(first, last) {
    me.first = first.trim().slice(0, 30); me.last = last.trim().slice(0, 30);
    prefs.set("me", me); publishMe(true);
  },
  members() {
    const list = store.entries("member:").map(([id, v]) => ({ id, ...v }));
    if (me.first && !list.some((m) => m.id === me.id)) list.push({ id: me.id, first: me.first, last: me.last, seen: Date.now() });
    return list.sort((a, b) => (a.id === me.id ? -1 : b.id === me.id ? 1 : (a.since || 0) - (b.since || 0)));
  },
  member(id) { return id === me.id ? { id, ...me } : store.get("member:" + id) ? { id, ...store.get("member:" + id) } : null; },
  removeMember(id) { store.set("member:" + id, null); },
  /** "Sono io": riprendo l'identità di un membro già presente nella casa. */
  async adopt(id) {
    const m = store.get("member:" + id);
    if (!m || id === me.id) return;
    const old = me.id;
    me.id = id; me.first = m.first || ""; me.last = m.last || "";
    prefs.set("me", me);
    if (store.get("member:" + old)) store.set("member:" + old, null);
    publishMe(true);
    if (configured) await connectRealtime();
  },
  async join(code) {
    code = normalizeCode(code);
    if (code.length < 16) throw new Error("Codice non valido");
    if (code === household) return false;
    household = code; prefs.set("household", code);
    store.clearAll(); publishMe(true);
    if (configured) { await connectRealtime(); await cycle(); }
    return true;
  },
  async newHouse() {
    household = newCode(); prefs.set("household", household);
    store.markAllDirty(); store.set("house:name", null);
    for (const [id] of store.entries("member:")) if (id !== me.id) store.set("member:" + id, null);
    publishMe(true);
    if (configured) { await connectRealtime(); await cycle(); }
  },
  now: () => cycle(),
  start() {
    publishMe(false);
    if (!configured) return;
    store.subscribe((src) => { if (src === "local") schedule(); });
    addEventListener("online", () => cycle());
    addEventListener("offline", () => setStatus("offline"));
    document.addEventListener("visibilitychange", () => { if (!document.hidden) { cycle(); publishMe(false); } });
    setInterval(() => { if (!document.hidden) cycle(); }, 60_000);
    cycle();
    connectRealtime();
  },
};
