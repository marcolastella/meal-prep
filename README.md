# 🍳 Meal prep · 10 pasti in un'ora

App web installabile (PWA) per gestire spesa, preparazione e pasti della settimana.
Ricette: Pick Up Limes, 5 piatti per 2 persone.

**Online:** https://marcolastella.github.io/meal-prep/

## Cosa sa fare

- **Swipe tra le sezioni** Spesa → Prep → Pasti (niente più barra in basso)
- **Swipe a destra su un articolo** per metterlo nel carrello. Gli articoli presi finiscono in fondo, in “Nel carrello”.
- **Modalità cucina** a schermo intero: un passaggio alla volta, si scorre di lato, lo schermo resta acceso, le ricette si spuntano da sole.
- **Timer integrati** su ogni “X minuti”: suonano, vibrano, sopravvivono al ricaricamento. Puoi aggiungere +1 minuto o scorrerli di lato per eliminarli.
- **Schede dal basso** per le ricette, da chiudere trascinandole giù (o con il tasto indietro su Android).
- **Freschezza**: quando finisci la preparazione l'app conta i giorni rimasti.
- **Annulla** dopo ogni azzeramento, **condividi la lista** su WhatsApp/Messaggi, tema chiaro/scuro.
- **Offline**: funziona anche senza rete. Su iPhone: Condividi → “Aggiungi alla schermata Home”.
- **Sincronizzazione in tempo reale** tra più telefoni (facoltativa, con Supabase).

## Attivare il database (Supabase, gratis, ~5 minuti)

Senza questo passaggio l'app salva tutto sul dispositivo. Con Supabase i dati restano
salvati online e tu e chi cucina con te vedete la stessa lista in tempo reale.

1. Crea un account su [supabase.com](https://supabase.com) → **New project** (regione: Frankfurt o Zurich).
2. Apri **SQL Editor → New query**, incolla tutto il contenuto di [`supabase/schema.sql`](supabase/schema.sql) e premi **Run**.
3. Vai su **Project Settings → API** e copia **Project URL** e la chiave **anon public**.
4. Incollale in [`js/config.js`](js/config.js) e fai commit. Dopo un minuto GitHub Pages pubblica la nuova versione.
5. Nell'app tocca il pallino in alto a destra → **Invita in casa** e manda il link all'altra persona.

La chiave *anon* è fatta per stare nel browser. La tabella non è accessibile direttamente:
si legge e si scrive solo con il codice segreto della propria “casa”, tramite due funzioni.

## Struttura

```
index.html            pagina unica
css/app.css           stile
js/data.js            ricette e lista della spesa (modifica qui i contenuti)
js/app.js             interfaccia, gesti, modalità cucina
js/store.js           stato locale con fusione "ultima modifica vince"
js/sync.js            sincronizzazione Supabase (RPC + Realtime broadcast)
js/timers.js          timer di cucina
sw.js                 funzionamento offline
supabase/schema.sql   schema del database
```

Nessuna build: sono file statici. Per provarla in locale: `python3 -m http.server` e apri http://localhost:8000.
Dopo aver modificato i file, aumenta la versione `V` in `sw.js` così i telefoni scaricano l'aggiornamento.
