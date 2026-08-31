// ============================================================================
// Shared nav + footer, injected into #site-nav / #site-footer on every page.
// Edit social links + brand name here once — it updates everywhere.
// ============================================================================
const SOCIAL = {
  whatsapp: "https://wa.me/254700000000", // replace with your WhatsApp number/link
  telegram: "https://t.me/yourchannel",   // replace with your Telegram channel/group
};

function navHTML(active) {
  const link = (href, label, key) =>
    `<a href="${href}" class="${active === key ? "active" : ""}">${label}</a>`;

  return `
  <div class="wrap nav-row">
    <button class="burger" id="burgerBtn" aria-label="Open menu" aria-expanded="false">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    </button>
    <a href="index.html" class="brand">
      <span class="brand-mark">GV</span>Game<span class="dot">Vault</span>
    </a>
    <div class="nav-links">
      ${link("index.html", "Store", "store")}
      ${link("mods.html", "Mods", "mods")}
      ${link("index.html#offers", "Offers", "offers")}
    </div>
    <div class="nav-search">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M21 21l-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      <input id="navSearch" type="search" placeholder="Search games..." aria-label="Search games" />
    </div>
    <div class="nav-social">
      <a class="social-btn whatsapp" href="${SOCIAL.whatsapp}" target="_blank" rel="noopener" aria-label="WhatsApp">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.87.5 3.62 1.44 5.12L2 22l5.13-1.53a9.87 9.87 0 0 0 4.91 1.31h.01c5.46 0 9.9-4.45 9.9-9.91C21.95 6.45 17.5 2 12.04 2Zm0 18.02h-.01a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.05.91.92-2.97-.19-.31a8.08 8.08 0 0 1-1.25-4.33c0-4.48 3.65-8.13 8.13-8.13a8.08 8.08 0 0 1 8.12 8.12c0 4.49-3.65 8.14-8.14 8.14Zm4.44-6.09c-.24-.12-1.44-.71-1.66-.79-.22-.08-.39-.12-.55.12-.16.24-.63.79-.78.95-.14.16-.29.18-.53.06-.24-.12-1.02-.38-1.94-1.21-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.11-.49.11-.11.24-.29.36-.43.12-.14.16-.24.24-.4.08-.16.04-.31-.02-.43-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.42-.55-.42-.14 0-.31-.02-.47-.02-.16 0-.43.06-.65.31-.22.24-.86.84-.86 2.06s.88 2.39 1 2.56c.12.16 1.74 2.66 4.22 3.73.59.25 1.05.4 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.44-.59 1.64-1.15.2-.57.2-1.05.14-1.15-.06-.1-.22-.16-.46-.28Z"/></svg>
      </a>
      <a class="social-btn telegram" href="${SOCIAL.telegram}" target="_blank" rel="noopener" aria-label="Telegram">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21.9 4.6 18.6 20.3c-.25 1.1-.9 1.37-1.83.85l-5.06-3.73-2.44 2.35c-.27.27-.5.5-1.02.5l.36-5.15 9.36-8.46c.41-.36-.09-.56-.63-.2L6.05 13.1l-5.03-1.58c-1.1-.34-1.11-1.1.23-1.63L20.5 3.28c.9-.34 1.7.22 1.4 1.32Z"/></svg>
      </a>
    </div>
  </div>
  <div class="mobile-panel" id="mobilePanel">
    ${link("index.html", "Store", "store")}
    ${link("mods.html", "Mods", "mods")}
    ${link("index.html#offers", "Offers", "offers")}
    <a href="${SOCIAL.whatsapp}" target="_blank" rel="noopener">WhatsApp</a>
    <a href="${SOCIAL.telegram}" target="_blank" rel="noopener">Telegram</a>
  </div>`;
}

function footerHTML() {
  const year = new Date().getFullYear();
  return `
  <div class="wrap">
    <div>© ${year} GameVault. All game keys/downloads are provided by their respective publishers or modding communities.</div>
    <div style="display:flex;gap:16px">
      <a href="${SOCIAL.whatsapp}" target="_blank" rel="noopener">WhatsApp</a>
      <a href="${SOCIAL.telegram}" target="_blank" rel="noopener">Telegram</a>
    </div>
  </div>`;
}

export function mountLayout(active) {
  const navEl = document.getElementById("site-nav");
  const footEl = document.getElementById("site-footer");
  if (navEl) navEl.innerHTML = navHTML(active);
  if (footEl) footEl.innerHTML = footerHTML();

  const burger = document.getElementById("burgerBtn");
  const panel = document.getElementById("mobilePanel");
  burger?.addEventListener("click", () => {
    const open = panel.classList.toggle("open");
    burger.setAttribute("aria-expanded", String(open));
  });

  // Global search — pressing Enter on the nav search box jumps to store with a query param
  const search = document.getElementById("navSearch");
  search?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && search.value.trim()) {
      window.location.href = `index.html?q=${encodeURIComponent(search.value.trim())}`;
    }
  });
}
