// ============================================================================
// Admin panel logic. The password is kept in sessionStorage only (cleared
// when the tab closes) and sent with every function call — the server
// re-checks it each time, so there's nothing meaningful to steal from
// sessionStorage beyond that one request's worth of access.
// ============================================================================

const loginGate = document.getElementById("loginGate");
const adminPanel = document.getElementById("adminPanel");
const pwInput = document.getElementById("pwInput");
const loginBtn = document.getElementById("loginBtn");
const loginMsg = document.getElementById("loginMsg");

function getPassword() {
  return sessionStorage.getItem("gv_admin_pw") || "";
}

async function callFn(name, payload) {
  const res = await fetch(`/.netlify/functions/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: getPassword(), ...payload }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

async function tryLogin(password) {
  sessionStorage.setItem("gv_admin_pw", password);
  // admin-list-games doubles as the auth check: wrong password -> 401
  await callFn("admin-list-games", {});
}

loginBtn.addEventListener("click", async () => {
  loginMsg.textContent = "";
  const pw = pwInput.value;
  if (!pw) return;
  loginBtn.disabled = true;
  loginBtn.textContent = "Checking…";
  try {
    await tryLogin(pw);
    loginGate.style.display = "none";
    adminPanel.style.display = "block";
    loadCatalog();
  } catch (e) {
    sessionStorage.removeItem("gv_admin_pw");
    loginMsg.textContent = e.message;
    loginMsg.className = "msg err";
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Enter";
  }
});
pwInput.addEventListener("keydown", (e) => { if (e.key === "Enter") loginBtn.click(); });

// If a password is already stored from earlier in this tab session, skip the gate.
if (getPassword()) {
  tryLogin(getPassword())
    .then(() => { loginGate.style.display = "none"; adminPanel.style.display = "block"; loadCatalog(); })
    .catch(() => sessionStorage.removeItem("gv_admin_pw"));
}

// ---------------------------------------------------------------------------
// Add-game form
// ---------------------------------------------------------------------------
const addForm = document.getElementById("addForm");
const addMsg = document.getElementById("addMsg");
const submitBtn = document.getElementById("submitBtn");
const titleInput = addForm.elements["title"];
const slugInput = addForm.elements["slug"];

function slugify(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
let slugManuallyEdited = false;
slugInput.addEventListener("input", () => { slugManuallyEdited = true; });
titleInput.addEventListener("input", () => {
  if (!slugManuallyEdited) slugInput.value = slugify(titleInput.value);
});

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]); // strip data: prefix
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

addForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  addMsg.textContent = "";
  addMsg.className = "msg";
  submitBtn.disabled = true;
  submitBtn.textContent = "Adding…";

  try {
    const f = addForm.elements;
    const requirements = {
      minimum: {
        os: f.min_os.value, cpu: f.min_cpu.value, ram: f.min_ram.value,
        gpu: f.min_gpu.value, storage: f.min_storage.value, directx: f.min_directx.value,
      },
      recommended: {
        os: f.rec_os.value, cpu: f.rec_cpu.value, ram: f.rec_ram.value,
        gpu: f.rec_gpu.value, storage: f.rec_storage.value, directx: f.rec_directx.value,
      },
    };

    let imageBase64 = null, imageFilename = null;
    const file = f.image.files[0];
    if (file) {
      imageBase64 = await fileToBase64(file);
      imageFilename = file.name;
    }

    await callFn("admin-add-game", {
      slug: f.slug.value,
      title: f.title.value,
      type: f.type.value,
      baseGame: f.baseGame.value,
      genres: f.genres.value,
      description: f.description.value,
      requirements,
      price: f.price.value,
      offerPrice: f.offerPrice.value || null,
      isFree: f.isFree.checked,
      published: f.published.checked,
      downloadUrl: f.downloadUrl.value,
      imageBase64,
      imageFilename,
    });

    addMsg.textContent = "Added! It's live on the site now.";
    addMsg.className = "msg ok";
    addForm.reset();
    slugManuallyEdited = false;
    loadCatalog();
  } catch (err) {
    addMsg.textContent = err.message;
    addMsg.className = "msg err";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Add game";
  }
});

// ---------------------------------------------------------------------------
// Catalog list + quick actions
// ---------------------------------------------------------------------------
const catalogMsg = document.getElementById("catalogMsg");
const catalogTable = document.getElementById("catalogTable");
const catalogBody = document.getElementById("catalogBody");

function money(n) { return `KSh ${Number(n).toLocaleString("en-KE")}`; }

async function loadCatalog() {
  catalogMsg.textContent = "Loading…";
  catalogTable.style.display = "none";
  try {
    const { games } = await callFn("admin-list-games", {});
    if (!games.length) {
      catalogMsg.textContent = "No games yet — add your first one above.";
      return;
    }
    catalogBody.innerHTML = games.map(rowHTML).join("");
    catalogTable.style.display = "table";
    catalogMsg.textContent = "";
    catalogBody.querySelectorAll("[data-action]").forEach((btn) => btn.addEventListener("click", onRowAction));
  } catch (e) {
    catalogMsg.textContent = e.message;
    catalogMsg.className = "msg err";
  }
}

function rowHTML(g) {
  const priceLabel = g.is_free ? "Free" : g.offer_price != null ? `${money(g.offer_price)} (was ${money(g.price)})` : money(g.price);
  return `
    <tr data-id="${g.id}">
      <td>${g.title}</td>
      <td>${g.type}</td>
      <td class="mono">${priceLabel}</td>
      <td><span class="tag-pill ${g.published ? "live" : "hidden"}">${g.published ? "Live" : "Hidden"}</span></td>
      <td>
        <div class="row-actions">
          <button data-action="toggle-publish" data-current="${g.published}">${g.published ? "Unpublish" : "Publish"}</button>
          <button data-action="toggle-free" data-current="${g.is_free}">${g.is_free ? "Unmark free" : "Make free"}</button>
          <button data-action="set-offer">Set sale</button>
          <button data-action="delete" class="danger">Delete</button>
        </div>
      </td>
    </tr>`;
}

async function onRowAction(e) {
  const btn = e.currentTarget;
  const id = btn.closest("tr").dataset.id;
  const action = btn.dataset.action;

  try {
    if (action === "toggle-publish") {
      await callFn("admin-update-game", { id, patch: { published: btn.dataset.current !== "true" } });
    } else if (action === "toggle-free") {
      await callFn("admin-update-game", { id, patch: { is_free: btn.dataset.current !== "true" } });
    } else if (action === "set-offer") {
      const val = prompt("New offer price in KSh (leave blank to clear the sale):");
      if (val === null) return;
      await callFn("admin-update-game", { id, patch: { offer_price: val.trim() === "" ? null : Number(val) } });
    } else if (action === "delete") {
      if (!confirm("Delete this game permanently?")) return;
      await callFn("admin-delete-game", { id });
    }
    loadCatalog();
  } catch (err) {
    alert(err.message);
  }
}
