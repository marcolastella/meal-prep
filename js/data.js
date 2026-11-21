// Contenuti del piano "10 pasti in un'ora" (Pick Up Limes), 5 ricette per 2 persone.
// Le conversioni in g e ml (≈) sono approssimative.

export const PLAN = {
  title: "Meal prep",
  subtitle: "10 pasti proteici in un’ora",
  source: "Pick Up Limes",
  fridgeDays: 4,
};

export const SPESA = [
  { id: "fv", name: "Frutta e verdura", emoji: "🥬", items: [
    "5 pomodori (700 g)", "3 carote (500 g)", "3 cipolle (400 g)", "2 zucchine (640 g)",
    "1 avocado", "1 limone", "6 tazze di spinaci baby (180 g)",
    "¼ di tazza di prezzemolo fresco (≈ 15 g, facoltativo)", "1 cucchiaio di zenzero fresco (≈ 6 g, o aglio)",
  ]},
  { id: "pr", name: "Proteine", emoji: "🫘", items: [
    "325 g di tofu compatto", "430 g di hummus naturale (1¾ tazze)", "510 g di lenticchie rosse (2½ tazze)",
  ]},
  { id: "ce", name: "Cereali", emoji: "🌾", items: [
    "130 g di couscous (¾ di tazza)", "400 g di pasta (rigatoni)", "6 fette di pane",
  ]},
  { id: "di", name: "Conserve e condimenti", emoji: "🫙", items: [
    "6 peperoni arrostiti", "180 g di pesto verde (¾ di tazza)", "3 dadi vegetali",
    "3 cucchiai di salsa di soia (≈ 45 ml)", "2½ cucchiai di aceto bianco (≈ 37 ml)",
    "1 cucchiaio di amido di mais (≈ 8 g)", "Olio di semi, q.b.",
  ]},
  { id: "sp", name: "Spezie", emoji: "🧂", items: [
    "1 cucchiaio di curry in polvere (≈ 6 g)", "1 cucchiaino di erbe italiane (≈ 1,5 g)",
    "½ cucchiaino di aglio in polvere (≈ 1,5 g)", "Sale e pepe nero, q.b.", "Peperoncino in fiocchi (facoltativo)",
  ]},
];

