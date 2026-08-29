import { supabase } from "./supabaseClient.js";
import { mountLayout } from "./layout.js";

mountLayout("store");

const params = new URLSearchParams(window.location.search);
const slug = params.get("slug");

const detailRoot = document.getElementById("detailRoot");
const crumbTitle = document.getElementById("crumbTitle");
const overlay = document.getElementById("payOverlay");
const modalTitle = document.getElementById("modalGameTitle");
const amountInput = document.getElementById("amountInput");
const phoneInput = document.getElementById("phoneInput");
const payBtn = document.getElementById("payBtn");
const payStatus = document.getElementById("payStatus");
const closeModal = document.getElementById("closeModal");

let currentGame = null;
let pollTimer = null;

function money(n) {
  return `KSh ${Number(n).toLocaleString("en-KE")}`;
}

function effectivePrice(g) {
  if (g.is_free) return 0;
  if (g.offer_price != null && g.offer_price < g.price) return g.offer_price;
  return g.price;
}

function renderSpecs(reqs, tier) {
  if (!reqs || !reqs[tier]) return `<tr><td colspan="2">Not specified</td></tr>`;
  const r = reqs[tier];
  const rows = [
    ["OS", r.os], ["Processor", r.cpu], ["Memory", r.ram],
    ["Graphics", r.gpu], ["Storage", r.storage], ["DirectX", r.directx],
  ].filter(([, v]) => v);
  return rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("");
}

async function loadGame() {
  if (!slug) {
    detailRoot.innerHTML = `<div class="empty">Game not found.</div>`;
    return;
  }
  const { data: g, error } = await supabase
    .from("games")
    .select("id, slug, title, cover_url, price, offer_price, is_free, genres, description, requirements, published")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (error || !g) {
    detailRoot.innerHTML = `<div class="empty">Game not found or no longer available.</div>`;
    crumbTitle.textContent = "Not found";
    return;
  }

  currentGame = g;
  crumbTitle.textContent = g.title;
  document.title = `${g.title} — GameVault`;

  const price = effectivePrice(g);
  const isFree = g.is_free;
  const onOffer = !isFree && g.offer_price != null && g.offer_price < g.price;

  detailRoot.innerHTML = `
    <div class="cover"><img src="${g.cover_url || "assets/placeholder.svg"}" alt="${g.title} cover art" /></div>
    <div>
      <h1>${g.title}</h1>
      <div class="genres">${(g.genres || []).map((x) => `<span class="pill">${x}</span>`).join("")}</div>
      <p class="desc">${g.description || "No description provided yet."}</p>

      <div class="buybox">
        <div class="price-row">
          ${
            isFree
              ? `<span class="price free">FREE</span>`
              : onOffer
              ? `<span class="price">${money(g.offer_price)}</span><span class="price strike old">${money(g.price)}</span>`
              : `<span class="price">${money(g.price)}</span>`
          }
        </div>
        <button class="btn" id="buyBtn">${isFree ? "Get Free Download" : `Pay ${money(price)} via M-Pesa`}</button>
        <div class="hint">${isFree ? "No payment needed — you'll go straight to the download." : "You'll get an M-Pesa prompt on your phone. Approve it to unlock the download link automatically."}</div>
      </div>

      <div class="specs">
        <h2>System Requirements</h2>
        <table class="spec-table mono">
          <tbody>
            <tr><td colspan="2" style="color:var(--gold);font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:.08em">MINIMUM</td></tr>
            ${renderSpecs(g.requirements, "minimum")}
            <tr><td colspan="2" style="color:var(--gold);font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:.08em">RECOMMENDED</td></tr>
            ${renderSpecs(g.requirements, "recommended")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById("buyBtn").addEventListener("click", () => {
    if (isFree) {
      claimFree();
    } else {
      openPayModal(price);
    }
  });
}

// ---------------------------------------------------------------------------
// Free games — no STK push, just create a paid-free order and redirect.
// ---------------------------------------------------------------------------
async function claimFree() {
  const btn = document.getElementById("buyBtn");
  btn.disabled = true;
  btn.textContent = "Preparing download…";
  try {
    const res = await fetch("/.netlify/functions/claim-free", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: currentGame.slug }),
    });
    const json = await res.json();
    if (!res.ok || !json.downloadUrl) throw new Error(json.error || "Could not prepare download");
    window.location.href = json.downloadUrl;
  } catch (e) {
    btn.disabled = false;
    btn.textContent = "Get Free Download";
    alert(e.message);
  }
}

// ---------------------------------------------------------------------------
// Paid games — STK Push modal
// ---------------------------------------------------------------------------
function openPayModal(price) {
  modalTitle.textContent = `Buy ${currentGame.title}`;
  amountInput.value = money(price);
  phoneInput.value = "";
  payStatus.textContent = "";
  payStatus.className = "status";
  payBtn.disabled = false;
  payBtn.innerHTML = "Send STK Push";
  overlay.classList.add("open");
}

function closePayModal() {
  overlay.classList.remove("open");
  clearInterval(pollTimer);
}
closeModal.addEventListener("click", closePayModal);
overlay.addEventListener("click", (e) => { if (e.target === overlay) closePayModal(); });

payBtn.addEventListener("click", async () => {
  const phone = phoneInput.value.trim();
  if (!/^(?:0|\+?254)7\d{8}$/.test(phone) && !/^(?:0|\+?254)1\d{8}$/.test(phone)) {
    payStatus.textContent = "Enter a valid Safaricom number, e.g. 0712345678";
    payStatus.className = "status err";
    return;
  }

  payBtn.disabled = true;
  payBtn.innerHTML = `<span class="spinner"></span> Sending prompt…`;
  payStatus.textContent = "";
  payStatus.className = "status";

  try {
    // Price is NOT sent from the browser — the function looks it up itself
    // from the games table by slug, so it can never be tampered with client-side.
    const res = await fetch("/.netlify/functions/stkpush", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: currentGame.slug, phone }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to start payment");

    payStatus.textContent = "Check your phone and enter your M-Pesa PIN…";
    pollStatus(json.orderId);
  } catch (e) {
    payBtn.disabled = false;
    payBtn.textContent = "Send STK Push";
    payStatus.textContent = e.message;
    payStatus.className = "status err";
  }
});

function pollStatus(orderId) {
  let attempts = 0;
  pollTimer = setInterval(async () => {
    attempts++;
    if (attempts > 30) { // ~90s timeout
      clearInterval(pollTimer);
      payStatus.textContent = "Still waiting on confirmation — check your M-Pesa messages, or try again.";
      payStatus.className = "status err";
      payBtn.disabled = false;
      payBtn.textContent = "Send STK Push";
      return;
    }
    try {
      const res = await fetch(`/.netlify/functions/checkstatus?orderId=${orderId}`);
      const json = await res.json();
      if (json.status === "paid") {
        clearInterval(pollTimer);
        payStatus.textContent = "Payment confirmed! Redirecting to your download…";
        payStatus.className = "status ok";
        setTimeout(() => { window.location.href = json.downloadUrl; }, 900);
      } else if (json.status === "failed" || json.status === "cancelled") {
        clearInterval(pollTimer);
        payStatus.textContent = "Payment was not completed. You can try again.";
        payStatus.className = "status err";
        payBtn.disabled = false;
        payBtn.textContent = "Send STK Push";
      }
      // else still pending — keep polling
    } catch {
      // network hiccup — keep polling silently
    }
  }, 3000);
}

loadGame();
