// Icone disegnate a mano per gli ingredienti che non hanno un'emoji giusta.
export const SVGI = {
  // panetto di tofu
  tofu: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 27 31 16l25 10-23 12z" fill="#fffdf3"/><path d="M8 27l25 11v17L8 44z" fill="#f2e9cf"/><path d="M56 26 33 38v17l23-11z" fill="#e2d5ad"/><g fill="#d9c99b"><circle cx="15" cy="37" r="1.3"/><circle cx="22" cy="44" r="1.1"/><circle cx="27" cy="39" r="1.2"/><circle cx="18" cy="46" r="1"/></g><path d="M8 27 31 16l25 10" fill="none" stroke="#e8dcb8" stroke-width="1.2"/></svg>`,
  // dado vegetale incartato
  dado: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 24 32 13l22 11-22 11z" fill="#ffd45c"/><path d="M10 24l22 11v18L10 42z" fill="#f2b632"/><path d="M54 24 32 35v18l22-11z" fill="#d9962a"/><path d="M14 30c6 2 9 6 9 11-5-1-9-5-9-11z" fill="#3fae4f"/><path d="M14 30c3 3 6 6 9 11" stroke="#257a35" stroke-width="1.2" fill="none"/><path d="M10 24 32 13l22 11" fill="none" stroke="#fff3c4" stroke-width="1.4"/></svg>`,
  // bottiglia di aceto bianco
  aceto: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="27" y="5" width="10" height="7" rx="2" fill="#a87b4f"/><path d="M28 12h8v7c0 3 8 6 8 14v22a5 5 0 0 1-5 5H25a5 5 0 0 1-5-5V33c0-8 8-11 8-14z" fill="#e9f5f3" stroke="#b9d9d4" stroke-width="1.5"/><path d="M21 36h22v19a4 4 0 0 1-4 4H25a4 4 0 0 1-4-4z" fill="#f6efc8"/><rect x="23" y="40" width="18" height="10" rx="2" fill="#fff" stroke="#d9e6e3"/><path d="M26 45h12" stroke="#7fb8ad" stroke-width="2" stroke-linecap="round"/><path d="M24 22c-1 3-1 7-1 10" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/></svg>`,
  // bottiglietta di salsa di soia
  soia: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M26 4h12l1 9H25z" fill="#e0453a"/><path d="M25 13h14l2 6c4 3 6 8 6 14v21a6 6 0 0 1-6 6H23a6 6 0 0 1-6-6V33c0-6 2-11 6-14z" fill="#4a2a1c"/><rect x="21" y="34" width="22" height="13" rx="2" fill="#fff5e6"/><path d="M25 40h14" stroke="#e0453a" stroke-width="2.4" stroke-linecap="round"/><path d="M22 24c-1 3-2 6-2 9" stroke="#8a5a40" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  // vasetto di pesto verde
  pesto: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="16" y="10" width="32" height="9" rx="3" fill="#3a8f3f"/><path d="M14 22c0-2 1-3 3-3h30c2 0 3 1 3 3v28a7 7 0 0 1-7 7H21a7 7 0 0 1-7-7z" fill="#e9f5ea" stroke="#c9e3cb" stroke-width="1.4"/><path d="M16 30h32v20a5 5 0 0 1-5 5H21a5 5 0 0 1-5-5z" fill="#5fa83a"/><g fill="#86c95a"><circle cx="24" cy="38" r="2.2"/><circle cx="34" cy="44" r="2"/><circle cx="40" cy="36" r="1.8"/><circle cx="27" cy="48" r="1.6"/></g><path d="M19 25v6" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/></svg>`,
};
/** Emoji normale, oppure "svg:nome" per le icone disegnate qui sopra. */
export const ico = (em) => (String(em).startsWith("svg:") ? `<i class="sv-ico">${SVGI[em.slice(4)] || ""}</i>` : em);
