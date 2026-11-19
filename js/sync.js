// Sincronizzazione con Supabase.
// - Persistenza: due funzioni RPC (mp_get / mp_put), la tabella non è accessibile direttamente.
// - Tempo reale: canale "broadcast" di Supabase Realtime, un canale per casa.
// Tutto è facoltativo: senza config l'app funziona solo in locale.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { store, prefs } from "./store.js";

const configured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
const listeners = new Set();
let status = configured ? "syncing" : "local";
let channel = null, client = null, pushTimer = null, busy = false;

function setStatus(s) { status = s; listeners.forEach((f) => f(s)); }

function newCode() {
  const a = "abcdefghjkmnpqrstuvwxyz23456789";
  const b = crypto.getRandomValues(new Uint8Array(20));
  return [...b].map((x) => a[x % a.length]).join("").replace(/(.{5})(?!$)/g, "$1-");
}

// Codice della casa: arriva dal link d'invito (?casa=...) o viene generato.
function initHousehold() {
  const url = new URL(location.href);
  const fromLink = url.searchParams.get("casa");
  if (fromLink) {
    if (fromLink !== prefs.get("household")) { prefs.set("household", fromLink); store.markAllDirty(); }
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

function schedule(ms = 500) { clearTimeout(pushTimer); pushTimer = setTimeout(cycle, ms); }

async function connectRealtime() {
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.45.4");
    client = client || createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    if (channel) await client.removeChannel(channel);
    channel = client.channel(`mp-${household}`, { config: { broadcast: { self: false } } });
    channel.on("broadcast", { event: "patch" }, ({ payload }) => store.merge(payload));
    channel.subscribe((s) => { if (s === "SUBSCRIBED") cycle(); });
  } catch (e) { console.warn("[realtime] non disponibile, uso il polling", e); }
}

export const sync = {
  configured,
  get status() { return status; },
  get household() { return household; },
  onStatus(f) { listeners.add(f); f(status); },
  inviteLink() {
    const u = new URL(location.href); u.search = ""; u.hash = "";
    u.searchParams.set("casa", household);
    return u.toString();
  },
  async join(code) {
    code = code.trim().replace(/.*[?&]casa=/, "").replace(/[^a-z0-9-]/gi, "").toLowerCase();
    if (code.length < 16) throw new Error("Codice non valido");
    household = code; prefs.set("household", code);
    store.markAllDirty();
    if (configured) { await connectRealtime(); await cycle(); }
  },
  now: () => cycle(),
  start() {
    if (!configured) return;
    store.subscribe((src) => { if (src === "local") schedule(); });
    addEventListener("online", () => cycle());
    addEventListener("offline", () => setStatus("offline"));
    document.addEventListener("visibilitychange", () => { if (!document.hidden) cycle(); });
    setInterval(() => { if (!document.hidden) cycle(); }, 60_000);
    cycle();
    connectRealtime();
  },
};
