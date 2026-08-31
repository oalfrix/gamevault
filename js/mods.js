import { supabase } from "./supabaseClient.js";
import { mountLayout } from "./layout.js";

mountLayout("mods");

const grid = document.getElementById("gameGrid");
const resultCount = document.getElementById("resultCount");
const sortSelect = document.getElementById("sortSelect");
let allMods = [];

function money(n) {
  return `KSh ${Number(n).toLocaleString("en-KE")}`;
}

function card(m) {
  const isFree = !!m.is_free;
  return `
  <a class="ticket" href="game.html?slug=${encodeURIComponent(m.slug)}">
    <div class="cover">
      ${isFree ? `<span class="badge free">FREE</span>` : ""}
      <img src="${m.cover_url || "assets/placeholder.svg"}" alt="${m.title} thumbnail" loading="lazy" />
    </div>
    <div class="perf"></div>
    <div class="info">
      <h3>${m.title}</h3>
      <div class="tags">Mod · for ${m.base_game || "multiple games"}</div>
      <div class="price-row">${isFree ? `<span class="price free">FREE</span>` : `<span class="price">${money(m.price)}</span>`}</div>
    </div>
  </a>`;
}

function render() {
  let list = [...allMods];
  const sortVal = sortSelect.value;
  if (sortVal === "price-asc") list.sort((a, b) => (a.is_free ? 0 : a.price) - (b.is_free ? 0 : b.price));
  else if (sortVal === "name-asc") list.sort((a, b) => a.title.localeCompare(b.title));
  else if (sortVal === "newest") list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  else list.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

  resultCount.textContent = `${list.length} mod${list.length === 1 ? "" : "s"}`;
  grid.innerHTML = list.length ? list.map(card).join("") : `<div class="empty">No mods listed yet.</div>`;
}

sortSelect.addEventListener("change", render);

async function load() {
  // Mods are stored in the same "games" table with type = 'mod' so the
  // detail page, checkout, and download flow all work identically.
  const { data, error } = await supabase
    .from("games")
    .select("id, slug, title, cover_url, price, is_free, base_game, popularity, created_at")
    .eq("type", "mod")
    .eq("published", true);

  if (error) {
    grid.innerHTML = `<div class="empty">Couldn't load mods right now.</div>`;
    return;
  }
  allMods = data || [];
  render();
}

load();
