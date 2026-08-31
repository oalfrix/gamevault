// ============================================================================
// POST /.netlify/functions/admin-update-game
// body: { password, id, patch }
// patch is a partial object of columns to update, e.g.
//   { published: false }
//   { is_free: true }
//   { offer_price: 799 }
//   { offer_price: null }   -- end a sale
// Kept generic so the admin panel's quick-action buttons (publish/unpublish,
// make free, set/clear sale price) can all go through one function.
// ============================================================================
const { getSupabaseAdmin } = require("../lib/supabaseAdmin");
const { checkAdminPassword } = require("../lib/adminAuth");

const ALLOWED_FIELDS = new Set([
  "title", "type", "base_game", "cover_url", "genres", "description",
  "requirements", "price", "offer_price", "is_free", "download_url", "published",
]);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  try {
    const { password, id, patch } = JSON.parse(event.body || "{}");
    if (!checkAdminPassword(password)) {
      return { statusCode: 401, body: JSON.stringify({ error: "Wrong admin password" }) };
    }
    if (!id || !patch || typeof patch !== "object") {
      return { statusCode: 400, body: JSON.stringify({ error: "id and patch are required" }) };
    }

    const safePatch = {};
    for (const [key, value] of Object.entries(patch)) {
      if (ALLOWED_FIELDS.has(key)) safePatch[key] = value;
    }
    if (Object.keys(safePatch).length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: "No valid fields in patch" }) };
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("games").update(safePatch).eq("id", id).select().single();
    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ success: true, game: data }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || "Failed to update game" }) };
  }
};