export const PREP = [
  { id: "lenticchie", t: "Stufato di lenticchie", emoji: "🍲", min: 25, hint: "Parti da qui: è la cottura più lunga.",
    i: ["1½ cucchiai di olio (≈ 22 ml)", "3 cipolle tritate fini", "1 cucchiaio di zenzero grattugiato (≈ 6 g)", "4 pomodori a pezzi", "2 dadi vegetali", "510 g di lenticchie rosse, sciacquate", "600 ml di acqua"],
    s: ["Scalda l’olio in una padella grande a fuoco medio-alto e rosola le cipolle fino a doratura leggera.", "Aggiungi lo zenzero e cuoci 2 minuti.", "Unisci gli altri ingredienti.", "Cuoci coperto a fuoco lento 15–18 minuti, finché le lenticchie sono cotte. Mescola ogni tanto."] },
  { id: "pasta", t: "Pasta", emoji: "🍝", min: 15, hint: "Metti su l’acqua mentre le cipolle rosolano.",
    i: ["400 g di pasta", "1 cucchiaino di olio (≈ 5 ml, facoltativo)"],
    s: ["Cuoci la pasta come da confezione (i rigatoni di solito 11–13 minuti).", "Scolala al dente, sciacquala e, se vuoi, condiscila con l’olio per non farla attaccare."] },
  { id: "tofu", t: "Tofu croccante", emoji: "🧈", min: 12,
    i: ["325 g di tofu compatto, a fette da ½ cm", "2 cucchiai di amido di mais (≈ 16 g)", "¼ di cucchiaino di sale (≈ 1,5 g)", "1 cucchiaio di olio (≈ 15 ml)"],
    s: ["In una ciotola massaggia delicatamente il tofu con amido e sale.", "Scalda l’olio in una padella antiaderente a fuoco medio-alto.", "Cuoci il tofu fino a doratura su entrambi i lati, circa 10 minuti."] },
  { id: "couscous", t: "Couscous", emoji: "🌾", min: 10,
    i: ["130 g di couscous", "½ dado vegetale sbriciolato", "180 ml di acqua bollente"],
    s: ["Metti couscous e dado in una ciotola e versa l’acqua bollente.", "Copri e lascia riposare 8–10 minuti.", "Sgrana con una forchetta."] },
  { id: "zucchine", t: "Zucchine al curry", emoji: "🥒", min: 8,
    i: ["1 cucchiaio di olio (≈ 15 ml)", "2 zucchine a pezzi da 1 cm", "1 cucchiaino di curry (≈ 2 g)", "½ cucchiaino di sale (≈ 3 g)"],
    s: ["Scalda olio e zucchine a fuoco medio-alto per 4–5 minuti, fino a doratura leggera.", "Aggiungi curry e sale e cuoci altri 2–3 minuti, mescolando spesso."] },
  { id: "salsa", t: "Salsa all’hummus", emoji: "🫑", min: 3,
    i: ["3 peperoni arrostiti", "1½ tazze di hummus (≈ 370 g)", "3 cucchiai di salsa di soia (≈ 45 ml)", "2½ cucchiai di aceto (≈ 37 ml)"],
    s: ["Frulla tutti gli ingredienti in un frullatore o robot da cucina fino a ottenere una crema liscia."] },
  { id: "crude", t: "Verdure crude", emoji: "🥕", min: 5,
    i: ["3 carote", "6 tazze di spinaci baby", "1 pomodoro a pezzi"],
    s: ["Grattugia le carote e conservale coperte d’acqua in un contenitore. Cambia l’acqua ogni 1–2 giorni.", "Conserva spinaci e pomodoro in contenitori separati."] },
];

export const PASTI = [
  { id: "insalata", t: "Insalata di pasta con salsa all’hummus", short: "Insalata di pasta", emoji: "🥗", hue: 88,
    i: ["½ della pasta cotta", "½ delle zucchine cotte", "⅓ delle carote grattugiate", "1 tazza di spinaci (≈ 30 g)", "1 pomodoro a pezzi", "¼ di tazza di prezzemolo (≈ 15 g, facoltativo)", "½ della salsa all’hummus"],
    s: ["Metti pasta e verdure in una ciotola grande.", "Aggiungi la salsa, mescola e gusta."] },
  { id: "panino", t: "Panino con peperoni e pesto", short: "Panino pesto e peperoni", emoji: "🥪", hue: 62,
    i: ["4 fette di pane", "¼ di tazza di hummus (≈ 60 g)", "¼ di tazza di pesto (≈ 60 g)", "1 tazza di spinaci (≈ 30 g)", "2 peperoni arrostiti", "½ del tofu cotto", "1 avocado a fette", "¼ di limone a spicchi"],
    s: ["Tosta il pane (2–3 minuti) e spalma hummus e pesto.", "Aggiungi spinaci, peperoni, tofu e avocado.", "Spremi sopra un po’ di limone."] },
  { id: "bowl", t: "Bowl di lenticchie", short: "Bowl di lenticchie", emoji: "🥙", hue: 140,
    i: ["Tutto il couscous", "1 tazza di stufato di lenticchie (≈ 240 ml)", "⅓ delle carote grattugiate", "½ delle zucchine cotte", "½ del tofu cotto", "½ della salsa all’hummus"],
    s: ["Dividi tutto in due ciotole.", "Scalda come preferisci, per esempio 2–3 minuti al microonde (o mangia freddo), e servi con la salsa."] },
  { id: "ragu", t: "Ragù di lenticchie", short: "Ragù di lenticchie", emoji: "🍝", hue: 112,
    i: ["2 cucchiaini di olio (≈ 10 ml)", "2 tazze di stufato di lenticchie (≈ 480 ml)", "⅓ delle carote grattugiate", "1 cucchiaino di erbe italiane (≈ 1,5 g)", "½ cucchiaino di aglio in polvere (≈ 1,5 g)", "¼ di cucchiaino di sale (≈ 1,5 g)", "½ tazza di pesto (≈ 120 g)", "½ della pasta cotta", "2 tazze di spinaci (≈ 60 g)", "Peperoncino (facoltativo)"],
    s: ["In una padella a fuoco medio-alto scalda olio, stufato, carote, erbe, aglio e sale per 2 minuti. Se serve, aggiungi un po’ d’acqua.", "Unisci pesto, pasta e spinaci e scalda bene per 2–3 minuti.", "Servi con peperoncino, se vuoi."] },
  { id: "zuppa", t: "Zuppa di lenticchie al curry", short: "Zuppa al curry", emoji: "🍜", hue: 165,
    i: ["3 tazze di stufato di lenticchie (≈ 720 ml, usa tutto quello che resta)", "2 tazze di acqua bollente (≈ 480 ml)", "½ dado vegetale", "1 peperone arrostito", "2 cucchiaini di curry (≈ 4 g)", "2 tazze di spinaci (≈ 60 g)", "2 fette di pane tostato", "½ limone, succo"],
    s: ["In una pentola scalda stufato, acqua, dado, peperone e curry per circa 5–8 minuti, finché è ben calda.", "Frulla con il frullatore a immersione, oppure lascia a pezzi (in quel caso trita prima il peperone).", "Unisci gli spinaci e, se vuoi più liquida, altra acqua.", "Intanto tosta il pane (2–3 minuti).", "Servi con il pane e una spruzzata di limone."] },
];

