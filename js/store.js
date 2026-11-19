// Stato condiviso: mappa chiave -> { v: valore, t: timestamp ms }.
// Fusione "last write wins" per chiave, così due dispositivi possono lavorare
// offline e ritrovarsi d'accordo quando tornano online.

const KEY = "mp.state.v2";
const DIRTY = "mp.dirty.v2";
const LEGACY = "mp"; // stato della prima versione (solo booleani)

const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

let state = read(KEY, null);
if (!state) {
  state = {};
  const old = read(LEGACY, {});
  const now = Date.now();
  // Migra lo stato della vecchia app (chiavi "s:Gruppo:i", "p:n", "m:n:j").
  const groupIds = { "Frutta e verdura": "fv", Proteine: "pr", Cereali: "ce", Dispensa: "di", Spezie: "sp" };
  const prepIds = ["lenticchie", "pasta", "tofu", "couscous", "zucchine", "salsa", "crude"];
  const mealIds = ["insalata", "panino", "bowl", "ragu", "zuppa"];
  for (const [k, v] of Object.entries(old)) {
    if (!v) continue;
    const p = k.split(":");
    if (p[0] === "s" && groupIds[p[1]]) state[`s:${groupIds[p[1]]}:${p[2]}`] = { v: true, t: now };
    if (p[0] === "p" && prepIds[p[1]]) state[`p:${prepIds[p[1]]}`] = { v: true, t: now };
    if (p[0] === "m" && mealIds[p[1]]) state[`m:${mealIds[p[1]]}:${p[2]}`] = { v: true, t: now };
  }
  write(KEY, state);
}
let dirty = new Set(read(DIRTY, []));
const subs = new Set();
let clockSkew = 0;

const emit = (src) => subs.forEach((f) => f(src));

export const store = {
  get: (k) => state[k]?.v,
  all: () => state,
  subscribe: (f) => (subs.add(f), () => subs.delete(f)),
  setSkew(ms) { clockSkew = Math.round(ms) || 0; },

  /** Imposta più chiavi insieme; restituisce i valori precedenti (per "Annulla"). */
  setMany(obj, { silent = false } = {}) {
    const t = Math.round(Date.now() + clockSkew);
    const prev = {};
    for (const [k, v] of Object.entries(obj)) {
      prev[k] = state[k]?.v ?? null;
      state[k] = { v, t };
      dirty.add(k);
    }
    write(KEY, state);
    write(DIRTY, [...dirty]);
    if (!silent) emit("local");
    return prev;
  },
  set(k, v, opt) { return this.setMany({ [k]: v }, opt); },
  notify: () => emit("local"),

  /** Fonde elementi remoti { k: {v,t} }. Restituisce true se è cambiato qualcosa. */
  merge(items) {
    let changed = false;
    for (const [k, it] of Object.entries(items || {})) {
      if (!it || typeof it.t !== "number") continue;
      const cur = state[k];
      if (!cur || it.t > cur.t) { state[k] = { v: it.v, t: it.t }; dirty.delete(k); changed = true; }
    }
    if (changed) { write(KEY, state); write(DIRTY, [...dirty]); emit("remote"); }
    return changed;
  },

  takeDirty() {
    const out = {};
    for (const k of dirty) if (state[k]) out[k] = state[k];
    return out;
  },
  clearDirty(items) {
    for (const [k, it] of Object.entries(items)) if (state[k]?.t === it.t) dirty.delete(k);
    write(DIRTY, [...dirty]);
  },
  /** Dopo aver cambiato "casa" tutto lo stato locale va caricato sul nuovo spazio. */
  markAllDirty() { dirty = new Set(Object.keys(state)); write(DIRTY, [...dirty]); },
  hasDirty: () => dirty.size > 0,
};

// Preferenze solo di questo dispositivo (non sincronizzate).
export const prefs = {
  get: (k, d) => read("mp.pref." + k, d),
  set: (k, v) => write("mp.pref." + k, v),
};
