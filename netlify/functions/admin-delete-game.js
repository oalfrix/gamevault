// ============================================================================
// POST /.netlify/functions/admin-delete-game
// body: { password, id }
// ============================================================================
const { getSupabaseAdmin } = require("../lib/supabaseAdmin");
const { checkAdminPassword } = require("../lib/adminAuth");
const { deleteFile } = require("../lib/github");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  try {
    const { password, id } = JSON.parse(event.body || "{}");
    if (!checkAdminPassword(password)) {
      return { statusCode: 401, body: JSON.stringify({ error: "Wrong admin password" }) };
    }
    if (!id) return { statusCode: 400, body: JSON.stringify({ error: "id is required" }) };

    const supabase = getSupabaseAdmin();

    const { data: game } = await supabase.from("games").select("slug, cover_url").eq("id", id).single();

    const { error } = await supabase.from("games").delete().eq("id", id);
    if (error) throw error;

    // Best-effort cleanup of the committed cover image; ignore failures.
    if (game?.cover_url && game.cover_url.includes("cdn.jsdelivr.net/gh/")) {
      try {
        const ext = game.cover_url.split(".").pop();
        await deleteFile(`assets/games/${game.slug}.${ext}`, `Remove cover image for ${game.slug}`);
      } catch (e) {
        console.warn("Could not delete cover image:", e.message);
      }
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || "Failed to delete game" }) };
  }
};