// ---------------------------------------------------------------
// Ingredienti per singolo passaggio (modalità cucina): [quantità, ingrediente, nota]
// Allineati uno a uno con i passaggi "s" di ogni ricetta.
// ---------------------------------------------------------------
const STEP_ING = {
  lenticchie: [
    [["1½ cucchiai", "olio", "≈ 22 ml"], ["3", "cipolle tritate fini"]],
    [["1 cucchiaio", "zenzero grattugiato", "≈ 6 g"]],
    [["4", "pomodori a pezzi"], ["2", "dadi vegetali"], ["510 g", "lenticchie rosse, sciacquate"], ["600 ml", "acqua"]],
    [],
  ],
  pasta: [[["400 g", "pasta (rigatoni)"]], [["1 cucchiaino", "olio", "≈ 5 ml · facoltativo"]]],
  tofu: [
    [["325 g", "tofu compatto, a fette da ½ cm"], ["2 cucchiai", "amido di mais", "≈ 16 g"], ["¼ cucchiaino", "sale", "≈ 1,5 g"]],
    [["1 cucchiaio", "olio", "≈ 15 ml"]],
    [],
  ],
  couscous: [[["130 g", "couscous"], ["½", "dado vegetale sbriciolato"], ["180 ml", "acqua bollente"]], [], []],
  zucchine: [[["1 cucchiaio", "olio", "≈ 15 ml"], ["2", "zucchine a pezzi da 1 cm"]], [["1 cucchiaino", "curry", "≈ 2 g"], ["½ cucchiaino", "sale", "≈ 3 g"]]],
  salsa: [[["3", "peperoni arrostiti"], ["1½ tazze", "hummus", "≈ 370 g"], ["3 cucchiai", "salsa di soia", "≈ 45 ml"], ["2½ cucchiai", "aceto", "≈ 37 ml"]]],
  crude: [[["3", "carote"]], [["6 tazze", "spinaci baby"], ["1", "pomodoro a pezzi"]]],
  insalata: [
    [["½", "della pasta cotta"], ["½", "delle zucchine cotte"], ["⅓", "delle carote grattugiate"], ["1 tazza", "spinaci", "≈ 30 g"], ["1", "pomodoro a pezzi"], ["¼ tazza", "prezzemolo", "≈ 15 g · facoltativo"]],
    [["½", "della salsa all’hummus"]],
  ],
  panino: [
    [["4 fette", "pane"], ["¼ tazza", "hummus", "≈ 60 g"], ["¼ tazza", "pesto", "≈ 60 g"]],
    [["1 tazza", "spinaci", "≈ 30 g"], ["2", "peperoni arrostiti"], ["½", "del tofu cotto"], ["1", "avocado a fette"]],
    [["¼", "limone a spicchi"]],
  ],
  bowl: [
    [["Tutto", "il couscous"], ["1 tazza", "stufato di lenticchie", "≈ 240 ml"], ["⅓", "delle carote grattugiate"], ["½", "delle zucchine cotte"], ["½", "del tofu cotto"]],
    [["½", "della salsa all’hummus"]],
  ],
  ragu: [
    [["2 cucchiaini", "olio", "≈ 10 ml"], ["2 tazze", "stufato di lenticchie", "≈ 480 ml"], ["⅓", "delle carote grattugiate"], ["1 cucchiaino", "erbe italiane", "≈ 1,5 g"], ["½ cucchiaino", "aglio in polvere", "≈ 1,5 g"], ["¼ cucchiaino", "sale", "≈ 1,5 g"]],
    [["½ tazza", "pesto", "≈ 120 g"], ["½", "della pasta cotta"], ["2 tazze", "spinaci", "≈ 60 g"]],
    [["q.b.", "peperoncino", "facoltativo"]],
  ],
  zuppa: [
    [["3 tazze", "stufato di lenticchie", "≈ 720 ml · tutto quello che resta"], ["2 tazze", "acqua bollente", "≈ 480 ml"], ["½", "dado vegetale"], ["1", "peperone arrostito"], ["2 cucchiaini", "curry", "≈ 4 g"]],
    [],
    [["2 tazze", "spinaci", "≈ 60 g"]],
    [["2 fette", "pane"]],
    [["½", "limone, il succo"]],
  ],
};
for (const r of [...PREP, ...PASTI]) {
  r.si = STEP_ING[r.id] || r.s.map(() => []);
  if (r.si.length !== r.s.length) console.warn("Passaggi e ingredienti non allineati:", r.id);
}

