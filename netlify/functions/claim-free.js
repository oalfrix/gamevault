// ============================================================================
// POST /.netlify/functions/claim-free
// body: { slug }
//
// For games/mods marked is_free = true. Logs a zero-amount "paid" order for
// your own records and returns the download link straight away — no M-Pesa
// prompt needed. Toggle a title free any time with:
//   update games set is_free = true where slug = '...';
// ============================================================================
const { getSupabaseAdmin } = require("../lib/supabaseAdmin");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { slug } = JSON.parse(event.body || "{}");
    if (!slug) return { statusCode: 400, body: JSON.stringify({ error: "Missing slug" }) };

    const supabase = getSupabaseAdmin();
    const { data: game, error } = await supabase
      .from("games")
      .select("id, is_free, download_url, published")
      .eq("slug", slug)
      .single();

    if (error || !game || !game.published) {
      return { statusCode: 404, body: JSON.stringify({ error: "Game not found" }) };
    }
    if (!game.is_free) {
      return { statusCode: 400, body: JSON.stringify({ error: "This title isn't free — use checkout instead." }) };
    }

    await supabase.from("orders").insert({
      game_id: game.id,
      phone: "free-claim",
      amount: 0,
      status: "paid",
    });

    return { statusCode: 200, body: JSON.stringify({ downloadUrl: game.download_url }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: "Could not prepare download" }) };
  }
};
