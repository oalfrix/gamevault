import { supabase } from "./supabaseClient.js";
import { mountLayout } from "./layout.js";

mountLayout("store");

const grid = document.getElementById("gameGrid");
const resultCount = document.getElementById("resultCount");
const chips = document.querySelectorAll("#filterChips .chip");
const sortSelect = document.getElementById("sortSelect");

let allGames = [];
let activeFilter = "all";

const params = new URLSearchParams(window.location.search);
const searchQuery = (params.get("q") || "").toLowerCase();

function money(n) {
  return `KSh ${Number(n).toLocaleString("en-KE")}`;
}

function ticketCard(g) {
  const onOffer = g.offer_price != null && g.offer_price < g.price;
  const isFree = !!g.is_free;
  const badge = isFree
    ? `<span class="badge free">FREE</span>`
    : onOffer
    ? `<span class="badge sale">SALE</span>`
    : "";

  const priceHTML = isFree
    ? `<span class="price free">FREE</span>`
    : onOffer
    ? `<span class="price">${money(g.offer_price)}</span><span class="price strike">${money(g.price)}</span>`
    : `<span class="price">${money(g.price)}</span>`;

  const genres = (g.genres || []).slice(0, 2).join(" · ");

  return `
  <a class="ticket" href="game.html?slug=${encodeURIComponent(g.slug)}">
    <div class="cover">
      ${badge}
      <img src="${g.cover_url || "assets/placeholder.svg"}" alt="${g.title} cover art" loading="lazy" />
    </div>
    <div class="perf"></div>
    <div class="info">
      <h3>${g.title}</h3>
      <div class="tags">${genres}</div>
      <div class="price-row">${priceHTML}</div>
    </div>
  </a>`;
}

function applyAndRender() {
  let list = [...allGames];

  if (searchQuery) {
    list = list.filter((g) => g.title.toLowerCase().includes(searchQuery));
  }
  if (activeFilter === "offer") {
    list = list.filter((g) => g.offer_price != null && g.offer_price < g.price);
  } else if (activeFilter === "free") {
    list = list.filter((g) => g.is_free);
  }

  const sortVal = sortSelect.value;
  const effPrice = (g) => (g.is_free ? 0 : g.offer_price != null ? g.offer_price : g.price);
  if (sortVal === "price-asc") list.sort((a, b) => effPrice(a) - effPrice(b));
  else if (sortVal === "price-desc") list.sort((a, b) => effPrice(b) - effPrice(a));
  else if (sortVal === "name-asc") list.sort((a, b) => a.title.localeCompare(b.title));
  else if (sortVal === "newest") list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  else list.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

  resultCount.textContent = `${list.length} game${list.length === 1 ? "" : "s"}${searchQuery ? ` matching "${searchQuery}"` : ""}`;

  grid.innerHTML = list.length
    ? list.map(ticketCard).join("")
    : `<div class="empty">No games match this filter yet — check back soon.</div>`;
}

chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    chips.forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    activeFilter = chip.dataset.filter;
    applyAndRender();
  });
});
sortSelect.addEventListener("change", applyAndRender);

async function loadGames() {
  const { data, error } = await supabase
    .from("games")
    .select("id, slug, title, cover_url, price, offer_price, is_free, genres, popularity, created_at")
    .eq("published", true);

  if (error) {
    console.error(error);
    grid.innerHTML = `<div class="empty">Couldn't load games right now. Please refresh.</div>`;
    resultCount.textContent = "Error loading games";
    return;
  }
  allGames = data || [];
  applyAndRender();
}

loadGames();