// Emoji per ogni articolo della dispensa (stesso ordine di SPESA[].items).
const PANTRY_EMOJI = {
  fv: ["🍅", "🥕", "🧅", "🥒", "🥑", "🍋", "🥬", "🌿", "🫚"],
  pr: ["🧈", "🥣", "🫘"],
  ce: ["🌾", "🍝", "🍞"],
  di: ["🫑", "🫙", "🧊", "🍶", "🍾", "🌽", "🫒"],
  sp: ["🍛", "🌱", "🧄", "🧂", "🌶️"],
};
for (const g of SPESA) g.em = PANTRY_EMOJI[g.id] || g.items.map(() => g.emoji);

// Nome breve e quantità per i riquadri della dispensa.
const PANTRY_SHORT = {
  fv: [["Pomodori", "5 · 700 g"], ["Carote", "3 · 500 g"], ["Cipolle", "3 · 400 g"], ["Zucchine", "2 · 640 g"], ["Avocado", "1"], ["Limone", "1"], ["Spinaci baby", "180 g"], ["Prezzemolo", "15 g · facolt."], ["Zenzero", "6 g o aglio"]],
  pr: [["Tofu compatto", "325 g"], ["Hummus", "430 g"], ["Lenticchie rosse", "510 g"]],
  ce: [["Couscous", "130 g"], ["Pasta", "400 g"], ["Pane", "6 fette"]],
  di: [["Peperoni arrostiti", "6"], ["Pesto verde", "180 g"], ["Dadi vegetali", "3"], ["Salsa di soia", "45 ml"], ["Aceto bianco", "37 ml"], ["Amido di mais", "8 g"], ["Olio di semi", "q.b."]],
  sp: [["Curry", "6 g"], ["Erbe italiane", "1,5 g"], ["Aglio in polvere", "1,5 g"], ["Sale e pepe", "q.b."], ["Peperoncino", "facoltativo"]],
};
for (const g of SPESA) g.short = PANTRY_SHORT[g.id];
